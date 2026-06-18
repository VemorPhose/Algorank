import { CalendarClock, Search, Trophy, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { ContestRead } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Badge, EmptyState, Field, Input, Metric, Notice, PageTitle, Panel, Select, Spinner, buttonClass } from "../components/ui";
import { cn } from "../lib/cn";
import { contestPhase, formatDateTime, timeUntil, titleCase } from "../lib/format";
import { contestTone } from "../lib/status";

type ContestFilter = "all" | "live" | "upcoming" | "ended" | "draft";

export function ContestsPage() {
  const { isAuthenticated } = useAuth();
  const [contests, setContests] = useState<ContestRead[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<ContestFilter>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setError(null);
      try {
        const rows = await api.contests.list();
        if (!active) return;
        setContests(rows);
        if (isAuthenticated) {
          const mine = await api.contests.mine();
          if (!active) return;
          setRegisteredIds(new Set(mine.map((contest) => contest.id)));
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Unable to load contests.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return contests
      .filter((contest) => {
        const phase = contestPhase(contest);
        const filterMatch = filter === "all" || phase === filter || (filter === "ended" && phase === "closed");
        const queryMatch =
          !normalizedQuery ||
          contest.title.toLowerCase().includes(normalizedQuery) ||
          (contest.description || "").toLowerCase().includes(normalizedQuery);
        return filterMatch && queryMatch;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [contests, filter, query]);

  const counts = useMemo(
    () => ({
      live: contests.filter((contest) => contestPhase(contest) === "live").length,
      upcoming: contests.filter((contest) => contestPhase(contest) === "upcoming").length,
      ended: contests.filter((contest) => ["ended", "closed"].includes(contestPhase(contest))).length,
    }),
    [contests],
  );

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Contest Board" title="Contests" action={<Link to="/problems" className={buttonClass("plain")}>Problem set</Link>}>
        Browse published contests, registrations, and archive standings.
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Live" value={counts.live} tone="bg-aqua text-lemon" />
        <Metric label="Upcoming" value={counts.upcoming} tone="bg-aqua text-lemon" />
        <Metric label="Ended" value={counts.ended} tone="bg-panel" />
      </div>

      <Panel>
        <div className="grid gap-4 lg:grid-cols-[1fr_14rem]">
          <Field label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-ink/50" />
              <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Contest title" />
            </div>
          </Field>
          <Field label="Phase">
            <Select value={filter} onChange={(event) => setFilter(event.target.value as ContestFilter)}>
              <option value="all">All</option>
              <option value="live">Live</option>
              <option value="upcoming">Upcoming</option>
              <option value="ended">Ended</option>
              <option value="draft">Draft</option>
            </Select>
          </Field>
        </div>
      </Panel>

      {error ? <Notice tone="bg-coral text-lemon">{error}</Notice> : null}
      {loading ? <Spinner label="Loading contests" /> : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {filtered.length ? (
          filtered.map((contest) => (
            <ContestCard key={contest.id} contest={contest} registered={registeredIds.has(contest.id)} />
          ))
        ) : (
          <div className="lg:col-span-2">
            <EmptyState title="No contests match" />
          </div>
        )}
      </div>
    </div>
  );
}

function ContestCard({ contest, registered }: { contest: ContestRead; registered: boolean }) {
  const phase = contestPhase(contest);
  return (
    <Link
      to={`/contests/${contest.id}`}
      className={cn(
        "group block rounded-lg border-[3px] border-ink bg-panel p-5 shadow-block transition hover:-translate-y-0.5 hover:shadow-block-lg",
        phase === "live" && "bg-aqua text-lemon",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-black text-ink">{contest.title}</div>
          <div className="mt-2 line-clamp-2 text-sm font-semibold text-ink/70">{contest.description || "No description."}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={contestTone(phase)}>{titleCase(phase)}</Badge>
          {registered ? <Badge tone="bg-violet text-lemon">Registered</Badge> : null}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Starts" value={phase === "upcoming" ? timeUntil(contest.start_time) : formatDateTime(contest.start_time)} tone="bg-panel" />
        <Metric label="Problems" value={contest.problem_count} tone="bg-panel" />
        <Metric label="Players" value={contest.participant_count} tone="bg-aqua text-lemon" />
        <Metric label="Languages" value={contest.allowed_languages.length || "Any"} tone="bg-panel" />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-black text-ink/75">
        <span className="inline-flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          {formatDateTime(contest.end_time)}
        </span>
        <span className="inline-flex items-center gap-2">
          <UsersRound className="h-4 w-4" />
          {contest.participant_count}
        </span>
        <span className="inline-flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          {contest.status}
        </span>
      </div>
    </Link>
  );
}
