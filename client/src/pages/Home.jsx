// src/pages/Home.js

import React from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

function Home() {
  return (
    <div>
      <Header/>
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Welcome to Algorank!</h1>
        <p>Your platform for competitive programming.</p>
      </div>
      <Footer/>
    </div>
  );
}

export default Home;
