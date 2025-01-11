// src/pages/Problemset.js

import React from 'react';
import Header from '../components/Header';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Problemset() {
  const [problems, setProblems] = useState([]);

  useEffect(() => {
    // Automatically import all .md files in the problems folder
    const context = require.context('../problems', false, /\.md$/);
    const problemFiles = context.keys().map((file) => file.replace('./', '').replace('.md', ''));
    setProblems(problemFiles);
  }, []);

  return (
    <div>
      <Header />
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Problemset</h1>
        <p>Your platform for competitive programming.</p>
        {problems.map((problem) => (
          <div key={problem}>
            <Link to={`/problem/${problem}`}>{problem.replace(/-/g, ' ')}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Problemset;