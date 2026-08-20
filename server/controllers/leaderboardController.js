import User from "../models/User.js";

async function getLeaderboard(req, res) {
  try {
    const users = await User.find()
      .sort({ coins: -1 })
      .limit(100)
      .select("_id username profile_picture_url coins wins losses draws")
      .lean();

    const leaderboard = users.map((user) => ({
      _id: user._id,
      username: user.username,
      profile_picture_url: user.profile_picture_url || "",
      coins: user.coins ?? 0,
      stats: {
        wins: user.wins ?? 0,
        losses: user.losses ?? 0,
        draws: user.draws ?? 0,
      },
    }));

    return res.json(leaderboard);
  } catch (err) {
    console.error("Leaderboard error:", err);
    return res.status(500).json({ message: "Failed to load leaderboard" });
  }
}

export { getLeaderboard };
