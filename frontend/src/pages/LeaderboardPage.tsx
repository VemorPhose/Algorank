import { ArrowLeft, RefreshCcw, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { ContestRead, LeaderboardResponse } from "../api/types";
import { Badge, EmptyState, Notice, PageTitle, Panel, Spinner, buttonClass } from "../components/ui";
import { contestPhase, formatDateTime, formatDuration } from "../lib/format";

export function LeaderboardPage() {
  const { contestId = "" } = useParams();
  const [contest, setContest] = useState<ContestRead | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  async function load() {
    const [contestRow, leaderboardRow] = await Promise.all([
      api.contests.get(contestId),
      api.leaderboard.live(contestId).catch(() => api.leaderboard.get(contestId)),
    ]);
    setContest(contestRow);
    setLeaderboard(leaderboardRow);
    setUpdatedAt(new Date());
  }

  useEffect(() => {
    let active = true;
    load()
      .catch((err) => {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Unable to load leaderboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [contestId]);

  useEffect(() => {
    if (!contest || contestPhase(contest) !== "live") return;
    const timer = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [contest]);

  if (loading) {
    return <Spinner label="Loading standings" />;
  }

  if (error || !leaderboard || !contest) {
    return <Notice tone="bg-coral text-lemon">{error || "Leaderboard not found."}</Notice>;
  }

  return (
    <div className="space-y-6">
      <Link to={`/contests/${contestId}`} className={buttonClass("ghost", "w-fit")}>
        <ArrowLeft className="h-4 w-4" />
        Contest
      </Link>
      <PageTitle
        eyebrow="Standings"
        title={contest.title}
        action={
          <button className={buttonClass("plain")} onClick={() => void load()} type="button">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        }
      >
        Source: {leaderboard.source}. {updatedAt ? `Updated ${formatDateTime(updatedAt.toISOString())}.` : null}
      </PageTitle>

      <Panel>
        {leaderboard.entries.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-b-[3px] border-ink bg-lemon">
                  <th className="p-3 font-black">Rank</th>
                  <th className="p-3 font-black">User</th>
                  <th className="p-3 font-black">Score</th>
                  <th className="p-3 font-black">Solved</th>
                  <th className="p-3 font-black">Penalty</th>
                  <th className="p-3 font-black">Last Accepted</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.entries.map((entry) => (
                  <tr key={entry.user_id} className="border-b-[3px] border-ink bg-panel">
                    <td className="p-3 text-xl font-black">#{entry.rank}</td>
                    <td className="p-3 font-black">{entry.username}</td>
                    <td className="p-3">
                      <Badge tone="bg-aqua text-lemon">
                        <Trophy className="h-3.5 w-3.5" />
                        {entry.total_score}
                      </Badge>
                    </td>
                    <td className="p-3 font-bold">{entry.solved_count}</td>
                    <td className="p-3 font-bold">{formatDuration(entry.penalty_seconds)}</td>
                    <td className="p-3 font-bold">{entry.last_accepted_at ? formatDateTime(entry.last_accepted_at) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No leaderboard entries" />
        )}
      </Panel>
    </div>
  );
}
