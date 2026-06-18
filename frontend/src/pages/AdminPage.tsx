import { Activity, Link2, Plus, RefreshCcw, Rocket, Square, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import type { ContestRead, ProblemListItem, ProblemTestCaseCreate, QueueStatus, WorkerStatus } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Badge, Button, Field, Input, Metric, Notice, PageTitle, Panel, Select, Spinner, Textarea, buttonClass } from "../components/ui";
import { fromDateTimeLocal, formatDateTime, titleCase, toDateTimeLocal } from "../lib/format";
import { contestTone, difficultyTone } from "../lib/status";

type AdminTab = "contests" | "problems" | "attach" | "system";

const defaultStart = toDateTimeLocal(new Date(Date.now() + 60 * 60_000));
const defaultEnd = toDateTimeLocal(new Date(Date.now() + 3 * 60 * 60_000));

export function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<AdminTab>("contests");
  const [contests, setContests] = useState<ContestRead[]>([]);
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "admin";

  async function load() {
    setError(null);
    const [contestRows, problemRows] = await Promise.all([api.contests.list(), api.problems.list()]);
    setContests(contestRows);
    setProblems(problemRows);
    if (isAdmin) {
      const [queue, workers] = await Promise.all([
        api.admin.queueStatus().catch(() => null),
        api.admin.workers().catch(() => null),
      ]);
      setQueueStatus(queue);
      setWorkerStatus(workers);
    }
  }

  useEffect(() => {
    let active = true;
    load()
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : "Unable to load admin data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  async function runAction(action: () => Promise<unknown>, success: string) {
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(success);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="Control Room"
        title="Admin Console"
        action={
          <button className={buttonClass("plain")} onClick={() => void runAction(load, "Refreshed.")} type="button">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        }
      >
        Signed in as {user?.username}.
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Contests" value={contests.length} tone="bg-aqua text-lemon" />
        <Metric label="Problems" value={problems.length} tone="bg-panel" />
        <Metric label="Published" value={contests.filter((contest) => contest.status === "published").length} tone="bg-aqua text-lemon" />
        <Metric label="Role" value={user?.role || "-"} tone="bg-panel" />
      </div>

      <Panel>
        <div className="flex flex-wrap gap-2">
          {(["contests", "problems", "attach", "system"] as AdminTab[]).map((item) => (
            <button
              key={item}
              type="button"
              className={buttonClass(tab === item ? "secondary" : "plain")}
              onClick={() => setTab(item)}
              disabled={item === "system" && !isAdmin}
            >
              {titleCase(item)}
            </button>
          ))}
        </div>
      </Panel>

      {loading ? <Spinner label="Loading admin" /> : null}
      {message ? <Notice tone="bg-aqua text-lemon">{message}</Notice> : null}
      {error ? <Notice tone="bg-coral text-lemon">{error}</Notice> : null}

      {tab === "contests" ? <ContestAdmin contests={contests} runAction={runAction} /> : null}
      {tab === "problems" ? <ProblemAdmin problems={problems} runAction={runAction} /> : null}
      {tab === "attach" ? <AttachAdmin contests={contests} problems={problems} runAction={runAction} /> : null}
      {tab === "system" ? <SystemAdmin queueStatus={queueStatus} workerStatus={workerStatus} isAdmin={isAdmin} /> : null}
    </div>
  );
}

function ContestAdmin({
  contests,
  runAction,
}: {
  contests: ContestRead[];
  runAction: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [languages, setLanguages] = useState("cpp,python,java");
  const [rules, setRules] = useState("{\n  \"penalty\": \"20 minutes per wrong accepted problem attempt\"\n}");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsedRules = rules.trim() ? JSON.parse(rules) : {};
    await runAction(
      () =>
        api.contests.create({
          title,
          description: description || null,
          start_time: fromDateTimeLocal(startTime),
          end_time: fromDateTimeLocal(endTime),
          registration_deadline: registrationDeadline ? fromDateTimeLocal(registrationDeadline) : null,
          allowed_languages: languages.split(",").map((item) => item.trim()).filter(Boolean),
          rules: parsedRules,
        }),
      "Contest created.",
    );
    setTitle("");
    setDescription("");
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel>
        <h2 className="mb-4 text-2xl font-black">Create Contest</h2>
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <Field label="Title">
            <Input value={title} minLength={3} maxLength={200} onChange={(event) => setTitle(event.target.value)} required />
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Start">
              <Input type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
            </Field>
            <Field label="End">
              <Input type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
            </Field>
          </div>
          <Field label="Registration deadline">
            <Input type="datetime-local" value={registrationDeadline} onChange={(event) => setRegistrationDeadline(event.target.value)} />
          </Field>
          <Field label="Allowed languages">
            <Input value={languages} onChange={(event) => setLanguages(event.target.value)} />
          </Field>
          <Field label="Rules JSON">
            <Textarea value={rules} onChange={(event) => setRules(event.target.value)} className="font-mono" />
          </Field>
          <Button type="submit">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </form>
      </Panel>

      <Panel>
        <h2 className="mb-4 text-2xl font-black">Contest Operations</h2>
        <div className="grid gap-3">
          {contests.map((contest) => (
            <div key={contest.id} className="rounded-lg border-[3px] border-ink bg-panel p-4 shadow-block-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black">{contest.title}</div>
                  <div className="text-sm font-bold text-ink/60">{formatDateTime(contest.start_time)}</div>
                </div>
                <Badge tone={contestTone(contest.status)}>{contest.status}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={contest.status === "published"}
                  onClick={() => void runAction(() => api.contests.publish(contest.id), "Contest published.")}
                >
                  <Rocket className="h-4 w-4" />
                  Publish
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={contest.status === "closed"}
                  onClick={() => void runAction(() => api.contests.close(contest.id), "Contest closed.")}
                >
                  <Square className="h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function ProblemAdmin({
  problems,
  runAction,
}: {
  problems: ProblemListItem[];
  runAction: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [tags, setTags] = useState("");
  const [statement, setStatement] = useState("# Statement\n\n");
  const [timeLimit, setTimeLimit] = useState(2000);
  const [memoryLimit, setMemoryLimit] = useState(128000);
  const [hidden, setHidden] = useState(false);
  const [testCases, setTestCases] = useState<ProblemTestCaseCreate[]>([
    { stdin: "", expected_output: "", is_sample: true },
  ]);

  function updateTestCase(index: number, patch: Partial<ProblemTestCaseCreate>) {
    setTestCases((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await runAction(
      () =>
        api.problems.create({
          slug,
          title,
          statement,
          difficulty,
          tags: tags.split(",").map((item) => item.trim()).filter(Boolean),
          time_limit_ms: timeLimit,
          memory_limit_kb: memoryLimit,
          hidden,
          test_cases: testCases,
        }),
      "Problem created.",
    );
    setSlug("");
    setTitle("");
    setStatement("# Statement\n\n");
    setTestCases([{ stdin: "", expected_output: "", is_sample: true }]);
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <Panel>
        <h2 className="mb-4 text-2xl font-black">Create Problem</h2>
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Slug">
              <Input value={slug} minLength={2} maxLength={80} pattern="^[A-Za-z0-9_-]+$" onChange={(event) => setSlug(event.target.value)} required />
            </Field>
            <Field label="Title">
              <Input value={title} minLength={3} maxLength={200} onChange={(event) => setTitle(event.target.value)} required />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Difficulty">
              <Select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            </Field>
            <Field label="Time ms">
              <Input type="number" min={100} max={30000} value={timeLimit} onChange={(event) => setTimeLimit(Number(event.target.value))} />
            </Field>
            <Field label="Memory KB">
              <Input type="number" min={16000} max={1024000} value={memoryLimit} onChange={(event) => setMemoryLimit(Number(event.target.value))} />
            </Field>
          </div>
          <Field label="Tags">
            <Input value={tags} onChange={(event) => setTags(event.target.value)} />
          </Field>
          <Field label="Statement markdown">
            <Textarea value={statement} onChange={(event) => setStatement(event.target.value)} className="min-h-72 font-mono" required />
          </Field>
          <label className="flex items-center gap-3 font-black">
            <input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)} className="h-5 w-5 accent-coral" />
            Hidden
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black">Test Cases</h3>
              <Button type="button" variant="plain" onClick={() => setTestCases((rows) => [...rows, { stdin: "", expected_output: "", is_sample: false }])}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            {testCases.map((testCase, index) => (
              <div key={index} className="grid gap-3 rounded-lg border-[3px] border-ink bg-panel p-3 shadow-block-sm">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone={testCase.is_sample ? "bg-lemon text-ink" : "bg-panel text-ink"}>Case {index + 1}</Badge>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm font-black">
                      <input type="checkbox" checked={testCase.is_sample} onChange={(event) => updateTestCase(index, { is_sample: event.target.checked })} />
                      Sample
                    </label>
                    <button
                      type="button"
                      className={buttonClass("ghost")}
                      onClick={() => setTestCases((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}
                      disabled={testCases.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="stdin">
                    <Textarea value={testCase.stdin} onChange={(event) => updateTestCase(index, { stdin: event.target.value })} className="font-mono" />
                  </Field>
                  <Field label="expected output">
                    <Textarea value={testCase.expected_output} onChange={(event) => updateTestCase(index, { expected_output: event.target.value })} className="font-mono" />
                  </Field>
                </div>
              </div>
            ))}
          </div>
          <Button type="submit">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </form>
      </Panel>

      <Panel>
        <h2 className="mb-4 text-2xl font-black">Problem Inventory</h2>
        <div className="grid gap-3">
          {problems.map((problem) => (
            <div key={problem.id} className="rounded-lg border-[3px] border-ink bg-panel p-3 shadow-block-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-black">{problem.title}</div>
                  <div className="text-sm font-bold text-ink/60">{problem.slug}</div>
                </div>
                <Badge tone={difficultyTone(problem.difficulty)}>{problem.difficulty || "General"}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function AttachAdmin({
  contests,
  problems,
  runAction,
}: {
  contests: ContestRead[];
  problems: ProblemListItem[];
  runAction: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const publishedOrDraft = useMemo(() => contests.filter((contest) => contest.status !== "closed"), [contests]);
  const [contestId, setContestId] = useState("");
  const [problemId, setProblemId] = useState("");
  const [points, setPoints] = useState(100);
  const [orderIndex, setOrderIndex] = useState(1);

  useEffect(() => {
    if (!contestId && publishedOrDraft[0]) setContestId(publishedOrDraft[0].id);
    if (!problemId && problems[0]) setProblemId(problems[0].id);
  }, [contestId, problemId, problems, publishedOrDraft]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await runAction(
      () => api.problems.attachToContest(contestId, { problem_id: problemId, points, order_index: orderIndex }),
      "Problem attached.",
    );
  }

  return (
    <Panel>
      <h2 className="mb-4 text-2xl font-black">Attach Problem</h2>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void submit(event)}>
        <Field label="Contest">
          <Select value={contestId} onChange={(event) => setContestId(event.target.value)} required>
            {publishedOrDraft.map((contest) => (
              <option key={contest.id} value={contest.id}>
                {contest.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Problem">
          <Select value={problemId} onChange={(event) => setProblemId(event.target.value)} required>
            {problems.map((problem) => (
              <option key={problem.id} value={problem.id}>
                {problem.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Points">
          <Input type="number" min={1} max={10000} value={points} onChange={(event) => setPoints(Number(event.target.value))} />
        </Field>
        <Field label="Order">
          <Input type="number" min={1} value={orderIndex} onChange={(event) => setOrderIndex(Number(event.target.value))} />
        </Field>
        <div className="md:col-span-2">
          <Button type="submit" disabled={!contestId || !problemId}>
            <Link2 className="h-4 w-4" />
            Attach
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function SystemAdmin({
  queueStatus,
  workerStatus,
  isAdmin,
}: {
  queueStatus: QueueStatus | null;
  workerStatus: WorkerStatus | null;
  isAdmin: boolean;
}) {
  if (!isAdmin) {
    return <Notice tone="bg-coral text-lemon">Admin role is required for system status.</Notice>;
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <Panel>
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h2 className="text-2xl font-black">Queue</h2>
        </div>
        {queueStatus ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(queueStatus.redis).map(([key, value]) => (
              <Metric key={`redis-${key}`} label={`Redis ${key}`} value={value} tone="bg-aqua text-lemon" />
            ))}
            {Object.entries(queueStatus.database).map(([key, value]) => (
              <Metric key={`db-${key}`} label={`DB ${key}`} value={value} tone="bg-panel" />
            ))}
          </div>
        ) : (
          <Notice>Queue status unavailable.</Notice>
        )}
      </Panel>

      <Panel>
        <h2 className="mb-4 text-2xl font-black">Workers</h2>
        {workerStatus?.workers.length ? (
          <div className="grid gap-3">
            {workerStatus.workers.map((worker, index) => (
              <pre key={index} className="overflow-x-auto border-[3px] border-ink bg-ink p-3 text-xs font-bold text-lemon shadow-block-sm">
                {JSON.stringify(worker, null, 2)}
              </pre>
            ))}
          </div>
        ) : (
          <Notice>No worker heartbeat found.</Notice>
        )}
      </Panel>
    </section>
  );
}
