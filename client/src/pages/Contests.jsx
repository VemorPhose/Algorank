import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import Header from "../components/Header";
import Footer from "../components/Footer";

function Contests() {
  const [user] = useAuthState(auth);
  const [contests, setContests] = useState({
    active: [],
    upcoming: [],
    past: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [registeredContests, setRegisteredContests] = useState(new Set());

  // Move updateContestStatus inside useCallback
  const updateContestStatus = useCallback((contest) => {
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(contest.end_time);

    if (now < startTime) {
      return "upcoming";
    } else if (now >= startTime && now <= endTime) {
      return "active";
    } else {
      return "ended";
    }
  }, []);

  // Move fetchContests definition outside useEffect and wrap in useCallback
  const fetchContests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `http://localhost:5000/api/contests${user ? `?userId=${user.uid}` : ""}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch contests");
      }

      const data = await response.json();
      const categorizedContests = {
        active: [],
        upcoming: [],
        past: [],
      };

      // Create Set of registered contest IDs
      const registered = new Set(
        data
          .filter((contest) => contest.is_registered)
          .map((contest) => contest.contest_id)
      );
      setRegisteredContests(registered);

      data.forEach((contest) => {
        const status = updateContestStatus(contest);
        // Map 'ended' status to 'past' category
        const category = status === 'ended' ? 'past' : status;
        if (categorizedContests[category]) {
          categorizedContests[category].push(contest);
        } else {
          console.warn(`Unknown contest status: ${status}`);
        }
      });

      // Sort active and upcoming normally (ascending)
      ['active', 'upcoming'].forEach((category) => {
        categorizedContests[category].sort(
          (a, b) => new Date(a.start_time) - new Date(b.start_time)
        );
      });

      // Sort past contests in reverse (descending)
      categorizedContests.past.sort(
        (a, b) => new Date(b.start_time) - new Date(a.start_time)
      );

      setContests(categorizedContests);
    } catch (err) {
      console.error("Error fetching contests:", err);
      setError("Failed to load contests. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [updateContestStatus, user]); // Add user to dependency array

  // Simplified useEffect
  useEffect(() => {
    fetchContests();
  }, [fetchContests, user]); // Add user to dependency array

  const handleRegistration = async (contestId) => {
    if (!user) {
      alert("Please login to register for contests");
      return;
    }

    try {
      setRegistering(true);
      const response = await fetch(
        `http://localhost:5000/api/contests/${contestId}/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: user.uid }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to register");
      }

      alert("Successfully registered for the contest!");
      fetchContests(); // Refresh contests data
    } catch (error) {
      alert(error.message);
    } finally {
      setRegistering(false);
    }
  };

  const canRegister = (startTime) => {
    const now = new Date();
    const start = new Date(startTime);
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
    return start - now <= twoDaysInMs;
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "long" });
    const year = date.getFullYear();

    return `${hours}:${minutes}, ${day} ${month} ${year}`;
  };

  const getTimeRemaining = (startTime) => {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start - now;

    if (diff <= 0) return "Started";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen my-0">
        <Header />
        <main
          className="flex-1 text-white"
          style={{ backgroundColor: "#1D2125" }}
        >
          <div className="text-center py-10">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  // Display error if present
  if (error) {
    return (
      <div className="flex flex-col min-h-screen my-0">
        <Header />
        <main
          className="flex-1 text-white"
          style={{ backgroundColor: "#1D2125" }}
        >
          <div className="text-center py-10 text-red-500">{error}</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen my-0">
      <Header />
      <main className="flex-1 p-8" style={{ backgroundColor: "#1D2125" }}>
        {/* Active Contests */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            Active Contests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contests.active.length > 0 ? (
              contests.active.map((contest) => (
                <div
                  key={contest.contest_id}
                  className="bg-gray-800 rounded-lg p-6 text-white shadow-lg"
                >
                  <h3 className="text-xl font-bold mb-2">{contest.title}</h3>
                  <p className="text-gray-300 mb-4">{contest.description}</p>
                  <div className="text-sm text-gray-400">
                    <p>Contest ID: {contest.contest_id}</p>
                    <p>Started: {formatDateTime(contest.start_time)}</p>
                    <p>Ends: {formatDateTime(contest.end_time)}</p>
                  </div>
                  {registeredContests.has(contest.contest_id) ? (
                    <Link
                      to={`/contest/${contest.contest_id}`}
                      className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Join Now
                    </Link>
                  ) : (
                    <button
                      className="mt-4 px-4 py-2 text-white rounded bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleRegistration(contest.contest_id)}
                      disabled={registering}
                    >
                      {registering ? "Registering..." : "Register to Join"}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-400">
                No active contests at the moment
              </div>
            )}
          </div>
        </section>

        {/* Upcoming Contests */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            Upcoming Contests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contests.upcoming.length > 0 ? (
              contests.upcoming.map((contest) => (
                <div
                  key={contest.contest_id}
                  className="bg-gray-800 rounded-lg p-6 text-white shadow-lg"
                >
                  <h3 className="text-xl font-bold mb-2">{contest.title}</h3>
                  <p className="text-gray-300 mb-4">{contest.description}</p>
                  <div className="text-sm text-gray-400">
                    <p>Contest ID: {contest.contest_id}</p>
                    <p>Starts in: {getTimeRemaining(contest.start_time)}</p>
                    <p>Start: {formatDateTime(contest.start_time)}</p>
                    <p>
                      Duration:{" "}
                      {(new Date(contest.end_time) -
                        new Date(contest.start_time)) /
                        (1000 * 60 * 60)}
                      h
                    </p>
                  </div>
                  <button
                    className={`mt-4 px-4 py-2 text-white rounded ${
                      registeredContests.has(contest.contest_id)
                        ? "bg-gray-600 cursor-not-allowed"
                        : canRegister(contest.start_time)
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-600 cursor-not-allowed"
                    }`}
                    onClick={() => {
                      if (
                        !registeredContests.has(contest.contest_id) &&
                        canRegister(contest.start_time)
                      ) {
                        handleRegistration(contest.contest_id);
                      }
                    }}
                    disabled={
                      registering || registeredContests.has(contest.contest_id)
                    }
                  >
                    {registering
                      ? "Registering..."
                      : registeredContests.has(contest.contest_id)
                      ? "Registered"
                      : "Register"}
                  </button>
                </div>
              ))
            ) : (
              <div className="text-gray-400">
                No upcoming contests scheduled
              </div>
            )}
          </div>
        </section>

        {/* Past Contests Table */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Past Contests</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-white border-collapse">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-4 text-left">ID</th>
                  <th className="p-4 text-left">Contest Name</th>
                  <th className="p-4 text-left">Start Time</th>
                  <th className="p-4 text-left">Duration</th>
                  <th className="p-4 text-left">Participants</th>
                  <th className="p-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contests.past.length > 0 ? (
                  contests.past.map((contest) => (
                    <tr
                      key={contest.contest_id}
                      className="border-t border-gray-700 hover:bg-gray-800"
                    >
                      <td className="p-4">{contest.contest_id}</td>
                      <td className="p-4">{contest.title}</td>
                      <td className="p-4">
                        {formatDateTime(contest.start_time)}
                      </td>
                      <td className="p-4">
                        {(new Date(contest.end_time) -
                          new Date(contest.start_time)) /
                          (1000 * 60 * 60)}
                        h
                      </td>
                      <td className="p-4">{contest.participant_count || 0}</td>
                      <td className="p-4">
                        <Link
                          to={`/contest/${contest.contest_id}/standings`}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          View Standings
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-gray-700">
                    <td colSpan="6" className="p-4 text-center text-gray-400">
                      No past contests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default Contests;
