import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";

function ContestPage() {
  const { contestId } = useParams();
  const [user] = useAuthState(auth);
  const [contest, setContest] = useState(null);
  const [problems, setProblems] = useState([]);
  const [userScore, setUserScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const canAccessContest = useCallback(() => {
    if (!contest) return false;
    const now = new Date();
    const startTime = new Date(contest.start_time);
    return now >= startTime;
  }, [contest]);

  useEffect(() => {
    const fetchContestDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:5000/api/contests/${contestId}/details${
            user ? `?userId=${user.uid}` : ""
          }`
        );
        if (!response.ok) throw new Error("Failed to fetch contest details");
        const data = await response.json();
        
        // Check if contest access is allowed
        const now = new Date();
        const startTime = new Date(data.contest.start_time);
        if (now < startTime) {
          throw new Error("Contest has not started yet");
        }

        setContest(data.contest);
        setProblems(data.problems);
        setUserScore(data.userScore || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContestDetails();
  }, [contestId, user]);

  const getTimeRemaining = () => {
    if (!contest) return "";
    const now = new Date();
    const end = new Date(contest.end_time);
    const diff = end - now;

    if (diff <= 0) return "Contest Ended";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1" style={{ backgroundColor: "#1D2125" }}>
          <div className="text-white text-center py-10">Loading...</div>
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
        {contest && canAccessContest() ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-4">
                {contest.title}
              </h1>
              <div className="text-gray-300 mb-2">{contest.description}</div>
              <div className="flex justify-between items-center">
                <div className="text-gray-400">
                  Time Remaining: {getTimeRemaining()}
                </div>
                <div className="text-green-400">Your Score: {userScore}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="p-4 text-left">Code</th>
                    <th className="p-4 text-left">Problem</th>
                    <th className="p-4 text-left">Difficulty</th>
                    <th className="p-4 text-left">Points</th>
                    <th className="p-4 text-left">Solved By</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {problems.map((problem) => (
                    <tr
                      key={problem.problem_id}
                      className="border-t border-gray-700 hover:bg-gray-800"
                    >
                      <td className="p-4">{problem.problem_id}</td>
                      <td className="p-4">{problem.title}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            problem.difficulty === "Easy"
                              ? "bg-green-600"
                              : problem.difficulty === "Medium"
                              ? "bg-yellow-600"
                              : "bg-red-600"
                          }`}
                        >
                          {problem.difficulty}
                        </span>
                      </td>
                      <td className="p-4">{problem.points}</td>
                      <td className="p-4">{problem.solved_count || 0}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            problem.is_solved ? "bg-green-600" : "bg-gray-600"
                          }`}
                        >
                          {problem.is_solved ? "Solved" : "Unsolved"}
                        </span>
                      </td>
                      <td className="p-4">
                        <Link
                          to={`/problem/${problem.problem_id}`}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Solve
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-10 text-red-500">
            Contest is not accessible yet. Please wait until the start time.
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default ContestPage;