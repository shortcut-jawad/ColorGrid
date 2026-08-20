
import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  player1_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  player2_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  player1_color: { type: String, required: true },
  player2_color: { type: String, required: true },
  final_grid: {
    type: [[String]], 
    required: true
  },
  result: {
    type: String,
    enum: ["player1", "player2", "draw"],
    required: true
  },
  winner_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  created_at: { type: Date, default: Date.now }
});

gameSchema.index({ player1_id: 1 });
gameSchema.index({ player2_id: 1 });
gameSchema.index({ created_at: -1 });

const Game = mongoose.model("Game", gameSchema);
export default Game;
