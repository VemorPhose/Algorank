// src/pages/Contests.js

import React from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

function Contests() {
  return (
    <div className="flex flex-col min-h-screen my-0">
        <Header/>
        <main className="flex-1 text-white" style={{ padding: '20px', textAlign: 'center', backgroundColor: '#1D2125' }}>
            <h1>Contests</h1>
            <p>Coming Soon!</p>
        </main>
        <Footer/>
     </div>
  );
}

export default Contests;