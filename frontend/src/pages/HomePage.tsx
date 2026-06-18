import { ArrowRight, Code2, Gauge, ShieldCheck, Trophy, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { ContestRead, ProblemListItem } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Badge, EmptyState, Metric, Notice, PageTitle, Panel, Spinner, buttonClass } from "../components/ui";
import { contestPhase, formatShortDate, timeUntil, titleCase } from "../lib/format";
import { contestTone, difficultyTone } from "../lib/status";

export function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const [contests, setContests] = useState<ContestRead[]>([]);
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([api.contests.list(), api.problems.list()])
      .then(([contestRows, problemRows]) => {
        if (!active) return;
        setContests(contestRows);
        setProblems(problemRows);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Unable to load Algorank data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const liveContest = useMemo(
    () => contests.find((contest) => contestPhase(contest) === "live") ?? contests.find((contest) => contest.status === "published"),
    [contests],
  );
  const nextContest = useMemo(
    () =>
      [...contests]
        .filter((contest) => contestPhase(contest) === "upcoming")
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0],
    [contests],
  );
  const visibleProblems = problems.filter((problem) => !problem.hidden).slice(0, 5);
  const publishedCount = contests.filter((contest) => contest.status === "published").length;

  return (
    <div className="space-y-8">
      <section className="atlas-enter grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-end">
        <div>
          <div className="mb-3 inline-flex rounded-lg border-2 border-ink bg-coral px-3 py-1 font-mono text-xs font-black uppercase text-lemon shadow-block-sm">
            Algorank Atlas
          </div>
          <h1 className="inline-block max-w-5xl rounded-lg border-[3px] border-ink bg-panel px-3 pb-3 pt-2 text-5xl font-black leading-none text-ink shadow-block md:text-7xl">
            Contest execution lab
          </h1>
          <p className="mt-5 max-w-3xl text-lg font-bold leading-8 text-ink">
            Track contests, queue-backed Judge0 submissions, Redis standings, and role-gated operations from one production-ready workbench.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/contests" className={buttonClass("primary")}>
              <Trophy className="h-5 w-5" />
              Contests
            </Link>
            <Link to="/problems" className={buttonClass("plain")}>
              <Code2 className="h-5 w-5" />
              Problems
            </Link>
            {!isAuthenticated ? (
              <Link to="/register" className={buttonClass("secondary")}>
                Join
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : null}
          </div>
        </div>

        <Panel className="grid content-between gap-5" accent="bg-aqua text-lemon">
          <div>
            <div className="font-mono text-xs font-black uppercase text-lemon/80">Session</div>
            <div className="mt-2 text-3xl font-black text-lemon">{user ? user.username : "Guest"}</div>
            <p className="mt-2 text-sm font-bold text-lemon/80">
              {user ? `${titleCase(user.role)} account` : "Public browsing is open. Submissions require sign in."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Published" value={publishedCount} tone="bg-aqua text-lemon" />
            <Metric label="Problems" value={problems.length} tone="bg-coral text-lemon" />
          </div>
        </Panel>
      </section>

      {error ? <Notice tone="bg-coral text-lemon">{error}</Notice> : null}
      {loading ? <Spinner label="Loading dashboard" /> : null}

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <PageTitle eyebrow="Now" title="Contest Pulse" />
          <div className="mt-5 space-y-4">
            {liveContest ? (
              <Link to={`/contests/${liveContest.id}`} className="block rounded-lg border-[3px] border-ink bg-panel p-4 shadow-block-sm transition hover:-translate-y-0.5 hover:shadow-block">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-2xl font-black text-ink">{liveContest.title}</div>
                    <div className="mt-1 text-sm font-bold text-ink/65">
                      Ends {formatShortDate(liveContest.end_time)}
                    </div>
                  </div>
                  <Badge tone={contestTone(contestPhase(liveContest))}>{contestPhase(liveContest)}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <Metric label="Problems" value={liveContest.problem_count} tone="bg-panel" />
                  <Metric label="Players" value={liveContest.participant_count} tone="bg-aqua text-lemon" />
                  <Metric label="Left" value={timeUntil(liveContest.end_time)} tone="bg-panel" />
                </div>
              </Link>
            ) : (
              <EmptyState title="No live contest" />
            )}

            {nextContest ? (
              <div className="rounded-lg border-[3px] border-ink bg-aqua p-4 text-lemon shadow-block-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-black text-lemon">{nextContest.title}</div>
                    <div className="text-sm font-bold text-lemon/75">Starts in {timeUntil(nextContest.start_time)}</div>
                  </div>
                  <Link to={`/contests/${nextContest.id}`} className={buttonClass("plain")}>
                    Open
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel accent="bg-panel">
          <PageTitle eyebrow="Practice" title="Problem Board" />
          <div className="mt-5 grid gap-3">
            {visibleProblems.length ? (
              visibleProblems.map((problem) => (
                <Link
                  key={problem.id}
                  to={`/problems/${problem.slug}`}
                  className="grid gap-3 rounded-lg border-[3px] border-ink bg-panel p-4 shadow-block-sm transition hover:-translate-y-0.5 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <div className="text-lg font-black text-ink">{problem.title}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge tone={difficultyTone(problem.difficulty)}>{problem.difficulty || "General"}</Badge>
                      {problem.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} tone="bg-panel text-ink">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-black text-ink">
                    <Gauge className="h-5 w-5" />
                    {problem.solved_count}
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState title="No problems yet" />
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Panel accent="bg-coral text-lemon">
          <ShieldCheck className="h-8 w-8" />
          <div className="mt-4 text-xl font-black">JWT roles</div>
          <p className="mt-2 text-sm font-bold text-lemon/80">Admin, organizer, and contestant flows share one backend auth contract.</p>
        </Panel>
        <Panel accent="bg-aqua text-lemon">
          <UsersRound className="h-8 w-8" />
          <div className="mt-4 text-xl font-black">Contest rooms</div>
          <p className="mt-2 text-sm font-bold text-lemon/80">Registration, problem lists, and live scoreboards stay close together.</p>
        </Panel>
        <Panel accent="bg-panel">
          <Trophy className="h-8 w-8" />
          <div className="mt-4 text-xl font-black">Redis standings</div>
          <p className="mt-2 text-sm font-bold text-ink/70">Leaderboard screens poll the low-latency live endpoint during contests.</p>
        </Panel>
      </section>
    </div>
  );
}
