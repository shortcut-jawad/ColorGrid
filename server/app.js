import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import Game from "./models/Game.js";
import { maxAreaOfIsland } from "./utils/maxAreaOfIsland.js";

dotenv.config();

const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

function sanitizeUser(user) {
  return {
    _id: user._id,
    username: user.username,
    profile_picture_url: user.profile_picture_url || "",
    coins: user.coins ?? 0,
  };
}

function getUserIdFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded.userId;
    } catch {
      return null;
    }
  }
  return null;
}

function requireAuth(req, res, next) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.userId = userId;
  return next();
}

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, password, profile_picture_url } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ message: "Username already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hashedPassword,
      profile_picture_url: profile_picture_url || "",
    });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to create account" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ message: "Login failed" });
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json(sanitizeUser(user));
});

app.put("/api/users/profile", requireAuth, async (req, res) => {
  try {
    const { username, profile_picture_url, current_password, new_password } =
      req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (username && username !== user.username) {
      const existing = await User.findOne({ username });
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }
      user.username = username;
    }

    if (profile_picture_url !== undefined) {
      user.profile_picture_url = profile_picture_url;
    }

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ message: "Current password required" });
      }
      const isMatch = await bcrypt.compare(current_password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Current password incorrect" });
      }
      user.password = await bcrypt.hash(new_password, 10);
    }

    await user.save();
    return res.json(sanitizeUser(user));
  } catch (err) {
    return res.status(500).json({ message: "Failed to update profile" });
  }
});

app.get("/api/leaderboard", requireAuth, async (req, res) => {
  try {
    const users = await User.find().sort({ coins: -1 }).lean();
    const games = await Game.find().lean();

    const statsMap = new Map();
    users.forEach((user) => {
      statsMap.set(String(user._id), { wins: 0, losses: 0, draws: 0 });
    });

    games.forEach((game) => {
      const p1 = String(game.player1_id);
      const p2 = String(game.player2_id);
      if (!statsMap.has(p1)) statsMap.set(p1, { wins: 0, losses: 0, draws: 0 });
      if (!statsMap.has(p2)) statsMap.set(p2, { wins: 0, losses: 0, draws: 0 });

      if (game.result === "draw") {
        statsMap.get(p1).draws += 1;
        statsMap.get(p2).draws += 1;
      } else if (game.result === "player1") {
        statsMap.get(p1).wins += 1;
        statsMap.get(p2).losses += 1;
      } else if (game.result === "player2") {
        statsMap.get(p2).wins += 1;
        statsMap.get(p1).losses += 1;
      }
    });

    const leaderboard = users.map((user) => ({
      _id: user._id,
      username: user.username,
      profile_picture_url: user.profile_picture_url || "",
      coins: user.coins ?? 0,
      stats: statsMap.get(String(user._id)) || { wins: 0, losses: 0, draws: 0 },
    }));

    return res.json(leaderboard);
  } catch (err) {
    return res.status(500).json({ message: "Failed to load leaderboard" });
  }
});

app.get("/api/games/history", requireAuth, async (req, res) => {
  try {
    const games = await Game.find({
      $or: [{ player1_id: req.userId }, { player2_id: req.userId }],
    })
      .sort({ created_at: -1 })
      .populate("player1_id", "username")
      .populate("player2_id", "username")
      .lean();

    const response = games.map((game) => ({
      _id: game._id,
      player1: {
        _id: game.player1_id._id,
        username: game.player1_id.username,
      },
      player2: {
        _id: game.player2_id._id,
        username: game.player2_id.username,
      },
      winner_id: game.winner_id || null,
      isDraw: game.result === "draw",
      created_at: game.created_at,
    }));

    return res.json(response);
  } catch (err) {
    return res.status(500).json({ message: "Failed to load history" });
  }
});

app.get("/api/games/:id", requireAuth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate("player1_id", "username profile_picture_url")
      .populate("player2_id", "username profile_picture_url")
      .lean();

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    const isParticipant =
      String(game.player1_id._id) === String(req.userId) ||
      String(game.player2_id._id) === String(req.userId);

    if (!isParticipant) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json({
      _id: game._id,
      player1: {
        _id: game.player1_id._id,
        username: game.player1_id.username,
        profile_picture_url: game.player1_id.profile_picture_url || "",
        color: game.player1_color,
      },
      player2: {
        _id: game.player2_id._id,
        username: game.player2_id.username,
        profile_picture_url: game.player2_id.profile_picture_url || "",
        color: game.player2_color,
      },
      final_grid: game.final_grid,
      winner_id: game.winner_id || null,
      isDraw: game.result === "draw",
      created_at: game.created_at,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load game details" });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

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

async function finishGame(game, result) {
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
    game.currentTurn = playerId === game.player1._id ? game.player2._id : game.player1._id;

    io.to(game.roomId).emit("game_state", toClientGameState(game));

    if (isGridFull(game.grid)) {
      const p1Area = getLargestIsland(game.grid, game.player1.color);
      const p2Area = getLargestIsland(game.grid, game.player2.color);

      let result = "draw";
      if (p1Area > p2Area) result = "player1";
      if (p2Area > p1Area) result = "player2";

      await finishGame(game, result);
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
    await finishGame(game, result);
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
        await finishGame(game, result);
      }
      socketToGame.delete(socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
