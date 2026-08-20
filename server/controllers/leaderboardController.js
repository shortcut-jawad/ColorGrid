import User from "../models/User.js";
import Game from "../models/Game.js";

async function getLeaderboard(req, res) {
  try {
    // 1. Fetch top 100 users sorted by coins
    const users = await User.find()
      .sort({ coins: -1 })
      .limit(100)
      .select("_id username profile_picture_url coins")
      .lean();

    if (!users || users.length === 0) {
      return res.json([]);
    }

    const userIds = users.map((user) => user._id);

    // 2. Fetch all games involving these top 100 users
    const games = await Game.find({
      $or: [
        { player1_id: { $in: userIds } },
        { player2_id: { $in: userIds } },
      ],
    })
      .select("player1_id player2_id result")
      .lean();

    // 3. Compute wins, losses, draws in memory for these top 100 users
    const statsMap = new Map();
    users.forEach((user) => {
      statsMap.set(user._id.toString(), { wins: 0, losses: 0, draws: 0 });
    });

    games.forEach((game) => {
      const p1Id = game.player1_id ? game.player1_id.toString() : null;
      const p2Id = game.player2_id ? game.player2_id.toString() : null;

      if (p1Id && statsMap.has(p1Id)) {
        const stats = statsMap.get(p1Id);
        if (game.result === "player1") stats.wins += 1;
        else if (game.result === "player2") stats.losses += 1;
        else if (game.result === "draw") stats.draws += 1;
      }

      if (p2Id && statsMap.has(p2Id)) {
        const stats = statsMap.get(p2Id);
        if (game.result === "player2") stats.wins += 1;
        else if (game.result === "player1") stats.losses += 1;
        else if (game.result === "draw") stats.draws += 1;
      }
    });

    // 4. Construct response array
    const leaderboard = users.map((user) => ({
      _id: user._id,
      username: user.username,
      profile_picture_url: user.profile_picture_url || "",
      coins: user.coins ?? 0,
      stats: statsMap.get(user._id.toString()) || {
        wins: 0,
        losses: 0,
        draws: 0,
      },
    }));

    return res.json(leaderboard);
  } catch (err) {
    console.error("Leaderboard error:", err);
    return res.status(500).json({ message: "Failed to load leaderboard" });
  }
}

export { getLeaderboard };
