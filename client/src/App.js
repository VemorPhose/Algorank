// src/App.js

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Problems from './pages/Problems';
import ProblemPage from './pages/ProblemPage';
import Contests from './pages/Contests';

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