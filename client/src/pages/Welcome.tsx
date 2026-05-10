import { Link } from "react-router-dom";
import "../css/welcome.css";

export default function Welcome() {
  return (
    <div className="welcome-container">
      <div className="welcome-badge">Turn-Based Strategy Game</div>
      <h1>ColorGrid</h1>
      <div className="welcome-divider" />
      <p>Conquer the grid. Claim territory. Outsmart your opponent in this color conquest battle.</p>
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
