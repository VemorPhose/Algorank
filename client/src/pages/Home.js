// src/pages/Home.js

import React from 'react';
import Header from '../components/Header';

function Home() {
  return (
    <div>
      <Header />
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Welcome to Algorank!</h1>
        <p>Your platform for competitive programming.</p>
      </div>
    </div>
  );
}

export default Home;
