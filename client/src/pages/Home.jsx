import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

function Home() {
  return (
    <div>
      <Header />
      <div
        className="flex items-center justify-center min-h-screen bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1517134191118-9d595e4c8c2b?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
        }}
      >
        <div className="bg-black bg-opacity-50 p-6 rounded-lg text-center">
          <h1 className="text-5xl font-bold text-white">Welcome to AlgoRank</h1>
          <p className="mt-4 text-lg text-gray-300">
            Your journey to mastering algorithms starts here.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Home;
