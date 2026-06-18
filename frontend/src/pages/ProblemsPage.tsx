import { Code2, EyeOff, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { ProblemListItem } from "../api/types";
import { Badge, EmptyState, Field, Input, Metric, Notice, PageTitle, Panel, Select, Spinner } from "../components/ui";
import { formatShortDate } from "../lib/format";
import { difficultyTone } from "../lib/status";

type DifficultyFilter = "all" | "easy" | "medium" | "hard" | "other";
type SortMode = "newest" | "oldest" | "most-solved" | "least-solved";

export function ProblemsPage() {
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.problems
      .list()
      .then((rows) => {
        if (active) setProblems(rows);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : "Unable to load problems.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const tags = useMemo(() => Array.from(new Set(problems.flatMap((problem) => problem.tags))).sort(), [problems]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rows = problems.filter((problem) => {
      const diff = (problem.difficulty || "").toLowerCase();
      const difficultyMatch =
        difficulty === "all" ||
        diff === difficulty ||
        (difficulty === "other" && !["easy", "medium", "hard"].includes(diff));
      const queryMatch =
        !normalizedQuery ||
        problem.title.toLowerCase().includes(normalizedQuery) ||
        problem.slug.toLowerCase().includes(normalizedQuery) ||
        problem.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));
      return difficultyMatch && queryMatch;
    });
    return rows.sort((a, b) => {
      switch (sortMode) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "most-solved":
          return b.solved_count - a.solved_count;
        case "least-solved":
          return a.solved_count - b.solved_count;
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [difficulty, problems, query, sortMode]);

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Problem Set" title="Problems">
        Practice standalone problems or open contest-attached problems from a contest room.
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Total" value={problems.length} tone="bg-aqua" />
        <Metric label="Tags" value={tags.length} tone="bg-lemon" />
        <Metric label="Hidden visible" value={problems.filter((problem) => problem.hidden).length} tone="bg-panel" />
      </div>

      <Panel>
        <div className="grid gap-4 lg:grid-cols-[1fr_12rem_12rem]">
          <Field label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-ink/50" />
              <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, slug, tag" />
            </div>
          </Field>
          <Field label="Difficulty">
            <Select value={difficulty} onChange={(event) => setDifficulty(event.target.value as DifficultyFilter)}>
              <option value="all">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Sort">
            <Select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="most-solved">Most solved</option>
              <option value="least-solved">Least solved</option>
            </Select>
          </Field>
        </div>
      </Panel>

      {error ? <Notice tone="bg-coral text-white">{error}</Notice> : null}
      {loading ? <Spinner label="Loading problems" /> : null}

      <div className="grid gap-4">
        {filtered.length ? (
          filtered.map((problem) => (
            <Link
              key={problem.id}
              to={`/problems/${problem.slug}`}
              className="grid gap-4 border-2 border-ink bg-white p-5 shadow-block transition hover:-translate-y-0.5 hover:shadow-block-lg lg:grid-cols-[1fr_auto] lg:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black text-ink">{problem.title}</h2>
                  {problem.hidden ? (
                    <Badge tone="bg-ink text-white">
                      <EyeOff className="h-3.5 w-3.5" />
                      Hidden
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone={difficultyTone(problem.difficulty)}>{problem.difficulty || "General"}</Badge>
                  <Badge tone="bg-panel text-ink">{problem.slug}</Badge>
                  {problem.tags.map((tag) => (
                    <Badge key={tag} tone="bg-white text-ink">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-80">
                <Metric label="Solved" value={problem.solved_count} tone="bg-aqua" />
                <Metric label="Added" value={formatShortDate(problem.created_at)} tone="bg-lemon" />
                <Metric label="Open" value={<Code2 className="h-6 w-6" />} tone="bg-panel" />
              </div>
            </Link>
          ))
        ) : (
          <EmptyState title="No problems match" />
        )}
      </div>
    </div>
  );
}
