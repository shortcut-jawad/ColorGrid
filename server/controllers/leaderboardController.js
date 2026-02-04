import User from "../models/User.js";
import Game from "../models/Game.js";

async function getLeaderboard(req, res) {
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
}

export { getLeaderboard };
