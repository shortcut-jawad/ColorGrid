import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/home" className="navbar-brand">
          ColorGrid
        </Link>
      </div>
      <div className="navbar-right">
        <span className="coins">🪙 {user.coins}</span>
        <div className="dropdown">
          <button className="dropdown-button">
            <img
              src={user.profile_picture_url || "https://via.placeholder.com/40"}
              alt={user.username}
              className="profile-pic"
            />
            <span>{user.username}</span>
          </button>
          <div className="dropdown-content">
            <Link to="/update-profile">Update Profile</Link>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>
    </nav>
  );
}
