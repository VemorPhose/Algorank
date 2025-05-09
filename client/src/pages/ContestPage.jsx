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
        <main className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center py-10 text-muted-foreground">
            Loading...
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center py-10 text-red-500">{error}</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-background py-8 px-2 md:px-8">
        {contest && canAccessContest() ? (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">{contest.title}</h1>
                <p className="text-muted-foreground">{contest.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="outline" className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Your Score: {userScore}
                </Button>
                <Button
                  variant={notificationsEnabled ? "default" : "outline"}
                  className="flex items-center gap-2"
                  onClick={handleNotificationsToggle}
                >
                  {notificationsEnabled ? (
                    <Bell className="h-5 w-5" />
                  ) : (
                    <BellOff className="h-5 w-5" />
                  )}
                  {notificationsEnabled
                    ? "Notifications On"
                    : "Notifications Off"}
                </Button>
              </div>
            </div>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full mt-6"
            >
              <TabsList>
                <TabsTrigger value="problems">Problems</TabsTrigger>
                <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                <TabsTrigger value="rules">Rules</TabsTrigger>
              </TabsList>
              <TabsContent value="problems">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Problems</CardTitle>
                    <CardDescription>Problems for this contest</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Difficulty</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Solved</TableHead>
                          <TableHead>Submission Rate</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {problems.map((problem) => (
                          <TableRow key={problem.id}>
                            <TableCell>{problem.title}</TableCell>
                            <TableCell>
                              <Badge
                                className={getDifficultyColor(
                                  problem.difficulty
                                )}
                              >
                                {problem.difficulty}
                              </Badge>
                            </TableCell>
                            <TableCell>{problem.points}</TableCell>
                            <TableCell>{problem.solvedCount}</TableCell>
                            <TableCell>{problem.submissionRate}%</TableCell>
                            <TableCell>
                              <Button variant="outline" asChild>
                                <Link
                                  to={`/problems/${problem.id}?contestId=${contestId}`}
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
              <TabsContent value="leaderboard">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Leaderboard</CardTitle>
                    <CardDescription>Top participants</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Solved</TableHead>
                            <TableHead>Total Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Example row, replace with actual data if available */}
                          <TableRow>
                            <TableCell>1</TableCell>
                            <TableCell>codemaster</TableCell>
                            <TableCell>1100</TableCell>
                            <TableCell>5</TableCell>
                            <TableCell>1h 23m</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="rules">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Contest Rules</CardTitle>
                    <CardDescription>
                      Read the rules before participating
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                      {/* Example rules, replace with actual data if available */}
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
            </Tabs>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Contest Not Started</CardTitle>
                <CardDescription>
                  The contest has not started yet. Please check back later.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default ContestPage;
