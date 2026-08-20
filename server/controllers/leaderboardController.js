import User from "../models/User.js";
import Game from "../models/Game.js";

async function getLeaderboard(req, res) {
  try {
    // 1. Fetch top 100 users sorted by coins
    const users = await User.find()
      .sort({ coins: -1 })
      .limit(100)
      .lean();

    const userIds = users.map((user) => user._id);

    // 2. Perform aggregation on Game collection to compute stats only for these 100 users
    const stats = await Game.aggregate([
      {
        $match: {
          $or: [
            { player1_id: { $in: userIds } },
            { player2_id: { $in: userIds } },
          ],
        },
      },
      {
        $project: {
          players: [
            {
              userId: "$player1_id",
              role: "player1",
              result: "$result",
            },
            {
              userId: "$player2_id",
              role: "player2",
              result: "$result",
            },
          ],
        },
      },
      { $unwind: "$players" },
      { $match: { "players.userId": { $in: userIds } } },
      {
        $group: {
          _id: "$players.userId",
          wins: {
            $sum: {
              $cond: [
                {
                  $or: [
                    {
                      $and: [
                        { $eq: ["$players.result", "player1"] },
                        { $eq: ["$players.role", "player1"] },
                      ],
                    },
                    {
                      $and: [
                        { $eq: ["$players.result", "player2"] },
                        { $eq: ["$players.role", "player2"] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          losses: {
            $sum: {
              $cond: [
                {
                  $or: [
                    {
                      $and: [
                        { $eq: ["$players.result", "player1"] },
                        { $eq: ["$players.role", "player2"] },
                      ],
                    },
                    {
                      $and: [
                        { $eq: ["$players.result", "player2"] },
                        { $eq: ["$players.role", "player1"] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          draws: {
            $sum: {
              $cond: [{ $eq: ["$players.result", "draw"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // 3. Map the aggregated stats to a lookup Map
    const statsMap = new Map();
    stats.forEach((stat) => {
      statsMap.set(stat._id.toString(), {
        wins: stat.wins,
        losses: stat.losses,
        draws: stat.draws,
      });
    });

    // 4. Build leaderboard response
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
