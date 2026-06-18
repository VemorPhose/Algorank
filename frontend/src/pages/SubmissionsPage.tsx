import { ArrowRight, FileCode2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { ProblemListItem, SubmissionRead } from "../api/types";
import { Badge, EmptyState, Field, Input, Metric, Notice, PageTitle, Panel, Select, Spinner } from "../components/ui";
import { formatDateTime, titleCase } from "../lib/format";
import { submissionTone } from "../lib/status";

type SubmissionFilter = "all" | "queued" | "processing" | "accepted" | "failed";

const failedStatuses = new Set(["wrong_answer", "time_limit_exceeded", "compilation_error", "runtime_error", "internal_error", "cancelled"]);

export function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionRead[]>([]);
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SubmissionFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([api.submissions.mine(), api.problems.list()])
      .then(([submissionRows, problemRows]) => {
        if (!active) return;
        setSubmissions(submissionRows);
        setProblems(problemRows);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : "Unable to load submissions.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const problemById = useMemo(() => new Map(problems.map((problem) => [problem.id, problem])), [problems]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return submissions.filter((submission) => {
      const problem = problemById.get(submission.problem_id);
      const filterMatch =
        filter === "all" ||
        submission.status === filter ||
        (filter === "failed" && failedStatuses.has(submission.status));
      const queryMatch =
        !normalized ||
        submission.id.toLowerCase().includes(normalized) ||
        submission.language.toLowerCase().includes(normalized) ||
        problem?.title.toLowerCase().includes(normalized) ||
        problem?.slug.toLowerCase().includes(normalized);
      return filterMatch && queryMatch;
    });
  }, [filter, problemById, query, submissions]);

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="History" title="Submissions">
        The latest 100 submissions for the signed-in account.
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Total" value={submissions.length} tone="bg-aqua text-lemon" />
        <Metric label="Accepted" value={submissions.filter((item) => item.status === "accepted").length} tone="bg-aqua text-lemon" />
        <Metric label="Active" value={submissions.filter((item) => ["queued", "processing"].includes(item.status)).length} tone="bg-panel" />
      </div>

      <Panel>
        <div className="grid gap-4 md:grid-cols-[1fr_14rem]">
          <Field label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-ink/50" />
              <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Problem, language, id" />
            </div>
          </Field>
          <Field label="Status">
            <Select value={filter} onChange={(event) => setFilter(event.target.value as SubmissionFilter)}>
              <option value="all">All</option>
              <option value="queued">Queued</option>
              <option value="processing">Processing</option>
              <option value="accepted">Accepted</option>
              <option value="failed">Failed</option>
            </Select>
          </Field>
        </div>
      </Panel>

      {error ? <Notice tone="bg-coral text-lemon">{error}</Notice> : null}
      {loading ? <Spinner label="Loading submissions" /> : null}

      <div className="grid gap-3">
        {filtered.length ? (
          filtered.map((submission) => {
            const problem = problemById.get(submission.problem_id);
            return (
              <Link
                key={submission.id}
                to={`/submissions/${submission.id}`}
                className="grid gap-4 rounded-lg border-[3px] border-ink bg-panel p-4 shadow-block-sm transition hover:-translate-y-0.5 hover:shadow-block md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <FileCode2 className="h-5 w-5" />
                    <h2 className="text-xl font-black">{problem?.title || submission.problem_id}</h2>
                    <Badge tone={submissionTone(submission.status)}>{titleCase(submission.status)}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm font-bold text-ink/65">
                    <span>{submission.language}</span>
                    <span>{formatDateTime(submission.created_at)}</span>
                    <span>{submission.points_awarded} pts</span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5" />
              </Link>
            );
          })
        ) : (
          <EmptyState title="No submissions match" />
        )}
      </div>
    </div>
  );
}
