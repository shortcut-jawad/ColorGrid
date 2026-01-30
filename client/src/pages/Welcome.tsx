import { Link } from "react-router-dom";
import "../css/welcome.css";

export default function Welcome() {
  return (
    <div className="welcome-container">
      <h1>Welcome to ColorGrid</h1>
      <p>A 2-player, turn-based color conquest game</p>
      <div className="welcome-buttons">
        <Link to="/login" className="btn btn-primary">
          Login
        </Link>
        <Link to="/signup" className="btn btn-secondary">
          Sign Up
        </Link>
      </div>
    </div>
  );
}
