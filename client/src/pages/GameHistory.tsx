import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "../css/history-detail.css";
import { API_URL } from "../lib/env";

interface Player {
  _id: string;
  username: string;
  profile_picture_url?: string;
  color: string;
}

interface GameHistoryData {
  _id: string;
  player1: Player;
  player2: Player;
  final_grid: string[][];
  winner_id?: string;
  isDraw: boolean;
  created_at: string;
}

export default function GameHistory() {
  const { game_id } = useParams<{ game_id: string }>();
  const [game, setGame] = useState<GameHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  // const PORT = process.env.PORT || 8000;
  // app.listen(PORT, () => {
  //   console.log(`Server is running on port ${PORT}`);
  // });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchGame = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/games/${game_id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setGame(response.data);
      } catch (err) {
        setError("Failed to load game details");
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [game_id, user, navigate]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading game details...</p>
      </div>
    );
  }

  if (error || !game) {
    return <div className="error-message">{error || "Game not found"}</div>;
  }

  const getGameResult = () => {
    if (game.isDraw) return "Draw";
    return game.winner_id === user._id ? "You Won" : "You Lost";
  };

  return (
    <div className="game-history-container">
      <h2>Game #{game._id.slice(-6)}</h2>

      <div className="game-header">
        <div className="player-info">
          <img
            src={
              game.player1.profile_picture_url ||
              "https://via.placeholder.com/50"
            }
            alt={game.player1.username}
            className="player-avatar"
            style={{ borderColor: game.player1.color }}
          />
          <span>{game.player1.username}</span>
        </div>
        <div className="vs">VS</div>
        <div className="player-info">
          <img
            src={
              game.player2.profile_picture_url ||
              "https://via.placeholder.com/50"
            }
            alt={game.player2.username}
            className="player-avatar"
            style={{ borderColor: game.player2.color }}
          />
          <span>{game.player2.username}</span>
        </div>
      </div>

      <div className="game-result">
        <h3>Result: {getGameResult()}</h3>
        <p>Played on {new Date(game.created_at).toLocaleDateString()}</p>
      </div>

      <div className="game-grid">
        {game.final_grid.map((row, rowIndex) => (
          <div key={rowIndex} className="grid-row">
            {row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="grid-cell filled"
                style={{ backgroundColor: cell || "white" }}
              />
            ))}
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate("/history")}
        className="btn btn-secondary"
      >
        Back to History
      </button>
    </div>
  );
}
