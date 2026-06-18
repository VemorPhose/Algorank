import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import { ArrowLeft, CheckCircle2, ClipboardCheck, FileCode2, Play, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useParams, useSearchParams } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { api, ApiError } from "../api/client";
import type { ContestRead, ProblemRead, SubmissionRead } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Badge, Button, EmptyState, Field, Notice, PageTitle, Panel, Select, Spinner, buttonClass } from "../components/ui";
import { boilerplates, defaultLanguage } from "../lib/boilerplates";
import { cn } from "../lib/cn";
import { formatDateTime, isTerminalSubmission, titleCase } from "../lib/format";
import { makeIdempotencyKey } from "../lib/ids";
import { difficultyTone, submissionTone } from "../lib/status";

const languageLabels: Record<string, string> = {
  cpp: "C++",
  python: "Python",
  java: "Java",
};

function languageExtensions(language: string) {
  switch (language) {
    case "python":
      return [python(), oneDark];
    case "java":
      return [java(), oneDark];
    default:
      return [cpp(), oneDark];
  }
}

export function ProblemDetailPage() {
  const { problemIdOrSlug = "" } = useParams();
  const [params] = useSearchParams();
  const contestId = params.get("contestId") || "";
  const attachedProblemId = params.get("problemId") || "";
  const { isAuthenticated } = useAuth();
  const [problem, setProblem] = useState<ProblemRead | null>(null);
  const [contest, setContest] = useState<ContestRead | null>(null);
  const [language, setLanguage] = useState("cpp");
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>(boilerplates);
  const [submission, setSubmission] = useState<SubmissionRead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setError(null);
      const [problemRow, contestRow] = await Promise.all([
        api.problems.get(problemIdOrSlug),
        contestId ? api.contests.get(contestId) : Promise.resolve(null),
      ]);
      if (!active) return;
      setProblem(problemRow);
      setContest(contestRow);
      setLanguage(defaultLanguage(contestRow?.allowed_languages));
    }
    load()
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : "Unable to load problem.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [contestId, problemIdOrSlug]);

  useEffect(() => {
    if (!submission || isTerminalSubmission(submission.status)) return;
    const timer = window.setInterval(() => {
      void api.submissions
        .get(submission.id)
        .then(setSubmission)
        .catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [submission]);

  const allowedLanguages = useMemo(() => contest?.allowed_languages?.length ? contest.allowed_languages : ["cpp", "python", "java"], [contest]);
  const problemId = attachedProblemId || problem?.id || "";
  const canSubmit = Boolean(isAuthenticated && contestId && problemId);

  async function submit() {
    if (!problem || !contestId || !problemId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await api.submissions.create(
        {
          contest_id: contestId,
          problem_id: problemId,
          language,
          code: codeByLanguage[language] || "",
        },
        makeIdempotencyKey(problem.slug),
      );
      setSubmission(response);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Spinner label="Loading problem" />;
  }

  if (error || !problem) {
    return <Notice tone="bg-coral text-white">{error || "Problem not found."}</Notice>;
  }

  return (
    <div className="space-y-6">
      <Link to={contestId ? `/contests/${contestId}` : "/problems"} className={buttonClass("ghost", "w-fit")}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <PageTitle
        eyebrow={contest ? contest.title : "Problem"}
        title={problem.title}
        action={
          <>
            <Badge tone={difficultyTone(problem.difficulty)}>{problem.difficulty || "General"}</Badge>
            <Badge tone="bg-panel text-ink">{problem.slug}</Badge>
          </>
        }
      >
        {problem.time_limit_ms} ms, {Math.round(problem.memory_limit_kb / 1024)} MB, {problem.test_case_count} tests
      </PageTitle>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
        <div className="space-y-6">
          <Panel>
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.statement}</ReactMarkdown>
            </div>
          </Panel>

          <Panel accent="bg-lemon">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              <h2 className="text-2xl font-black">Samples</h2>
            </div>
            {problem.sample_test_cases.length ? (
              <div className="grid gap-4">
                {problem.sample_test_cases.map((testCase) => (
                  <div key={testCase.ordinal} className="grid gap-3 md:grid-cols-2">
                    <pre className="overflow-x-auto border-2 border-ink bg-white p-3 text-sm font-bold shadow-block-sm">
                      {testCase.stdin || "(empty)"}
                    </pre>
                    <pre className="overflow-x-auto border-2 border-ink bg-white p-3 text-sm font-bold shadow-block-sm">
                      {testCase.expected_output || "(empty)"}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No sample tests" />
            )}
          </Panel>
        </div>

        <Panel className="space-y-5" accent="bg-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-5 w-5" />
              <h2 className="text-2xl font-black">Editor</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {contest ? <Badge tone="bg-aqua text-ink">{contest.status}</Badge> : null}
              {submission ? <Badge tone={submissionTone(submission.status)}>{titleCase(submission.status)}</Badge> : null}
            </div>
          </div>

          {!contestId ? <Notice>Open this problem from a contest room to submit.</Notice> : null}
          {!isAuthenticated ? <Notice>Sign in before submitting a solution.</Notice> : null}
          {submitError ? <Notice tone="bg-coral text-white">{submitError}</Notice> : null}

          <Field label="Language">
            <Select value={language} onChange={(event) => setLanguage(event.target.value)}>
              {allowedLanguages.map((item) => (
                <option key={item} value={item}>
                  {languageLabels[item] || item}
                </option>
              ))}
            </Select>
          </Field>

          <CodeMirror
            value={codeByLanguage[language] || ""}
            height="460px"
            extensions={languageExtensions(language)}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
            }}
            onChange={(value) => setCodeByLanguage((current) => ({ ...current, [language]: value }))}
          />

          <div className="flex flex-wrap gap-3">
            <Button onClick={submit} disabled={!canSubmit || submitting} variant="primary">
              <Play className="h-4 w-4" />
              {submitting ? "Submitting" : "Submit"}
            </Button>
            <Button
              type="button"
              variant="plain"
              onClick={() => setCodeByLanguage((current) => ({ ...current, [language]: boilerplates[language] || "" }))}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          {submission ? (
            <div className="space-y-4 border-t-2 border-ink pt-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="border-2 border-ink bg-lemon p-3 shadow-block-sm">
                  <div className="text-xs font-black uppercase">Points</div>
                  <div className="text-2xl font-black">{submission.points_awarded}</div>
                </div>
                <div className="border-2 border-ink bg-aqua p-3 shadow-block-sm">
                  <div className="text-xs font-black uppercase">Time</div>
                  <div className="text-2xl font-black">{submission.max_time_ms ?? 0} ms</div>
                </div>
                <div className="border-2 border-ink bg-panel p-3 shadow-block-sm">
                  <div className="text-xs font-black uppercase">Updated</div>
                  <div className="text-sm font-black">{formatDateTime(submission.updated_at)}</div>
                </div>
              </div>
              {submission.error_message ? <Notice tone="bg-coral text-white">{submission.error_message}</Notice> : null}
              <div className="grid gap-2">
                {submission.test_results.length ? (
                  submission.test_results.map((result) => (
                    <div
                      key={result.test_case_number}
                      className={cn("border-2 border-ink bg-white p-3 shadow-block-sm", result.passed ? "border-ink" : "")}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-black">
                          {result.passed ? <CheckCircle2 className="h-5 w-5 text-green-700" /> : <XCircle className="h-5 w-5 text-red-600" />}
                          Test {result.test_case_number}
                        </div>
                        <Badge tone={result.passed ? "bg-grass text-ink" : "bg-coral text-white"}>{result.verdict}</Badge>
                      </div>
                      {(result.stderr || result.compile_output || result.message) ? (
                        <pre className="mt-3 overflow-x-auto border-2 border-ink bg-ink p-3 text-xs font-bold text-white">
                          {result.stderr || result.compile_output || result.message}
                        </pre>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <Notice>Submission is queued.</Notice>
                )}
              </div>
            </div>
          ) : null}
        </Panel>
      </section>
    </div>
  );
}
