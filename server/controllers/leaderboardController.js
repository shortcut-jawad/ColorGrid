import mongoose from "mongoose";
import User from "../models/User.js";
import Game from "../models/Game.js";

async function getLeaderboard(req, res) {
  try {
    // 1. Fetch top 100 users sorted by coins
    const users = await User.find()
      .sort({ coins: -1 })
      .limit(100)
      .select("_id username profile_picture_url coins wins losses draws")
      .lean();

    if (!users || users.length === 0) {
      return res.json([]);
    }

    // Convert IDs to mongoose ObjectIds for exact indexed matching
    const objectIds = users.map(
      (user) => new mongoose.Types.ObjectId(user._id.toString())
    );

    // 2. Fetch past game records involving these top 100 users
    const games = await Game.find({
      $or: [
        { player1_id: { $in: objectIds } },
        { player2_id: { $in: objectIds } },
      ],
    })
      .select("player1_id player2_id result")
      .lean();

    // 3. Initialize stats map
    const statsMap = new Map();
    users.forEach((user) => {
      const hasStoredStats =
        (user.wins || 0) + (user.losses || 0) + (user.draws || 0) > 0;
      statsMap.set(user._id.toString(), {
        wins: user.wins || 0,
        losses: user.losses || 0,
        draws: user.draws || 0,
        hasStoredStats,
      });
    });

    // 4. Compute stats from game history for users without stored stats
    games.forEach((game) => {
      const p1 = game.player1_id ? game.player1_id.toString() : null;
      const p2 = game.player2_id ? game.player2_id.toString() : null;

      if (p1 && statsMap.has(p1)) {
        const s = statsMap.get(p1);
        if (!s.hasStoredStats) {
          if (game.result === "player1") s.wins += 1;
          else if (game.result === "player2") s.losses += 1;
          else if (game.result === "draw") s.draws += 1;
        }
      }

      if (p2 && statsMap.has(p2)) {
        const s = statsMap.get(p2);
        if (!s.hasStoredStats) {
          if (game.result === "player2") s.wins += 1;
          else if (game.result === "player1") s.losses += 1;
          else if (game.result === "draw") s.draws += 1;
        }
      }
    });

    // 5. Construct leaderboard response array
    const leaderboard = users.map((user) => {
      const uStats = statsMap.get(user._id.toString()) || {
        wins: 0,
        losses: 0,
        draws: 0,
      };
      return {
        _id: user._id,
        username: user.username,
        profile_picture_url: user.profile_picture_url || "",
        coins: user.coins ?? 0,
        stats: {
          wins: uStats.wins,
          losses: uStats.losses,
          draws: uStats.draws,
        },
      };
    });

    return res.json(leaderboard);
  } catch (err) {
    console.error("Leaderboard error:", err);
    return res.status(500).json({ message: "Failed to load leaderboard" });
  }
}

export { getLeaderboard };
