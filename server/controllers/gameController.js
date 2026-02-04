import Game from "../models/Game.js";

async function getHistory(req, res) {
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
}

async function getGameById(req, res) {
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
}

export { getHistory, getGameById };
