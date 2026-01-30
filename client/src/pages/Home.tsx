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
      <h1>Welcome, {user.username}!</h1>
      <div className="home-buttons">
        <button
          className="btn btn-primary"
          onClick={() => navigate("/newgame/waiting")}
        >
          Play Game
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/leaderboard")}
        >
          Leaderboard
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/history")}
        >
          Game History
        </button>
      </div>
    </div>
  );
}
