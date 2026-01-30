import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Game from "./pages/Game";
import WaitingRoom from "./pages/WaitingRoom";
import History from "./pages/History";
import GameHistory from "./pages/GameHistory";
import Leaderboard from "./pages/Leaderboard";
import UpdateProfile from "./pages/UpdateProfile";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/home" element={<Home />} />
            <Route path="/newgame/waiting" element={<WaitingRoom />} />
            <Route path="/newgame/:game_id" element={<Game />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:game_id" element={<GameHistory />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/update-profile" element={<UpdateProfile />} />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import Welcome from "./pages/Welcome.tsx";
// import Login from "./pages/Login.tsx";
// import Signup from "./pages/Signup.tsx";
// import Home from "./pages/Home.tsx";
// import Game from "./pages/Game.tsx";
// import WaitingRoom from "./pages/WaitingRoom.tsx";
// import History from "./pages/History.tsx";
// import GameHistory from "./pages/GameHistory.tsx";
// import Leaderboard from "./pages/Leaderboard.tsx";
// import UpdateProfile from "./pages/UpdateProfile.tsx";
// import Navbar from "./components/Navbar.tsx"; // optional

// function App() {
//   return (
//     <Router>
//       <Navbar />
//       <Routes>
//         <Route path="/" element={<Welcome />} />
//         <Route path="/login" element={<Login />} />
//         <Route path="/signup" element={<Signup />} />
//         <Route path="/home" element={<Home />} />
//         <Route path="/newgame/waiting" element={<WaitingRoom />} />
//         <Route path="/newgame/:game_id" element={<Game />} />
//         <Route path="/history" element={<History />} />
//         <Route path="/history/:game_id" element={<GameHistory />} />
//         <Route path="/leaderboard" element={<Leaderboard />} />
//         <Route path="/update-profile" element={<UpdateProfile />} />
//       </Routes>
//     </Router>
//   );
// }

// export default App;
