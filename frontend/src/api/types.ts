export type UserRole = "admin" | "organizer" | "user";
export type ContestStatus = "draft" | "published" | "closed";
export type SubmissionStatus =
  | "queued"
  | "processing"
  | "accepted"
  | "wrong_answer"
  | "time_limit_exceeded"
  | "compilation_error"
  | "runtime_error"
  | "internal_error"
  | "cancelled";

export interface UserRead {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: UserRead;
}

export interface ContestRead {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  registration_deadline: string | null;
  status: ContestStatus;
  allowed_languages: string[];
  rules: Record<string, unknown>;
  created_by_id: string;
  participant_count: number;
  problem_count: number;
  created_at: string;
  updated_at: string;
}

export interface ContestCreate {
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  registration_deadline?: string | null;
  allowed_languages?: string[];
  rules?: Record<string, unknown>;
}

export type ContestPatch = Partial<
  Pick<
    ContestCreate,
    "title" | "description" | "start_time" | "end_time" | "registration_deadline" | "allowed_languages" | "rules"
  > & { freeze_leaderboard_at: string | null }
>;

export interface ContestRegistrationResponse {
  contest_id: string;
  user_id: string;
  registered: boolean;
}

export interface ContestParticipantRead {
  user_id: string;
  username: string;
  total_score: number;
  solved_count: number;
  penalty_seconds: number;
  rank: number | null;
  registered_at: string;
}

export interface ProblemTestCaseCreate {
  stdin: string;
  expected_output: string;
  is_sample: boolean;
}

export interface ProblemTestCaseRead {
  ordinal: number;
  stdin: string;
  expected_output: string;
  is_sample: boolean;
}

export interface ProblemListItem {
  id: string;
  slug: string;
  title: string;
  difficulty: string | null;
  tags: string[];
  solved_count: number;
  hidden: boolean;
  created_at: string;
}

export interface ProblemRead extends ProblemListItem {
  statement: string;
  time_limit_ms: number;
  memory_limit_kb: number;
  sample_test_cases: ProblemTestCaseRead[];
  test_case_count: number;
  updated_at: string;
}

export interface ProblemCreate {
  slug: string;
  title: string;
  statement: string;
  difficulty?: string | null;
  tags?: string[];
  time_limit_ms?: number;
  memory_limit_kb?: number;
  hidden?: boolean;
  test_cases: ProblemTestCaseCreate[];
}

export type ProblemPatch = Partial<
  Pick<ProblemCreate, "title" | "statement" | "difficulty" | "tags" | "time_limit_ms" | "memory_limit_kb" | "hidden" | "test_cases">
>;

export interface ContestProblemAttach {
  problem_id: string;
  points: number;
  order_index: number;
}

export interface ContestProblemRead {
  id: string;
  contest_id: string;
  problem_id: string;
  slug: string;
  title: string;
  points: number;
  order_index: number;
}

export interface SubmissionCreate {
  contest_id: string;
  problem_id: string;
  language: string;
  code: string;
}

export interface SubmissionTestResultRead {
  test_case_number: number;
  passed: boolean;
  status: string;
  verdict: string;
  time_ms: number;
  memory_kb: number;
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
}

export interface SubmissionRead {
  id: string;
  contest_id: string;
  problem_id: string;
  user_id: string;
  language: string;
  status: SubmissionStatus;
  idempotency_key?: string | null;
  points_awarded: number;
  max_time_ms?: number | null;
  max_memory_kb?: number | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  test_results: SubmissionTestResultRead[];
}

export interface SubmissionQueuedResponse extends SubmissionRead {
  queued: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  total_score: number;
  solved_count: number;
  penalty_seconds: number;
  last_accepted_at?: string | null;
}

export interface LeaderboardResponse {
  contest_id: string;
  source: string;
  entries: LeaderboardEntry[];
}

export interface LeaderboardSnapshotRead {
  id: string;
  contest_id: string;
  reason: string;
  snapshot: Record<string, unknown>[];
  created_at: string;
}

export interface QueueStatus {
  redis: Record<string, number>;
  database: Record<string, number>;
}

export interface WorkerStatus {
  workers: Array<Record<string, string>>;
}
