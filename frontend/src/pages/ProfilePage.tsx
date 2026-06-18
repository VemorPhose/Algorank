import { CalendarDays, Mail, Shield, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { ContestRead, SubmissionRead } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Badge, EmptyState, Metric, Notice, PageTitle, Panel, Spinner, buttonClass } from "../components/ui";
import { contestPhase, formatDateTime, titleCase } from "../lib/format";
import { contestTone, roleTone, submissionTone } from "../lib/status";

export function ProfilePage() {
  const { user, refreshMe } = useAuth();
  const [contests, setContests] = useState<ContestRead[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([refreshMe(), api.contests.mine(), api.submissions.mine()])
      .then(([, contestRows, submissionRows]) => {
        if (!active) return;
        setContests(contestRows);
        setSubmissions(submissionRows);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : "Unable to load profile.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshMe]);

  if (!user) {
    return <Notice tone="bg-coral text-white">Not signed in.</Notice>;
  }

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Profile" title={user.username} action={<Badge tone={roleTone(user.role)}>{titleCase(user.role)}</Badge>}>
        {user.email}
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Registered" value={contests.length} tone="bg-aqua" />
        <Metric label="Submissions" value={submissions.length} tone="bg-lemon" />
        <Metric label="Accepted" value={submissions.filter((item) => item.status === "accepted").length} tone="bg-grass" />
        <Metric label="Joined" value={formatDateTime(user.created_at)} tone="bg-panel" />
      </div>

      {error ? <Notice tone="bg-coral text-white">{error}</Notice> : null}
      {loading ? <Spinner label="Loading profile" /> : null}

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <h2 className="text-2xl font-black">Account</h2>
          <div className="mt-4 grid gap-3">
            <div className="flex items-center gap-3 border-2 border-ink bg-white p-3 shadow-block-sm">
              <Mail className="h-5 w-5" />
              <span className="font-bold">{user.email}</span>
            </div>
            <div className="flex items-center gap-3 border-2 border-ink bg-white p-3 shadow-block-sm">
              <Shield className="h-5 w-5" />
              <span className="font-bold">{user.role}</span>
            </div>
            <div className="flex items-center gap-3 border-2 border-ink bg-white p-3 shadow-block-sm">
              <CalendarDays className="h-5 w-5" />
              <span className="font-bold">{formatDateTime(user.created_at)}</span>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Registered Contests</h2>
            <Link to="/contests" className={buttonClass("plain")}>
              Browse
            </Link>
          </div>
          <div className="grid gap-3">
            {contests.length ? (
              contests.map((contest) => (
                <Link key={contest.id} to={`/contests/${contest.id}`} className="border-2 border-ink bg-white p-4 shadow-block-sm transition hover:-translate-y-0.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-black">{contest.title}</div>
                      <div className="text-sm font-bold text-ink/60">{formatDateTime(contest.start_time)}</div>
                    </div>
                    <Badge tone={contestTone(contestPhase(contest))}>{titleCase(contestPhase(contest))}</Badge>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState title="No registrations" />
            )}
          </div>
        </Panel>
      </section>

      <Panel>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Recent Submissions</h2>
          <Link to="/submissions" className={buttonClass("plain")}>
            All
          </Link>
        </div>
        <div className="grid gap-3">
          {submissions.slice(0, 6).length ? (
            submissions.slice(0, 6).map((submission) => (
              <Link key={submission.id} to={`/submissions/${submission.id}`} className="grid gap-2 border-2 border-ink bg-white p-3 shadow-block-sm md:grid-cols-[1fr_auto] md:items-center">
                <div className="font-bold">{submission.id}</div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={submissionTone(submission.status)}>{titleCase(submission.status)}</Badge>
                  <Badge tone="bg-panel text-ink">
                    <Trophy className="h-3.5 w-3.5" />
                    {submission.points_awarded}
                  </Badge>
                </div>
              </Link>
            ))
          ) : (
            <EmptyState title="No submissions" />
          )}
        </div>
      </Panel>
    </div>
  );
}
