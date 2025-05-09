import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Trophy,
  Users,
  Info,
  FileText,
  ListOrdered,
  MessageSquare,
  ExternalLink,
  Award,
  Share2,
  Bell,
  BellOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Helper function to format date
function formatDate(dateString) {
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(dateString).toLocaleDateString("en-US", options);
}

// Helper function to get difficulty color
function getDifficultyColor(difficulty) {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return "bg-green-500";
    case "medium":
      return "bg-yellow-500";
    case "hard":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

// Helper function to get status badge color
function getStatusBadgeColor(status) {
  switch (status) {
    case "solved":
      return "bg-green-500";
    case "attempted":
      return "bg-yellow-500";
    default:
      return "bg-gray-500";
  }
}

function ContestPage() {
  const { contestId } = useParams();
  const [user] = useAuthState(auth);
  const [contest, setContest] = useState(null);
  const [problems, setProblems] = useState([]);
  const [userScore, setUserScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("problems");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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

        if (!response.ok) {
          throw new Error("Failed to fetch contest details");
        }

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

  const handleNotificationsToggle = () => {
    setNotificationsEnabled(!notificationsEnabled);
    // Add notification toggle logic here
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8" style={{ backgroundColor: "#1D2125" }}>
          <div className="text-center py-10 text-white">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8" style={{ backgroundColor: "#1D2125" }}>
          <div className="text-center py-10 text-red-500">{error}</div>
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
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-white">
                  {contest.title}
                </h1>
                <p className="text-gray-400">{contest.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  className="text-white border-gray-600 hover:bg-gray-700"
                  onClick={handleNotificationsToggle}
                >
                  {notificationsEnabled ? (
                    <>
                      <BellOff className="h-4 w-4 mr-2" />
                      Disable Notifications
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Enable Notifications
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="text-white border-gray-600 hover:bg-gray-700"
                  asChild
                >
                  <Link to={`/contest/${contestId}/standings`}>
                    <Trophy className="h-4 w-4 mr-2" />
                    View Standings
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Time Remaining
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {getTimeRemaining()}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Your Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {userScore}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Problems
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {problems.length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Participants
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {contest.participants || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="problems" className="space-y-4">
              <TabsList className="bg-gray-800">
                <TabsTrigger value="problems" className="text-white">
                  Problems
                </TabsTrigger>
                <TabsTrigger value="rules" className="text-white">
                  Rules
                </TabsTrigger>
                <TabsTrigger value="prizes" className="text-white">
                  Prizes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="problems" className="space-y-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Problems</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700">
                          <TableHead className="text-gray-400">Code</TableHead>
                          <TableHead className="text-gray-400">
                            Problem
                          </TableHead>
                          <TableHead className="text-gray-400">
                            Difficulty
                          </TableHead>
                          <TableHead className="text-gray-400">
                            Points
                          </TableHead>
                          <TableHead className="text-gray-400">
                            Solved By
                          </TableHead>
                          <TableHead className="text-gray-400">
                            Status
                          </TableHead>
                          <TableHead className="text-gray-400">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {problems.map((problem) => (
                          <TableRow
                            key={problem.problem_id}
                            className="border-gray-700"
                          >
                            <TableCell className="text-white">
                              {problem.problem_id}
                            </TableCell>
                            <TableCell className="text-white">
                              {problem.title}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={getDifficultyColor(
                                  problem.difficulty
                                )}
                              >
                                {problem.difficulty}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white">
                              {problem.points}
                            </TableCell>
                            <TableCell className="text-white">
                              {problem.solved_count || 0}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={getStatusBadgeColor(
                                  problem.is_solved ? "solved" : "unsolved"
                                )}
                              >
                                {problem.is_solved ? "Solved" : "Unsolved"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                className="text-white border-gray-600 hover:bg-gray-700"
                                asChild
                              >
                                <Link
                                  to={`/problem/${problem.problem_id}?contestId=${contestId}`}
                                >
                                  Solve
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rules" className="space-y-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Contest Rules</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-2 text-gray-400">
                      <li>You must solve the problems independently.</li>
                      <li>
                        External resources like documentation are allowed, but
                        not solutions to similar problems.
                      </li>
                      <li>
                        You can submit solutions multiple times, but only the
                        last submission for each problem counts.
                      </li>
                      <li>Plagiarism will result in disqualification.</li>
                      <li>
                        The contest will end exactly at the specified end time,
                        regardless of when you started.
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prizes" className="space-y-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Prizes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-2 text-gray-400">
                      <li>Top 3 participants will receive special badges</li>
                      <li>
                        All participants will earn points based on their
                        performance
                      </li>
                      <li>
                        Additional prizes may be announced during the contest
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
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
