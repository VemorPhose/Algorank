// src/pages/Home.js
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

function Home() {
  return (
     <div className="flex flex-col min-h-screen my-0">
        <Header/>
        <main className="flex-1 text-white" style={{ padding: '20px', textAlign: 'center', backgroundColor: '#1D2125' }}>
            <h1>Welcome to Algorank!</h1>
            <p>Your platform for competitive programming.</p>
        </main>
        <Footer/>
     </div>
  );
}

export default Home;