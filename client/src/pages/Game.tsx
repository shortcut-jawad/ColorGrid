import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import "../css/gameplay.css";

interface Player {
  _id: string;
  username: string;
  profile_picture_url?: string;
  color: string;
}

interface GameState {
  game_id?: string;
  grid: string[][];
  currentTurn: string;
  player1: Player;
  player2: Player;
  status: "playing" | "finished";
  winnerId?: string | null;
  isDraw?: boolean;
}

export default function Game() {
  const { game_id } = useParams<{ game_id: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const { user, updateUser } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !game_id) {
      navigate("/home");
      return;
    }

    if (!socket) {
      return;
    }

    socket.emit("join_game", { game_id });

    socket.on("start_game", (gameData: any) => {
      setGameState(gameData);
    });    

    socket.on("game_state", (state: GameState) => {
      setGameState(state);
    });  

    socket.on("game_error", (error: string) => {
      setError(error);
    });

    socket.on(
      "game_end",
      (result: {
        winnerId?: string | null;
        isDraw: boolean;
        coins?: Record<string, number>;
      }) => {
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              status: "finished",
              winnerId: result.winnerId,
              isDraw: result.isDraw,
            }
          : null
      );
      if (result.coins && user?._id && result.coins[user._id] !== undefined) {
        updateUser({ coins: result.coins[user._id] });
      }
    }
    );

    return () => {
      socket.off("start_game");
      socket.off("game_state");
      socket.off("game_error");
      socket.off("game_end");
    };
  }, [game_id, user, socket, navigate, updateUser]);

  const handleCellClick = (row: number, col: number) => {
    if (
      !gameState ||
      !socket ||
      gameState.status === "finished" ||
      gameState.currentTurn !== user?._id
    ) {
      return;
    }

    if (gameState.grid[row][col] !== "") {
      return;
    }

    socket.emit("make_move", { game_id, row, col });
  };

  const handleForfeit = () => {
    if (socket) {
      socket.emit("forfeit_game", { game_id });
    }
  };

  const handlePlayAgain = () => {
    navigate("/newgame/waiting");
  };

  if (!gameState) {
    return (
      <div className="game-loading">
        <div className="loading-spinner"></div>
        <p>Loading game...</p>
        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  const isMyTurn = gameState.currentTurn === user?._id;
  const didWin = gameState.winnerId && gameState.winnerId === user?._id;
  const didLose =
    gameState.winnerId &&
    user?._id &&
    gameState.winnerId !== user._id &&
    !gameState.isDraw;
  const lostWithZero = didLose && (user?.coins ?? 0) === 0;

  return (
    <div className="game-container">
      <div className="game-header">
        <div className="player-info">
          <img
            src={
              gameState.player1.profile_picture_url ||
              "https://via.placeholder.com/50"
            }
            alt={gameState.player1.username}
            className="player-avatar"
            style={{ borderColor: gameState.player1.color }}
          />
          <span>{gameState.player1.username}</span>
        </div>
        <div className="vs">VS</div>
        <div className="player-info">
          <img
            src={
              gameState.player2.profile_picture_url ||
              "https://via.placeholder.com/50"
            }
            alt={gameState.player2.username}
            className="player-avatar"
            style={{ borderColor: gameState.player2.color }}
          />
          <span>{gameState.player2.username}</span>
        </div>
      </div>

      <div className="game-status">
        {gameState.status === "finished" ? (
          <>
            {gameState.isDraw ? (
              <p>Game Over - Draw!</p>
            ) : (
              <p>
                Game Over -{" "}
                {didWin
                  ? "You Won (+200 coins)!"
                  : lostWithZero
                  ? "You Lost"
                  : "You Lost (-200 coins)"}
              </p>
            )}
            <button onClick={handlePlayAgain} className="btn btn-primary">
              Play Again
            </button>
          </>
        ) : (
          <p>Status: {isMyTurn ? "Your Turn" : "Opponent Turn"}</p>
        )}
      </div>

      <div className="game-grid">
        {gameState.grid.map((row, rowIndex) => (
          <div key={rowIndex} className="grid-row">
            {row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`grid-cell ${cell ? "filled" : ""} ${
                  isMyTurn ? "clickable" : ""
                }`}
                style={{ backgroundColor: cell || "white" }}
                onClick={() => handleCellClick(rowIndex, colIndex)}
              />
            ))}
          </div>
        ))}
      </div>

      {gameState.status === "playing" && (
        <button onClick={handleForfeit} className="btn btn-danger">
          Forfeit
        </button>
      )}
    </div>
  );
}
