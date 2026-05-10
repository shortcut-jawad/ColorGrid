import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../css/home.css";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="home-container">
      <div className="home-hero">
        <h1>Welcome back,</h1>
        <div className="home-username">{user.username}</div>
      </div>
      <div className="home-actions">
        <button
          className="action-card"
          onClick={() => navigate("/newgame/waiting")}
        >
          <span className="action-icon">⚔️</span>
          <span className="action-label">Play Game</span>
          <span className="action-desc">Find an opponent</span>
        </button>
        <button
          className="action-card green"
          onClick={() => navigate("/leaderboard")}
        >
          <span className="action-icon">🏆</span>
          <span className="action-label">Leaderboard</span>
          <span className="action-desc">View top players</span>
        </button>
        <button
          className="action-card green"
          onClick={() => navigate("/history")}
        >
          <span className="action-icon">📋</span>
          <span className="action-label">Game History</span>
          <span className="action-desc">Review past matches</span>
        </button>
      </div>
    </div>
  );
}
