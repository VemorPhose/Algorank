import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

function Profile() {
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    problemsSolved: 0,
    rank: "Beginner",
    points: 0,
    streak: 0
  });

  // This would fetch user stats from your database
  useEffect(() => {
    if (user) {
      // Replace this with actual API call to get user stats
      // Example: fetchUserStats(user.uid).then(data => setStats(data));
      
      // Simulating data for demonstration
      setStats({
        problemsSolved: 42,
        rank: "Intermediate",
        points: 1250,
        streak: 7
      });
    }
  }, [user]);

  return (
    <div
      className="flex flex-col justify-between min-w-full bg-contain bg-top min-h-screen"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1517134191118-9d595e4c8c2b?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
      }}
    >
      <Header />
      <div className="flex items-start justify-start pl-16 py-16 flex-grow">
        {loading ? (
          <div className="bg-black bg-opacity-50 p-4 rounded-lg">
            <p className="text-xl text-white">Loading...</p>
          </div>
        ) : user ? (
          <div className="bg-black bg-opacity-70 p-6 rounded-lg text-white max-w-md">
            <div className="flex items-center mb-4">
              <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-2xl font-bold mr-3">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{user.displayName || user.email}</h1>
                <p className="text-gray-300 text-sm">Member since {new Date(user.metadata.creationTime).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-gray-800 p-3 rounded-lg text-center">
                <p className="text-gray-400 text-xs">Problems Solved</p>
                <p className="text-2xl font-bold">{stats.problemsSolved}</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg text-center">
                <p className="text-gray-400 text-xs">Current Rank</p>
                <p className="text-2xl font-bold">{stats.rank}</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg text-center">
                <p className="text-gray-400 text-xs">Total Points</p>
                <p className="text-2xl font-bold">{stats.points}</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg text-center">
                <p className="text-gray-400 text-xs">Day Streak</p>
                <p className="text-2xl font-bold">{stats.streak}</p>
              </div>
            </div>
            
            <div className="mt-6">
              <h2 className="text-lg font-bold mb-2">Recent Activity</h2>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-gray-300 text-center text-sm">No recent activity to show</p>
                {/* Replace with actual recent activity list */}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <div className="bg-black bg-opacity-70 p-6 rounded-lg max-w-md text-center">
              <h1 className="text-2xl font-bold text-white">Forgot to Log In?</h1>
              <p className="mt-3 text-gray-300">
                Log in to view your AlgoRank profile and stats.
              </p>
              <button 
                onClick={() => navigate("/login")}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Go to Login
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default Profile;