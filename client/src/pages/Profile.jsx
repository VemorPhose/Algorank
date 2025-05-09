import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
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
import { CheckCircle, Edit, Github, Globe, Twitter, User } from "lucide-react";

function Profile() {
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    problemsSolved: 0,
    rank: "Beginner",
    points: 0,
    streak: 0,
    rating: 0,
    contestsParticipated: 0,
    submissionsCount: 0,
    acceptanceRate: 0,
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
        streak: 7,
        rating: 1856,
        contestsParticipated: 24,
        submissionsCount: 412,
        acceptanceRate: 68,
      });
    }
  }, [user]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Accepted":
        return "text-green-500";
      case "Wrong Answer":
        return "text-red-500";
      case "Time Limit Exceeded":
        return "text-yellow-500";
      default:
        return "text-gray-500";
    }
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

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8" style={{ backgroundColor: "#1D2125" }}>
          <div className="flex items-center justify-center w-full">
            <Card className="bg-gray-800 border-gray-700 max-w-md">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">
                  Forgot to Log In?
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Log in to view your AlgoRank profile and stats.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Go to Login
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-8" style={{ backgroundColor: "#1D2125" }}>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={user.photoURL}
                  alt={user.displayName || user.email}
                />
                <AvatarFallback className="bg-blue-600 text-white text-2xl">
                  {user.displayName
                    ? user.displayName.charAt(0).toUpperCase()
                    : user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-white">
                  {user.displayName || user.email}
                </h1>
                <p className="text-gray-400">
                  Member since{" "}
                  {new Date(user.metadata.creationTime).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Problems Solved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stats.problemsSolved}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Current Rank
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stats.rank}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Total Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stats.points}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Day Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stats.streak}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="activity" className="space-y-4">
            <TabsList className="bg-gray-800">
              <TabsTrigger value="activity" className="text-white">
                Recent Activity
              </TabsTrigger>
              <TabsTrigger value="submissions" className="text-white">
                Submissions
              </TabsTrigger>
              <TabsTrigger value="contests" className="text-white">
                Contests
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="space-y-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-400 text-center">
                    No recent activity to show
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="submissions" className="space-y-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">
                    Recent Submissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-400">Problem</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">
                          Language
                        </TableHead>
                        <TableHead className="text-gray-400">Runtime</TableHead>
                        <TableHead className="text-gray-400">Memory</TableHead>
                        <TableHead className="text-gray-400">
                          Submitted
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-gray-700">
                        <TableCell
                          className="text-gray-400 text-center"
                          colSpan={6}
                        >
                          No submissions yet
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contests" className="space-y-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Contest History</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-400">Contest</TableHead>
                        <TableHead className="text-gray-400">Rank</TableHead>
                        <TableHead className="text-gray-400">Score</TableHead>
                        <TableHead className="text-gray-400">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-gray-700">
                        <TableCell
                          className="text-gray-400 text-center"
                          colSpan={4}
                        >
                          No contest history yet
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Profile;
