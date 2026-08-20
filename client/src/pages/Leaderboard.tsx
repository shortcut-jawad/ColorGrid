import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "../css/leaderboard.css";
import { API_URL } from "../lib/env";

interface LeaderboardPlayer {
  _id: string;
  username: string;
  profile_picture_url?: string;
  coins: number;
  stats: {
    wins: number;
    losses: number;
    draws: number;
  };
}

export default function Leaderboard() {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    const fetchLeaderboard = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/leaderboard`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setPlayers(response.data);
      } catch (err) {
        setError("Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user, authLoading, navigate]);

  const filteredPlayers = players.filter((player) =>
    player.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!user) return null;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="leaderboard-container">
      <h2>Leaderboard</h2>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="leaderboard-list">
        <div className="leaderboard-header">
          <span>Rank</span>
          <span>Player</span>
          <span>W/L/D</span>
          <span>Coins</span>
        </div>

        {filteredPlayers.length === 0 ? (
          <p className="no-results">No players found</p>
        ) : (
          filteredPlayers.map((player, index) => (
            <div
              key={player._id}
              className={`leaderboard-item ${
                player._id === user._id ? "current-user" : ""
              } ${index < 3 ? `rank-${index + 1}` : ""}`}
            >
              <span className="rank">
                {index < 3 ? medals[index] : index + 1}
              </span>
              <div className="player-info">
                <img
                  src={
                    player.profile_picture_url ||
                    "https://via.placeholder.com/30"
                  }
                  alt={player.username}
                  className="player-avatar"
                />
                <span>{player.username}</span>
              </div>
              <span className="stats">
                {player.stats.wins}/{player.stats.losses}/{player.stats.draws}
              </span>
              <span className="coins">🪙 {player.coins}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
