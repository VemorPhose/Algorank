import { ArrowLeft, CheckCircle2, RefreshCcw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { ProblemRead, SubmissionRead } from "../api/types";
import { Badge, EmptyState, Metric, Notice, PageTitle, Panel, Spinner, buttonClass } from "../components/ui";
import { cn } from "../lib/cn";
import { formatDateTime, isTerminalSubmission, titleCase } from "../lib/format";
import { difficultyTone, submissionTone } from "../lib/status";

export function SubmissionDetailPage() {
  const { submissionId = "" } = useParams();
  const [submission, setSubmission] = useState<SubmissionRead | null>(null);
  const [problem, setProblem] = useState<ProblemRead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const row = await api.submissions.get(submissionId);
    setSubmission(row);
    try {
      setProblem(await api.problems.get(row.problem_id));
    } catch {
      setProblem(null);
    }
  }

  useEffect(() => {
    let active = true;
    load()
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : "Unable to load submission.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [submissionId]);

  useEffect(() => {
    if (!submission || isTerminalSubmission(submission.status)) return;
    const timer = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [submission]);

  if (loading) {
    return <Spinner label="Loading submission" />;
  }

  if (error || !submission) {
    return <Notice tone="bg-coral text-lemon">{error || "Submission not found."}</Notice>;
  }

  return (
    <div className="space-y-6">
      <Link to="/submissions" className={buttonClass("ghost", "w-fit")}>
        <ArrowLeft className="h-4 w-4" />
        Submissions
      </Link>
      <PageTitle
        eyebrow="Submission"
        title={problem?.title || submission.problem_id}
        action={
          <>
            <Badge tone={submissionTone(submission.status)}>{titleCase(submission.status)}</Badge>
            {problem ? <Badge tone={difficultyTone(problem.difficulty)}>{problem.difficulty || "General"}</Badge> : null}
          </>
        }
      >
        {submission.id}
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Points" value={submission.points_awarded} tone="bg-panel" />
        <Metric label="Language" value={submission.language} tone="bg-aqua text-lemon" />
        <Metric label="Time" value={`${submission.max_time_ms ?? 0} ms`} tone="bg-panel" />
        <Metric label="Memory" value={`${submission.max_memory_kb ?? 0} KB`} tone="bg-panel" />
      </div>

      {submission.error_message ? <Notice tone="bg-coral text-lemon">{submission.error_message}</Notice> : null}

      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Results</h2>
          <button className={buttonClass("plain")} onClick={() => void load()} type="button">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        {submission.test_results.length ? (
          <div className="grid gap-3">
            {submission.test_results.map((result) => (
              <div key={result.test_case_number} className="rounded-lg border-[3px] border-ink bg-panel p-4 shadow-block-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-lg font-black">
                    {result.passed ? <CheckCircle2 className="h-5 w-5 text-green-700" /> : <XCircle className="h-5 w-5 text-red-600" />}
                    Test {result.test_case_number}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={result.passed ? "bg-aqua text-lemon" : "bg-coral text-lemon"}>{result.verdict}</Badge>
                    <Badge tone="bg-panel text-ink">{result.time_ms} ms</Badge>
                    <Badge tone="bg-panel text-ink">{result.memory_kb} KB</Badge>
                  </div>
                </div>
                {(result.stdout || result.stderr || result.compile_output || result.message) ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[
                      ["stdout", result.stdout],
                      ["stderr", result.stderr],
                      ["compile", result.compile_output],
                      ["message", result.message],
                    ].map(([label, value]) =>
                      value ? (
                        <pre key={label} className={cn("overflow-x-auto border-[3px] border-ink p-3 text-xs font-bold shadow-block-sm", label === "stdout" ? "bg-panel text-ink" : "bg-ink text-lemon")}>
                          {label}
                          {"\n"}
                          {value}
                        </pre>
                      ) : null,
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No test results yet">
            Created {formatDateTime(submission.created_at)}
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
