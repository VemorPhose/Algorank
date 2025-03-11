// src/App.js

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Problems from './pages/Problems.jsx';
import ProblemPage from './pages/ProblemPage.jsx';
import Contests from './pages/Contests.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Profile from './pages/Profile.jsx';
import ContestPage from './pages/ContestPage.jsx';
import StandingsPage from './pages/StandingsPage.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/contests" element={<Contests />} />
        <Route path="/problem/:problemId" element={<ProblemPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/contest/:contestId" element={<ContestPage />} />
        <Route path="/contest/:contestId/standings" element={<StandingsPage />} />
      </Routes>
    </Router>
  );
}

export default App;