import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
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
import { Input } from "../components/ui/input";
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Users,
  Trophy,
  Award,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

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

// Helper function to calculate time remaining
function getTimeRemaining(endDate) {
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();
  const distance = end - now;

  if (distance < 0) {
    return "Ended";
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

// Helper function to get contest status
function getContestStatus(startDate, endDate) {
  const now = new Date().getTime();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  if (now < start) {
    return "upcoming";
  } else if (now >= start && now <= end) {
    return "ongoing";
  } else {
    return "completed";
  }
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortOption, setSortOption] = useState("date-asc");

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
        const category = status === "ended" ? "past" : status;
        if (categorizedContests[category]) {
          categorizedContests[category].push(contest);
        } else {
          console.warn(`Unknown contest status: ${status}`);
        }
      });

      // Sort active and upcoming normally (ascending)
      ["active", "upcoming"].forEach((category) => {
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
  }, [updateContestStatus, user]);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

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

  const getBadgeColor = (status) => {
    switch (status) {
      case "ongoing":
        return "bg-green-500";
      case "upcoming":
        return "bg-blue-500";
      case "completed":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getDifficultyColor = (difficulty) => {
    if (!difficulty || typeof difficulty !== "string") return "bg-gray-500";
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-500 hover:bg-green-600";
      case "medium":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "hard":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen my-0">
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
      <div className="flex flex-col min-h-screen my-0">
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
      <main className="flex-1 bg-background py-8 px-2 md:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Contests</h1>
              <p className="text-muted-foreground">
                Participate in coding contests and improve your skills
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search contests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background border-border text-foreground"
                />
              </div>
            </div>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList className="bg-card">
              <TabsTrigger value="all">All Contests</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-4">
              {Object.entries(contests).map(([category, categoryContests]) => (
                <div key={category} className="space-y-4">
                  <h2 className="text-xl font-semibold capitalize">
                    {category} Contests
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categoryContests.map((contest) => (
                      <Card
                        key={contest.contest_id}
                        className="bg-card border-border"
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <Badge
                              className={getBadgeColor(
                                updateContestStatus(contest)
                              )}
                            >
                              {updateContestStatus(contest)}
                            </Badge>
                            <Badge
                              className={getDifficultyColor(contest.difficulty)}
                            >
                              {contest.difficulty}
                            </Badge>
                          </div>
                          <CardTitle className="mt-2">
                            {contest.title}
                          </CardTitle>
                          <CardDescription>
                            {contest.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(contest.start_time)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{getTimeRemaining(contest.end_time)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>
                                {contest.participants || 0} participants
                              </span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                          <Button variant="outline" asChild>
                            <Link to={`/contest/${contest.contest_id}`}>
                              View Details
                            </Link>
                          </Button>
                          {!registeredContests.has(contest.contest_id) &&
                            canRegister(contest.start_time) && (
                              <Button
                                onClick={() =>
                                  handleRegistration(contest.contest_id)
                                }
                                disabled={registering}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Register
                              </Button>
                            )}
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
            {["active", "upcoming", "past"].map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {contests[tab === "past" ? "past" : tab].map((contest) => (
                    <Card
                      key={contest.contest_id}
                      className="bg-card border-border"
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <Badge
                            className={getBadgeColor(
                              updateContestStatus(contest)
                            )}
                          >
                            {updateContestStatus(contest)}
                          </Badge>
                          <Badge
                            className={getDifficultyColor(contest.difficulty)}
                          >
                            {contest.difficulty}
                          </Badge>
                        </div>
                        <CardTitle className="mt-2">{contest.title}</CardTitle>
                        <CardDescription>{contest.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(contest.start_time)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{getTimeRemaining(contest.end_time)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>
                              {contest.participants || 0} participants
                            </span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" asChild>
                          <Link to={`/contest/${contest.contest_id}`}>
                            View Details
                          </Link>
                        </Button>
                        {!registeredContests.has(contest.contest_id) &&
                          canRegister(contest.start_time) && (
                            <Button
                              onClick={() =>
                                handleRegistration(contest.contest_id)
                              }
                              disabled={registering}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Register
                            </Button>
                          )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Contests;
