import { ArrowLeft, CheckCircle2, ClipboardList, Code2, ListOrdered, RefreshCcw, Trophy, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { ContestProblemRead, ContestRead, LeaderboardResponse } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Badge, Button, EmptyState, Metric, Notice, PageTitle, Panel, Spinner, buttonClass } from "../components/ui";
import { contestPhase, formatDateTime, formatDuration, titleCase } from "../lib/format";
import { contestTone } from "../lib/status";

export function ContestDetailPage() {
  const { contestId = "" } = useParams();
  const { isAuthenticated } = useAuth();
  const [contest, setContest] = useState<ContestRead | null>(null);
  const [problems, setProblems] = useState<ContestProblemRead[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  async function load() {
    setError(null);
    const [contestRow, problemRows, leaderboardRow] = await Promise.all([
      api.contests.get(contestId),
      api.problems.byContest(contestId),
      api.leaderboard.live(contestId).catch(() => api.leaderboard.get(contestId)),
    ]);
    setContest(contestRow);
    setProblems(problemRows);
    setLeaderboard(leaderboardRow);
    if (isAuthenticated) {
      const mine = await api.contests.mine();
      setRegisteredIds(new Set(mine.map((item) => item.id)));
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    load()
      .catch((err) => {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Unable to load contest.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [contestId, isAuthenticated]);

  useEffect(() => {
    if (!contest || contestPhase(contest) !== "live") return;
    const timer = window.setInterval(() => {
      void api.leaderboard.live(contest.id).then(setLeaderboard).catch(() => undefined);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [contest]);

  const registered = contest ? registeredIds.has(contest.id) : false;
  const phase = contest ? contestPhase(contest) : "draft";
  const rules = useMemo(() => {
    if (!contest?.rules || !Object.keys(contest.rules).length) {
      return [];
    }
    return Object.entries(contest.rules).map(([key, value]) => [titleCase(key), String(value)] as const);
  }, [contest]);

  async function register() {
    if (!contest) return;
    setRegistering(true);
    setRegisterError(null);
    try {
      await api.contests.register(contest.id);
      await load();
    } catch (err) {
      setRegisterError(err instanceof ApiError ? err.message : "Registration failed.");
    } finally {
      setRegistering(false);
    }
  }

  if (loading) {
    return <Spinner label="Loading contest" />;
  }

  if (error || !contest) {
    return <Notice tone="bg-coral text-white">{error || "Contest not found."}</Notice>;
  }

  return (
    <div className="space-y-6">
      <Link to="/contests" className={buttonClass("ghost", "w-fit")}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <Panel accent={phase === "live" ? "bg-aqua" : "bg-panel"} className="space-y-6">
        <PageTitle
          eyebrow="Contest Room"
          title={contest.title}
          action={
            <>
              <Badge tone={contestTone(phase)}>{titleCase(phase)}</Badge>
              {registered ? <Badge tone="bg-violet text-white"><CheckCircle2 className="h-3.5 w-3.5" />Registered</Badge> : null}
            </>
          }
        >
          {contest.description || "No description."}
        </PageTitle>

        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Start" value={formatDateTime(contest.start_time)} tone="bg-lemon" />
          <Metric label="End" value={formatDateTime(contest.end_time)} tone="bg-panel" />
          <Metric label="Problems" value={contest.problem_count} tone="bg-coral text-white" />
          <Metric label="Players" value={contest.participant_count} tone="bg-panel" />
        </div>

        <div className="flex flex-wrap gap-3">
          {isAuthenticated ? (
            <Button onClick={register} disabled={registered || registering || contest.status !== "published"} variant={registered ? "plain" : "primary"}>
              <UsersRound className="h-4 w-4" />
              {registered ? "Registered" : registering ? "Registering" : "Register"}
            </Button>
          ) : (
            <Link to="/login" className={buttonClass("primary")}>
              Sign in
            </Link>
          )}
          <Link to={`/contests/${contest.id}/leaderboard`} className={buttonClass("secondary")}>
            <Trophy className="h-4 w-4" />
            Leaderboard
          </Link>
          <button className={buttonClass("plain")} onClick={() => void load()} type="button">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        {registerError ? <Notice tone="bg-coral text-white">{registerError}</Notice> : null}
      </Panel>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            <h2 className="text-2xl font-black">Problems</h2>
          </div>
          <div className="grid gap-3">
            {problems.length ? (
              problems
                .sort((a, b) => a.order_index - b.order_index)
                .map((problem) => (
                  <Link
                    key={problem.id}
                    to={`/problems/${problem.slug}?contestId=${contest.id}&problemId=${problem.problem_id}`}
                    className="grid gap-3 border-2 border-ink bg-white p-4 shadow-block-sm transition hover:-translate-y-0.5 md:grid-cols-[auto_1fr_auto] md:items-center"
                  >
                    <Badge tone="bg-lemon text-ink">#{problem.order_index}</Badge>
                    <div>
                      <div className="text-lg font-black">{problem.title}</div>
                      <div className="text-sm font-bold text-ink/60">{problem.slug}</div>
                    </div>
                    <Badge tone="bg-coral text-white">{problem.points} pts</Badge>
                  </Link>
                ))
            ) : (
              <EmptyState title="No problems attached" />
            )}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel accent="bg-lemon">
            <div className="mb-4 flex items-center gap-2">
              <ListOrdered className="h-5 w-5" />
              <h2 className="text-2xl font-black">Leaderboard</h2>
            </div>
            {leaderboard?.entries.length ? (
              <div className="grid gap-2">
                {leaderboard.entries.slice(0, 5).map((entry) => (
                  <div key={entry.user_id} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-2 border-ink bg-white p-3 shadow-block-sm">
                    <div className="text-xl font-black">#{entry.rank}</div>
                    <div>
                      <div className="font-black">{entry.username}</div>
                      <div className="text-xs font-bold text-ink/60">{entry.solved_count} solved</div>
                    </div>
                    <Badge tone="bg-grass text-ink">{entry.total_score}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No standings yet" />
            )}
          </Panel>

          <Panel>
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              <h2 className="text-2xl font-black">Rules</h2>
            </div>
            {rules.length ? (
              <dl className="grid gap-3">
                {rules.map(([key, value]) => (
                  <div key={key} className="border-2 border-ink bg-white p-3 shadow-block-sm">
                    <dt className="font-black">{key}</dt>
                    <dd className="mt-1 text-sm font-semibold text-ink/70">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="text-sm font-bold text-ink/65">Standard contest rules apply.</div>
            )}
            <div className="mt-4 text-sm font-bold text-ink/65">Penalty: {formatDuration(0)} base display</div>
          </Panel>
        </div>
      </section>
    </div>
  );
}
