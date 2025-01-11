// src/pages/Contests.js

import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

function Contests() {
  return (
    <div>
      <Header />
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Contests</h1>
        <p>Your platform for competitive programming.</p>
      </div>
      <Footer />
    </div>
  );
}

export default Contests;