import { useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
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

function ProblemPage() {
  const { problemId } = useParams();
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
  const dividerRef = useRef(null);
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
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
      } catch (error) {
        console.error("Error loading boilerplates:", error);
        // Set default boilerplates if loading fails
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
    const fetchMarkdown = async () => {
      try {
        const response = await fetch(`/problems/${problemId}.md`);
        if (!response.ok) throw new Error("File not found");
        const text = await response.text();
        setContent(text);
      } catch (error) {
        console.error("Error fetching markdown:", error);
        setContent("Problem not found.");
      }
    };

    fetchMarkdown();
  }, [problemId]);

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const getLanguageExtension = () => {
    switch (language) {
      case "python":
        return python();
      case "java":
        return java();
      case "cpp":
      default:
        return cpp();
    }
  };

  const handleCodeChange = (value) => {
    setCodeState((prev) => ({
      ...prev,
      [language]: value,
    }));
  };

  const startDragging = () => setIsDragging(true);
  const stopDragging = () => setIsDragging(false);
  const handleDragging = (e) => {
    if (!isDragging) return;
    const containerWidth = dividerRef.current.parentNode.offsetWidth;
    const newLeftWidth = (e.clientX / containerWidth) * 100;
    if (newLeftWidth > 20 && newLeftWidth < 80) {
      leftPanelRef.current.style.width = `${newLeftWidth}%`;
      rightPanelRef.current.style.width = `${100 - newLeftWidth}%`;
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleDragging);
    window.addEventListener("mouseup", stopDragging);
    return () => {
      window.removeEventListener("mousemove", handleDragging);
      window.removeEventListener("mouseup", stopDragging);
    };
  }, [isDragging]);

  // Add submission handler
  const handleSubmit = async () => {
    if (!user) {
      alert("Please sign in to submit your solution");
      return;
    }

    const submissionData = {
      problemId,
      userId: user.uid,
      submissionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      code: codeState[language],
      language,
      status: false,
    };

    // console.log(submissionData);

    setIsSubmitting(true);
    try {
      const response = await fetch("http://localhost:5000/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();
      setSubmissionStatus(result.status);
      setTestResults(result.testCases || []);
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Failed to submit code");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!boilerplatesLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen my-0">
      <Header />

      <main
        className="flex flex-1 text-white px-10 py-0"
        style={{ backgroundColor: "#1D2125" }}
      >
        {/* Left Panel - Problem Description */}
        <div
          ref={leftPanelRef}
          className="p-4 my-6 overflow-y-auto"
          style={{ width: "50%" }}
        >
          <h2 className="text-2xl font-bold mb-4">
            {problemId.replace(/-/g, " ").toUpperCase()}
          </h2>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        {/* Divider */}
        <div
          ref={dividerRef}
          onMouseDown={startDragging}
          className="w-2 bg-dark cursor-col-resize flex flex-col justify-center"
          style={{ cursor: "col-resize", lineHeight: "12px" }}
        >
          ::
          <br />
          ::
          <br />
          ::
          <br />
        </div>

        {/* Right Panel - IDE */}
        <div ref={rightPanelRef} className="p-4 my-6" style={{ width: "50%" }}>
          <div className="mb-4">
            <label
              htmlFor="language"
              className="block mb-2 text-sm font-medium"
            >
              Select Language:
            </label>
            <select
              id="language"
              value={language}
              onChange={handleLanguageChange}
              className="p-2 rounded bg-gray-800 text-white border border-gray-600"
            >
              <option value="cpp">C++</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
            </select>
          </div>

          <CodeMirror
            value={codeState[language]}
            height="450px"
            extensions={getLanguageConfig()}
            onChange={handleCodeChange}
            theme={vscodeDark}
            className="rounded shadow-sm"
            basicSetup={{
              indentOnInput: true,
              bracketMatching: true,
              autocompletion: true,
              closeBrackets: true,
              indentationMarkers: true,
            }}
          />

          <div className="mb-6 flex flex-row justify-between width-full">
            <button
              onClick={handleSubmit}
              className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
              disabled={isSubmitting}
            >
              Submit
            </button>
            {(isSubmitting || submissionStatus !== null) && (
              <div
                className={`mt-4 px-4 py-2 rounded ${
                  isSubmitting
                    ? "bg-gray-700 text-white"
                    : submissionStatus
                    ? "bg-green-600 text-white"
                    : "bg-red-600 text-white"
                }`}
              >
                {isSubmitting
                  ? "Submission queued..."
                  : submissionStatus
                  ? "Accepted"
                  : "Wrong Answer"}
              </div>
            )}
          </div>
          {submissionStatus !== null && (
            <div className="testCaseResults flex flex-col gap-2 width-full">
              {testResults.map((test) => (
                <div
                  key={test.number}
                  className="flex flex-row justify-between items-center p-3 rounded bg-gray-800"
                >
                  <div className="w-1/4">Test Case {test.number}</div>
                  <div
                    className={`w-1/2 ${
                      test.verdict === "Accepted" ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {test.verdict}
                  </div>
                  <div className="w-1/4 text-right">{test.executionTime}ms</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ProblemPage;
