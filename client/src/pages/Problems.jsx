import { useState, useEffect } from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { Link } from "react-router-dom";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

function Problems() {
  const [problems, setProblems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [user] = useAuthState(auth);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/problems${user ? `?userId=${user.uid}` : ''}`);
        const data = await response.json();
        setProblems(data);
      } catch (error) {
        console.error('Error fetching problems:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, [user]);

  const filteredProblems = problems.filter(
    (problem) =>
      problem.problem_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      problem.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen my-0">
        <Header />
        <main className="flex-1" style={{ backgroundColor: "#1D2125" }}>
          <div className="text-white text-center py-10">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen my-0">
      <Header />
      <main
        className="flex-1"
        style={{
          padding: "20px",
          textAlign: "center",
          backgroundColor: "#1D2125",
        }}
      >
        <h1
          className="text-white"
          style={{ textAlign: "center", marginBottom: "30px" }}
        >
          Problems
        </h1>
        <input
          type="text"
          placeholder="Search by Code or Name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-control mb-4 mx-auto"
          style={{ width: "50%" }}
        />
        <table
          className="table table-bordered table-striped table-hover"
          style={{
            margin: "auto",
            borderRadius: "8px",
            overflow: "hidden",
            width: "65%",
          }}
        >
          <thead>
            <tr>
              <th style={{ width: "20%", textAlign: "center" }}>Code</th>
              <th style={{ width: "40%", textAlign: "center" }}>Name</th>
              <th style={{ width: "15%", textAlign: "center" }}>Difficulty</th>
              <th style={{ width: "15%", textAlign: "center" }}>Solved </th>
              <th style={{ width: "10%", textAlign: "center" }}>Status </th>
            </tr>
          </thead>
          <tbody>
            {filteredProblems.map((problem) => (
              <tr key={problem.problem_id}>
                <td style={{ textAlign: "center" }}>{problem.problem_id}</td>
                <td style={{ textAlign: "center" }}>
                  <Link
                    to={`/problem/${problem.problem_id}`}
                    style={{ color: "#4da6ff" }}
                  >
                    {problem.title}
                  </Link>
                </td>
                <td style={{ textAlign: "center" }}>{problem.difficulty}</td>
                <td style={{ textAlign: "center" }}>{problem.solved_count}</td>
                <td style={{ textAlign: "center", color: "black" }}>
                  {problem.is_solved ? "✓" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
      <Footer />
    </div>
  );
}

export default Problems;
