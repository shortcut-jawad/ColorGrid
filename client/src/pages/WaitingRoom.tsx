import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import "../css/waiting.css";

interface Opponent {
  username: string;
  profile_picture_url?: string;
}

export default function WaitingRoom() {
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!socket) {
      return;
    }

    socket.emit("find_match", user);

    socket.on(
      "match_found",
      (data: { opponent: Opponent; game_id: string }) => {
        setOpponent(data.opponent);
        // Short delay to show opponent before redirecting
        setTimeout(() => {
          navigate(`/newgame/${data.game_id}`);
        }, 2000);
      }
    );

    socket.on("error", (error: string) => {
      setError(error);
    });

    return () => {
      socket.off("match_found");
      socket.off("error");
    };
  }, [user, socket, navigate]);

  const handleCancel = () => {
    if (socket && !opponent) {
      socket.emit("cancel_match");
      navigate("/home");
    }
  };

  if (!user) return null;

  return (
    <div className="waiting-room">
      <h2>Finding Opponent...</h2>
      {error && <div className="error-message">{error}</div>}

      {opponent ? (
        <div className="opponent-found">
          <h3>Opponent Found!</h3>
          <div className="opponent-info">
            <img
              src={
                opponent.profile_picture_url ||
                "https://via.placeholder.com/100"
              }
              alt={opponent.username}
              className="opponent-avatar"
            />
            <p>{opponent.username}</p>
          </div>
          <p>Game starting...</p>
        </div>
      ) : (
        <>
          <div className="loading-spinner"></div>
          <button onClick={handleCancel} className="btn btn-secondary">
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
