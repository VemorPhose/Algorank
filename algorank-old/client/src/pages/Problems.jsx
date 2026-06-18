import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "../components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../components/ui/pagination";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Search, Filter, XIcon } from "lucide-react";
import { motion } from "framer-motion";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

// Helper function to get badge color based on difficulty
function getDifficultyColor(difficulty) {
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
}

// Helper function to get status color
function getStatusColor(status) {
  switch (status) {
    case "solved":
      return "text-green-500";
    case "attempted":
      return "text-yellow-500";
    case "unsolved":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

function Problems() {
  const [problems, setProblems] = useState([]);
  const [filteredProblems, setFilteredProblems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [sortOption, setSortOption] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [problemsPerPage, setProblemsPerPage] = useState(5);
  const [loading, setLoading] = useState(true);
  const [user] = useAuthState(auth);

  // Fetch problems from API on mount
  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/problems${
            user ? `?userId=${user.uid}` : ""
          }`
        );
        const data = await response.json();
        // Normalize problems for frontend
        const normalized = data.map((p) => ({
          id: p.problem_id || p.id,
          title: p.title,
          description: p.description || "",
          difficulty: p.difficulty || "easy",
          tags: Array.isArray(p.tags) ? p.tags : [],
          solvedCount: typeof p.solved_count === "number" ? p.solved_count : 0,
          submissionRate:
            typeof p.submission_rate === "number" ? p.submission_rate : 0,
          status: p.is_solved ? "solved" : "unsolved",
        }));
        setProblems(normalized);
        setFilteredProblems(normalized);
      } catch (error) {
        console.error("Error fetching problems:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, [user]);

  // Get all unique tags for filter
  const allTags = Array.from(
    new Set(
      problems.flatMap((problem) =>
        Array.isArray(problem.tags) ? problem.tags : []
      )
    )
  );

  // Apply filters and sorting
  useEffect(() => {
    let result = [...problems];

    // Filter by tab (difficulty)
    if (activeTab !== "all") {
      result = result.filter((problem) => problem.difficulty === activeTab);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (problem) =>
          problem.title.toLowerCase().includes(query) ||
          problem.description.toLowerCase().includes(query) ||
          problem.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      result = result.filter((problem) =>
        problem.tags.some((tag) => selectedTags.includes(tag))
      );
    }

    // Filter by status
    if (selectedStatuses.length > 0) {
      result = result.filter((problem) =>
        selectedStatuses.includes(problem.status)
      );
    }

    // Apply sorting
    result = sortProblems(result, sortOption);

    setFilteredProblems(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [
    problems,
    activeTab,
    searchQuery,
    selectedTags,
    selectedStatuses,
    sortOption,
  ]);

  // Sort problems based on selected option
  const sortProblems = (problemsToSort, option) => {
    switch (option) {
      case "newest":
        return [...problemsToSort].sort(
          (a, b) =>
            new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
        );
      case "oldest":
        return [...problemsToSort].sort(
          (a, b) =>
            new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime()
        );
      case "most-solved":
        return [...problemsToSort].sort(
          (a, b) => b.solvedCount - a.solvedCount
        );
      case "least-solved":
        return [...problemsToSort].sort(
          (a, b) => a.solvedCount - b.solvedCount
        );
      case "highest-acceptance":
        return [...problemsToSort].sort(
          (a, b) => b.submissionRate - a.submissionRate
        );
      case "lowest-acceptance":
        return [...problemsToSort].sort(
          (a, b) => a.submissionRate - b.submissionRate
        );
      default:
        return problemsToSort;
    }
  };

  // Toggle tag filter
  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Toggle status filter
  const toggleStatus = (status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedStatuses([]);
    setSearchQuery("");
  };

  // Pagination logic
  const indexOfLastProblem = currentPage * problemsPerPage;
  const indexOfFirstProblem = indexOfLastProblem - problemsPerPage;
  const currentProblems = filteredProblems.slice(
    indexOfFirstProblem,
    indexOfLastProblem
  );
  const totalPages = Math.ceil(filteredProblems.length / problemsPerPage);

  // Generate page numbers for pagination
  const pageNumbers = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    if (currentPage <= 3) {
      pageNumbers.push(1, 2, 3, 4, 5);
    } else if (currentPage >= totalPages - 2) {
      pageNumbers.push(
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    } else {
      pageNumbers.push(
        currentPage - 2,
        currentPage - 1,
        currentPage,
        currentPage + 1,
        currentPage + 2
      );
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">
          <div className="text-center py-10">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 py-8 px-2 md:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-3xl font-sans tracking-tight">Problems</h1>
              <div className="flex flex-wrap items-center gap-2">
                {/* Problems per page selector */}
                <Select
                  value={problemsPerPage.toString()}
                  onValueChange={(v) => {
                    setProblemsPerPage(Number(v));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue>{problemsPerPage} / page</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 / page</SelectItem>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-grow max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="    Search problems..."
                    className="w-full rounded-md pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Filter className="h-4 w-4" />
                      Filter
                      {(selectedTags.length > 0 ||
                        selectedStatuses.length > 0) && (
                        <Badge
                          variant="secondary"
                          className="ml-1 rounded-full px-1 text-xs"
                        >
                          {selectedTags.length + selectedStatuses.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Filter Problems</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      Status
                    </DropdownMenuLabel>
                    <DropdownMenuCheckboxItem
                      checked={selectedStatuses.includes("solved")}
                      onCheckedChange={() => toggleStatus("solved")}
                    >
                      Solved
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={selectedStatuses.includes("attempted")}
                      onCheckedChange={() => toggleStatus("attempted")}
                    >
                      Attempted
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={selectedStatuses.includes("unsolved")}
                      onCheckedChange={() => toggleStatus("unsolved")}
                    >
                      Unsolved
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      Tags
                    </DropdownMenuLabel>
                    {allTags.map((tag) => (
                      <DropdownMenuCheckboxItem
                        key={tag}
                        checked={selectedTags.includes(tag)}
                        onCheckedChange={() => toggleTag(tag)}
                      >
                        {tag}
                      </DropdownMenuCheckboxItem>
                    ))}

                    {(selectedTags.length > 0 ||
                      selectedStatuses.length > 0) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={clearFilters}
                          className="text-red-500"
                        >
                          Clear Filters
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Difficulty Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="easy">Easy</TabsTrigger>
                <TabsTrigger value="medium">Medium</TabsTrigger>
                <TabsTrigger value="hard">Hard</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Problems Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {currentProblems.map((problem) => (
                <Link key={problem.id} to={`/problem/${problem.id}`}>
                  <Card className="h-full hover:bg-muted/50 transition-colors bg-card border border-border text-card-foreground">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="line-clamp-1 text-card-foreground">
                          {problem.title}
                        </CardTitle>
                        <Badge
                          className={getDifficultyColor(problem.difficulty)}
                        >
                          {problem.difficulty}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2 text-muted-foreground">
                        {problem.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {problem.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between text-sm text-muted-foreground">
                      <div>Solved: {problem.solvedCount}</div>
                      <div className={getStatusColor(problem.status)}>
                        {problem.status === "solved"
                          ? "✓ Solved"
                          : problem.status === "attempted"
                          ? "Attempted"
                          : "Unsolved"}
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>
                  {pageNumbers.map((number) => (
                    <PaginationItem key={number}>
                      <PaginationLink
                        onClick={() => setCurrentPage(number)}
                        isActive={currentPage === number}
                      >
                        {number}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  {currentPage < totalPages - 2 && <PaginationEllipsis />}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Problems;
