// src/App.js

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Problems from './pages/Problems.jsx';
import ProblemPage from './pages/ProblemPage.jsx';
import Contests from './pages/Contests.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/contests" element={<Contests />} />
        <Route path="/problem/:problemId" element={<ProblemPage />} />
      </Routes>
    </Router>
  );
}

export default App;