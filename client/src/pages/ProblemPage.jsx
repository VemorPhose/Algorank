import { useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { indentUnit } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { ChevronLeft, Code, CheckCircle2, XCircle } from "lucide-react";

function getDifficultyColor(difficulty) {
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
}

function ProblemPage() {
  const { problemId } = useParams();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [content, setContent] = useState("Loading...");
  const [codeState, setCodeState] = useState({
    cpp: "",
    python: "",
    java: "",
  });
  const [language, setLanguage] = useState("cpp");
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [boilerplatesLoaded, setBoilerplatesLoaded] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Language config
  const getLanguageConfig = () => {
    switch (language) {
      case "python":
        return [python(), EditorState.tabSize.of(4), indentUnit.of("    ")];
      case "java":
        return [java(), EditorState.tabSize.of(4), indentUnit.of("\t")];
      case "cpp":
      default:
        return [cpp(), EditorState.tabSize.of(4), indentUnit.of("\t")];
    }
  };

  // Load boilerplates
  useEffect(() => {
    const loadBoilerplates = async () => {
      try {
        const boilerplates = await Promise.all([
          fetch("/src/boilerplates/boilerplate.cpp").then((res) => res.text()),
          fetch("/src/boilerplates/boilerplate.py").then((res) => res.text()),
          fetch("/src/boilerplates/boilerplate.java").then((res) => res.text()),
        ]);

        setCodeState({
          cpp: boilerplates[0],
          python: boilerplates[1],
          java: boilerplates[2],
        });
        setBoilerplatesLoaded(true);
      } catch {
        setCodeState({
          cpp: "// C++ code here...",
          python: "# Python code here...",
          java: "// Java code here...",
        });
      }
    };

    loadBoilerplates();
  }, []);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/problems/${problemId}`
        );
        if (!response.ok) throw new Error("Problem not found");
        const data = await response.json();
        setContent(data.description);
      } catch {
        setContent("Problem not found.");
      }
    };

    fetchProblem();
  }, [problemId]);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
  };

  const handleCodeChange = (value) => {
    setCodeState((prev) => ({
      ...prev,
      [language]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!user) {
      alert("Please sign in to submit your solution");
      return;
    }

    const contestId = searchParams.get("contestId");

    const submissionData = {
      problemId,
      userId: user.uid,
      submissionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      code: codeState[language],
      language,
      contestId,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("http://localhost:5000/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Submission failed");
      }

      const result = await response.json();
      setSubmissionStatus(result.status);
      setTestResults(result.testCases || []);
    } catch (error) {
      alert(error.message || "Failed to submit code");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!boilerplatesLoaded) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-background">
          <Skeleton className="w-full max-w-4xl h-96" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-background py-8 px-2 md:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Problem</h1>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            {/* Problem Description Card */}
            <Card className="bg-card border border-border rounded-lg shadow-sm flex flex-col">
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b">
                <div>
                  <CardTitle className="text-xl md:text-2xl font-bold">
                    {problemId}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Solve the problem below
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor("easy")}>Easy</Badge>
                  {/* Replace with actual difficulty if available */}
                  <Badge variant="outline">#DynamicProgramming</Badge>
                  {/* Replace with actual tags if available */}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6">
                <Tabs defaultValue="description" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="solution">Solution</TabsTrigger>
                    <TabsTrigger value="discussion">Discussion</TabsTrigger>
                  </TabsList>
                  <TabsContent value="description">
                    <div className="prose max-w-none dark:prose-invert">
                      <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                  </TabsContent>
                  <TabsContent value="solution">
                    <div className="text-muted-foreground">
                      Solution coming soon.
                    </div>
                  </TabsContent>
                  <TabsContent value="discussion">
                    <div className="text-muted-foreground">
                      Discussion coming soon.
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            {/* Code Editor Card */}
            <Card className="bg-card border border-border rounded-lg shadow-sm flex flex-col">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Code className="h-5 w-5" /> Code Editor
                </CardTitle>
                <CardDescription>
                  Write and test your solution below.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4 p-6">
                <div className="mb-2 flex items-center gap-2">
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpp">C++</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <CodeMirror
                    value={codeState[language]}
                    height="300px"
                    theme={vscodeDark}
                    extensions={getLanguageConfig()}
                    onChange={handleCodeChange}
                    className="rounded-md border border-border bg-background text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Button>
                  {submissionStatus && (
                    <div className="mt-2">
                      <Badge
                        className={
                          submissionStatus === "success"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }
                      >
                        {submissionStatus === "success"
                          ? "Accepted"
                          : "Wrong Answer"}
                      </Badge>
                    </div>
                  )}
                  {testResults.length > 0 && (
                    <div className="mt-2">
                      <div className="font-semibold mb-1">Test Results:</div>
                      <ul className="space-y-1">
                        {testResults.map((result, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            {result.passed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span>
                              {result.name}:{" "}
                              {result.passed ? "Passed" : "Failed"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default ProblemPage;
