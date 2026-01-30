import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "../css/history.css";
import { API_URL } from "../lib/env";

interface GameHistory {
  _id: string;
  player1: {
    _id: string;
    username: string;
  };
  player2: {
    _id: string;
    username: string;
  };
  winner_id?: string;
  isDraw: boolean;
  created_at: string;
}

export default function History() {
  const [games, setGames] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchGames = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/games/history`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setGames(response.data);
      } catch (err) {
        setError("Failed to load game history");
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [user, navigate]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading history...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="history-container">
      <h2 className="history-title">Game History</h2>
      {games.length === 0 ? (
        <p>No games played yet</p>
      ) : (
        <ul className="history-list">
          {games.map((game) => {
            const opponent =
              game.player1._id === user._id ? game.player2 : game.player1;
            const result = game.isDraw
              ? "Draw"
              : game.winner_id === user._id
              ? "Won"
              : "Lost";

            return (
              <li key={game._id}>
                <Link to={`/history/${game._id}`}>
                  Game #{game._id.slice(-6)} {opponent.username} {result}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
