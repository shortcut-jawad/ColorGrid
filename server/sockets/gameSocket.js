import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Game from "../models/Game.js";
import { maxAreaOfIsland } from "../utils/maxAreaOfIsland.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

const waitingPlayers = [];
const games = new Map();
const socketToGame = new Map();
const forfeitTimeouts = new Map();

function getRandomColorPair() {
  const colors = ["#e74c3c", "#3498db"];
  return Math.random() > 0.5 ? colors : colors.slice().reverse();
}

function createEmptyGrid() {
  return Array.from({ length: 5 }, () => Array(5).fill(""));
}

function toClientGameState(game) {
  return {
    game_id: game.id,
    grid: game.grid,
    currentTurn: game.currentTurn,
    player1: game.player1,
    player2: game.player2,
    status: game.status,
    winnerId: game.winnerId || null,
    isDraw: game.isDraw || false,
  };
}

function getLargestIsland(grid, color) {
  const numericGrid = grid.map((row) =>
    row.map((cell) => (cell === color ? 1 : 0))
  );
  return maxAreaOfIsland(numericGrid);
}

function isGridFull(grid) {
  return grid.every((row) => row.every((cell) => cell !== ""));
}

async function finishGame(io, game, result) {
  if (game.status === "finished") return;
  game.status = "finished";

  let winnerId = null;
  if (result === "player1") winnerId = game.player1._id;
  if (result === "player2") winnerId = game.player2._id;

  game.winnerId = winnerId;
  game.isDraw = result === "draw";

  const createdGame = await Game.create({
    player1_id: game.player1._id,
    player2_id: game.player2._id,
    player1_color: game.player1.color,
    player2_color: game.player2.color,
    final_grid: game.grid,
    result,
    winner_id: winnerId,
  });

  const [player1Db, player2Db] = await Promise.all([
    User.findById(game.player1._id),
    User.findById(game.player2._id),
  ]);

  let p1Inc = { wins: 0, losses: 0, draws: 0 };
  let p2Inc = { wins: 0, losses: 0, draws: 0 };

  if (result === "player1") {
    player1Coins += 200;
    player2Coins = Math.max(0, player2Coins - 200);
    p1Inc.wins = 1;
    p2Inc.losses = 1;
  } else if (result === "player2") {
    player2Coins += 200;
    player1Coins = Math.max(0, player1Coins - 200);
    p2Inc.wins = 1;
    p1Inc.losses = 1;
  } else if (result === "draw") {
    p1Inc.draws = 1;
    p2Inc.draws = 1;
  }

  await Promise.all([
    User.findByIdAndUpdate(game.player1._id, {
      coins: player1Coins,
      $inc: p1Inc,
    }),
    User.findByIdAndUpdate(game.player2._id, {
      coins: player2Coins,
      $inc: p2Inc,
    }),
  ]);

  game.player1.coins = player1Coins;
  game.player2.coins = player2Coins;

  io.to(game.roomId).emit("game_state", toClientGameState(game));

  io.to(game.roomId).emit("game_end", {
    winnerId,
    isDraw: result === "draw",
    coins: {
      [game.player1._id]: player1Coins,
      [game.player2._id]: player2Coins,
    },
    gameId: createdGame._id,
  });

  // Clean up forfeit timeouts
  const t1 = `${game.id}_${game.player1._id}`;
  const t2 = `${game.id}_${game.player2._id}`;
  if (forfeitTimeouts.has(t1)) {
    clearTimeout(forfeitTimeouts.get(t1));
    forfeitTimeouts.delete(t1);
  }
  if (forfeitTimeouts.has(t2)) {
    clearTimeout(forfeitTimeouts.get(t2));
    forfeitTimeouts.delete(t2);
  }

  // Clean up memory maps after a small delay
  setTimeout(() => {
    games.delete(game.id);
    const s1 = game.sockets[game.player1._id];
    const s2 = game.sockets[game.player2._id];
    if (s1) socketToGame.delete(s1);
    if (s2) socketToGame.delete(s2);
  }, 5000);
}

function registerGameSocketHandlers(io) {
  // Socket.io JWT Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("USER CONNECTED:", socket.id, "User ID:", socket.userId);

    socket.on("find_match", async () => {
      try {
        const dbUser = await User.findById(socket.userId).lean();
        if (!dbUser) {
          socket.emit("error", "User not found");
          return;
        }

        const user = {
          _id: dbUser._id.toString(),
          username: dbUser.username,
          profile_picture_url: dbUser.profile_picture_url || "",
          coins: dbUser.coins ?? 0,
        };

        // Prevent self-matching by checking unique user ID in queue
        const alreadyWaiting = waitingPlayers.some(
          (player) => player.user._id === user._id
        );
        if (alreadyWaiting) return;

        waitingPlayers.push({ socketId: socket.id, user });

        if (waitingPlayers.length >= 2) {
          const playerA = waitingPlayers.shift();
          const playerB = waitingPlayers.shift();

          if (!playerA || !playerB) return;

          const gameId = Math.random().toString(36).slice(2, 10);
          const [color1, color2] = getRandomColorPair();
          const roomId = `game_${gameId}`;

          const game = {
            id: gameId,
            roomId,
            grid: createEmptyGrid(),
            currentTurn: playerA.user._id,
            player1: { ...playerA.user, color: color1 },
            player2: { ...playerB.user, color: color2 },
            status: "playing",
            sockets: {
              [playerA.user._id]: playerA.socketId,
              [playerB.user._id]: playerB.socketId,
            },
          };

          games.set(gameId, game);
          socketToGame.set(playerA.socketId, gameId);
          socketToGame.set(playerB.socketId, gameId);

          io.to(playerA.socketId).emit("match_found", {
            opponent: playerB.user,
            game_id: gameId,
          });
          io.to(playerB.socketId).emit("match_found", {
            opponent: playerA.user,
            game_id: gameId,
          });
        }
      } catch {
        socket.emit("error", "Matchmaking failed");
      }
    });

    socket.on("cancel_match", () => {
      const index = waitingPlayers.findIndex(
        (player) => player.socketId === socket.id
      );
      if (index !== -1) {
        waitingPlayers.splice(index, 1);
      }
    });

    socket.on("join_game", ({ game_id }) => {
      const game = games.get(game_id);
      if (!game) {
        socket.emit("game_error", "Game not found");
        return;
      }

      const isPlayer1 = game.player1._id.toString() === socket.userId;
      const isPlayer2 = game.player2._id.toString() === socket.userId;

      if (!isPlayer1 && !isPlayer2) {
        socket.emit("game_error", "Not authorized for this game");
        return;
      }

      // Update active socket connection for this player
      const playerKey = isPlayer1 ? game.player1._id : game.player2._id;
      game.sockets[playerKey] = socket.id;
      socketToGame.set(socket.id, game_id);

      socket.join(game.roomId);

      // Clear reconnect/forfeit timeout if it was active
      const timeoutKey = `${game_id}_${socket.userId}`;
      const timeoutId = forfeitTimeouts.get(timeoutKey);
      if (timeoutId) {
        clearTimeout(timeoutId);
        forfeitTimeouts.delete(timeoutKey);
        console.log(`Cleared forfeit timeout for user ${socket.userId} in game ${game_id}`);
        // Notify other room participants of reconnection
        socket.to(game.roomId).emit("opponent_reconnected", { userId: socket.userId });
      }

      socket.emit("start_game", toClientGameState(game));
    });

    socket.on("make_move", async ({ game_id, row, col }) => {
      const game = games.get(game_id);
      if (!game || game.status !== "playing") {
        return;
      }

      const isPlayer1 = game.player1._id.toString() === socket.userId;
      const isPlayer2 = game.player2._id.toString() === socket.userId;

      if (!isPlayer1 && !isPlayer2) {
        return;
      }

      const playerId = isPlayer1 ? game.player1._id : game.player2._id;

      if (game.currentTurn !== playerId) {
        return;
      }

      if (game.grid[row][col] !== "") {
        return;
      }

      const playerColor = isPlayer1 ? game.player1.color : game.player2.color;
      game.grid[row][col] = playerColor;
      game.currentTurn = isPlayer1 ? game.player2._id : game.player1._id;

      io.to(game.roomId).emit("game_state", toClientGameState(game));

      if (isGridFull(game.grid)) {
        const p1Area = getLargestIsland(game.grid, game.player1.color);
        const p2Area = getLargestIsland(game.grid, game.player2.color);

        let result = "draw";
        if (p1Area > p2Area) result = "player1";
        if (p2Area > p1Area) result = "player2";

        await finishGame(io, game, result);
      }
    });

    socket.on("forfeit_game", async ({ game_id }) => {
      const game = games.get(game_id);
      if (!game || game.status !== "playing") {
        return;
      }

      const isPlayer1 = game.player1._id.toString() === socket.userId;
      const isPlayer2 = game.player2._id.toString() === socket.userId;

      if (!isPlayer1 && !isPlayer2) return;

      const result = isPlayer1 ? "player2" : "player1";
      await finishGame(io, game, result);
    });

    socket.on("disconnect", async () => {
      console.log("USER DISCONNECTED:", socket.id, "User ID:", socket.userId);

      const waitingIndex = waitingPlayers.findIndex(
        (player) => player.socketId === socket.id
      );
      if (waitingIndex !== -1) {
        waitingPlayers.splice(waitingIndex, 1);
      }

      const gameId = socketToGame.get(socket.id);
      if (gameId) {
        const game = games.get(gameId);
        if (game && game.status === "playing") {
          const disconnectedUserId = socket.userId;
          const timeoutKey = `${gameId}_${disconnectedUserId}`;

          console.log(`Starting 10s forfeit timeout for user ${disconnectedUserId} in game ${gameId}`);
          const timeoutId = setTimeout(async () => {
            const activeGame = games.get(gameId);
            if (activeGame && activeGame.status === "playing") {
              const result =
                disconnectedUserId === activeGame.player1._id.toString()
                  ? "player2"
                  : "player1";
              console.log(`Forfeit timeout expired. User ${disconnectedUserId} forfeited game ${gameId}`);
              await finishGame(io, activeGame, result);
            }
            forfeitTimeouts.delete(timeoutKey);
          }, 10000);

          forfeitTimeouts.set(timeoutKey, timeoutId);
        }
        socketToGame.delete(socket.id);
      }
    });
  });
}

export { registerGameSocketHandlers };
