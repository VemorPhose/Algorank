import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import Header from "../components/Header";
import Footer from "../components/Footer";

function StandingsPage() {
  const { contestId } = useParams();
  const [user] = useAuthState(auth);
  const [contest, setContest] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/contests/${contestId}/standings${
            user ? `?userId=${user.uid}` : ""
          }`
        );
        
        if (!response.ok) {
          throw new Error("Failed to fetch standings");
        }

        const data = await response.json();
        setContest(data.contest);
        setStandings(data.standings);
        setLastUpdated(new Date());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();

    // Set up polling for active contests
    const pollInterval = setInterval(async () => {
      if (contest?.status === 'active') {
        await fetchStandings();
      }
    }, 30000); // Poll every 30 seconds for active contests

    return () => clearInterval(pollInterval);
  }, [contestId, user]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1" style={{ backgroundColor: "#1D2125" }}>
          <div className="text-white text-center py-10">Loading standings...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1" style={{ backgroundColor: "#1D2125" }}>
          <div className="text-red-500 text-center py-10">{error}</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-8" style={{ backgroundColor: "#1D2125" }}>
        {contest && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-4">
                {contest.title} - Standings
              </h1>
              <div className="text-gray-400">
                {contest.status === 'active' ? (
                  <div className="flex justify-between items-center">
                    <span>Contest is ongoing</span>
                    <span>Last updated: {lastUpdated?.toLocaleTimeString()}</span>
                  </div>
                ) : (
                  <span>Final Standings</span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="p-4 text-left">Rank</th>
                    <th className="p-4 text-left">Username</th>
                    <th className="p-4 text-center">Score</th>
                    {contest.problems?.map((problem) => (
                      <th key={problem.problem_id} className="p-4 text-center">
                        {problem.problem_id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((participant, index) => (
                    <tr
                      key={participant.user_id}
                      className={`border-t border-gray-700 hover:bg-gray-800 ${
                        participant.user_id === user?.uid ? "bg-gray-700" : ""
                      }`}
                    >
                      <td className="p-4">{index + 1}</td>
                      <td className="p-4">{participant.username}</td>
                      <td className="p-4 text-center font-bold">
                        {participant.total_score}
                      </td>
                      {contest.problems?.map((problem) => (
                        <td
                          key={problem.problem_id}
                          className="p-4 text-center"
                        >
                          <span
                            className={`px-2 py-1 rounded ${
                              participant.solved_problems.includes(problem.problem_id)
                                ? "bg-green-600"
                                : participant.attempted_problems.includes(problem.problem_id)
                                ? "bg-red-600"
                                : ""
                            }`}
                          >
                            {participant.solved_problems.includes(problem.problem_id)
                              ? "✓"
                              : participant.attempted_problems.includes(problem.problem_id)
                              ? "✗"
                              : "-"}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default StandingsPage;