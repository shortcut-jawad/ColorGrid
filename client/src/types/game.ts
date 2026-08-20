export interface Player {
  _id: string;
  username: string;
  profile_picture_url?: string;
  color: string;
}

export interface GameState {
  game_id?: string;
  grid: string[][];
  currentTurn: string;
  player1: Player;
  player2: Player;
  status: "playing" | "finished";
  winnerId?: string | null;
  isDraw?: boolean;
}

export interface GameHistoryData {
  _id: string;
  player1: Player;
  player2: Player;
  final_grid: string[][];
  winner_id?: string;
  isDraw: boolean;
  created_at: string;
}
