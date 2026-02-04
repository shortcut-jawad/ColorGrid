import User from "../models/User.js";
import Game from "../models/Game.js";
import { maxAreaOfIsland } from "../utils/maxAreaOfIsland.js";

const waitingPlayers = [];
const games = new Map();
const socketToGame = new Map();

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

  let player1Coins = player1Db?.coins ?? game.player1.coins ?? 0;
  let player2Coins = player2Db?.coins ?? game.player2.coins ?? 0;

  if (result === "player1") {
    player1Coins += 200;
    player2Coins = Math.max(0, player2Coins - 200);
  } else if (result === "player2") {
    player2Coins += 200;
    player1Coins = Math.max(0, player1Coins - 200);
  }

  await Promise.all([
    User.findByIdAndUpdate(game.player1._id, { coins: player1Coins }),
    User.findByIdAndUpdate(game.player2._id, { coins: player2Coins }),
  ]);

  game.player1.coins = player1Coins;
  game.player2.coins = player2Coins;

  io.to(game.roomId).emit("game_end", {
    winnerId,
    isDraw: result === "draw",
    coins: {
      [game.player1._id]: player1Coins,
      [game.player2._id]: player2Coins,
    },
    gameId: createdGame._id,
  });
}

function registerGameSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("USER CONNECTED:", socket.id);

    socket.on("find_match", (user) => {
      if (!user || !user._id) {
        socket.emit("error", "Invalid user");
        return;
      }

      const alreadyWaiting = waitingPlayers.some(
        (player) => player.socketId === socket.id
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

      const isParticipant =
        game.sockets[game.player1._id] === socket.id ||
        game.sockets[game.player2._id] === socket.id;
      if (!isParticipant) {
        socket.emit("game_error", "Not authorized for this game");
        return;
      }

      socket.join(game.roomId);
      socket.emit("start_game", toClientGameState(game));
    });

    socket.on("make_move", async ({ game_id, row, col }) => {
      const game = games.get(game_id);
      if (!game || game.status !== "playing") {
        return;
      }

      const playerId =
        game.sockets[game.player1._id] === socket.id
          ? game.player1._id
          : game.sockets[game.player2._id] === socket.id
          ? game.player2._id
          : null;

      if (!playerId || game.currentTurn !== playerId) {
        return;
      }

      if (game.grid[row][col] !== "") {
        return;
      }

      const playerColor =
        playerId === game.player1._id ? game.player1.color : game.player2.color;
      game.grid[row][col] = playerColor;
      game.currentTurn =
        playerId === game.player1._id ? game.player2._id : game.player1._id;

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

      const isPlayer1 = game.sockets[game.player1._id] === socket.id;
      const isPlayer2 = game.sockets[game.player2._id] === socket.id;

      if (!isPlayer1 && !isPlayer2) return;

      const result = isPlayer1 ? "player2" : "player1";
      await finishGame(io, game, result);
    });

    socket.on("disconnect", async () => {
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
          const result =
            game.sockets[game.player1._id] === socket.id ? "player2" : "player1";
          await finishGame(io, game, result);
        }
        socketToGame.delete(socket.id);
      }
    });
  });
}

export { registerGameSocketHandlers };
