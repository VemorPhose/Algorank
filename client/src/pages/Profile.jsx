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
      <div className="flex flex-col min-h-screen bg-background text-foreground">
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

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-background">
          <Card className="bg-card border border-border dark:border-[#27272a] max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-card-foreground">
                Forgot to Log In?
              </CardTitle>
              <CardContent className="text-muted-foreground">
                Log in to view your AlgoRank profile and stats.
              </CardContent>
            </CardHeader>
            <CardFooter>
              <Button
                onClick={() => navigate("/login")}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
              >
                Go to Login
              </Button>
            </CardFooter>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 bg-background py-8 px-2 md:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={user.photoURL}
                  alt={user.displayName || user.email}
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {user.displayName
                    ? user.displayName.charAt(0).toUpperCase()
                    : user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {user.displayName || user.email}
                </h1>
                <p className="text-muted-foreground">
                  Member since{" "}
                  {new Date(user.metadata.creationTime).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card border border-border dark:border-[#27272a]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Problems Solved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">
                  {stats.problemsSolved}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border border-border dark:border-[#27272a]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Rank
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">
                  {stats.rank}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border border-border dark:border-[#27272a]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">
                  {stats.points}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border border-border dark:border-[#27272a]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Day Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">
                  {stats.streak}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="activity" className="w-full mt-6">
            <TabsList className="bg-card">
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
              <TabsTrigger value="contests">Contest History</TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <div className="text-muted-foreground">
                Recent activity coming soon.
              </div>
            </TabsContent>

            <TabsContent value="submissions">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Problem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Example row, replace with actual data if available */}
                  <TableRow>
                    <TableCell>Two Sum</TableCell>
                    <TableCell className="text-green-500">Accepted</TableCell>
                    <TableCell>Python</TableCell>
                    <TableCell>2025-03-12</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="contests">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contest</TableHead>
                    <TableHead>Rank</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Example row, replace with actual data if available */}
                  <TableRow>
                    <TableCell>Weekly Challenge #41</TableCell>
                    <TableCell>56</TableCell>
                    <TableCell>1850</TableCell>
                    <TableCell>2025-03-08</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Profile;
