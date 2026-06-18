import { clearSession, readSession, writeSession } from "../auth/session";
import type {
  ContestCreate,
  ContestParticipantRead,
  ContestPatch,
  ContestProblemAttach,
  ContestProblemRead,
  ContestRead,
  ContestRegistrationResponse,
  LeaderboardResponse,
  LoginRequest,
  ProblemCreate,
  ProblemListItem,
  ProblemPatch,
  ProblemRead,
  QueueStatus,
  RegisterRequest,
  SubmissionCreate,
  SubmissionQueuedResponse,
  SubmissionRead,
  TokenResponse,
  UserRead,
  WorkerStatus,
} from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "/api";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(formatDetail(detail) || `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: "required" | "optional" | "none";
  retryOnUnauthorized?: boolean;
};

let refreshPromise: Promise<TokenResponse> | null = null;

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = API_BASE_URL.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

function formatDetail(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }
  if (detail && typeof detail === "object" && "detail" in detail) {
    const value = (detail as { detail?: unknown }).detail;
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg: unknown }).msg);
          }
          return String(item);
        })
        .join(", ");
    }
  }
  return "";
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

async function refreshSession(): Promise<TokenResponse> {
  const session = readSession();
  if (!session?.refresh_token) {
    throw new ApiError(401, "Missing refresh token");
  }
  if (!refreshPromise) {
    refreshPromise = fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    })
      .then(async (response) => {
        const payload = await parseResponse<TokenResponse | unknown>(response);
        if (!response.ok) {
          throw new ApiError(response.status, payload);
        }
        writeSession(payload as TokenResponse);
        return payload as TokenResponse;
      })
      .catch((error) => {
        clearSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = "optional", retryOnUnauthorized = true, headers, ...requestInit } = options;
  const requestHeaders = new Headers(headers);
  const session = readSession();

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (auth !== "none" && session?.access_token) {
    requestHeaders.set("Authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...requestInit,
    headers: requestHeaders,
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && auth !== "none" && retryOnUnauthorized && session?.refresh_token) {
    await refreshSession();
    return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
  }

  const payload = await parseResponse<T | unknown>(response);
  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }
  return payload as T;
}

export const api = {
  auth: {
    register: (payload: RegisterRequest, bootstrapToken?: string) =>
      apiRequest<TokenResponse>("/auth/register", {
        method: "POST",
        auth: "none",
        headers: bootstrapToken ? { "X-Bootstrap-Token": bootstrapToken } : undefined,
        body: payload,
      }),
    login: (payload: LoginRequest) =>
      apiRequest<TokenResponse>("/auth/login", {
        method: "POST",
        auth: "none",
        body: payload,
      }),
    logout: (refreshToken: string) =>
      apiRequest<void>("/auth/logout", {
        method: "POST",
        auth: "none",
        body: { refresh_token: refreshToken },
      }),
    me: () => apiRequest<UserRead>("/auth/me", { auth: "required" }),
  },
  contests: {
    list: () => apiRequest<ContestRead[]>("/contests", { auth: "optional" }),
    get: (contestId: string) => apiRequest<ContestRead>(`/contests/${contestId}`, { auth: "optional" }),
    create: (payload: ContestCreate) =>
      apiRequest<ContestRead>("/contests", { method: "POST", auth: "required", body: payload }),
    patch: (contestId: string, payload: ContestPatch) =>
      apiRequest<ContestRead>(`/contests/${contestId}`, { method: "PATCH", auth: "required", body: payload }),
    publish: (contestId: string) =>
      apiRequest<ContestRead>(`/contests/${contestId}/publish`, { method: "POST", auth: "required" }),
    close: (contestId: string) =>
      apiRequest<ContestRead>(`/contests/${contestId}/close`, { method: "POST", auth: "required" }),
    register: (contestId: string) =>
      apiRequest<ContestRegistrationResponse>(`/contests/${contestId}/register`, {
        method: "POST",
        auth: "required",
      }),
    mine: () => apiRequest<ContestRead[]>("/me/contests", { auth: "required" }),
    participants: (contestId: string) =>
      apiRequest<ContestParticipantRead[]>(`/contests/${contestId}/participants`, { auth: "required" }),
  },
  problems: {
    list: () => apiRequest<ProblemListItem[]>("/problems", { auth: "optional" }),
    get: (problemIdOrSlug: string) =>
      apiRequest<ProblemRead>(`/problems/${problemIdOrSlug}`, { auth: "optional" }),
    create: (payload: ProblemCreate) =>
      apiRequest<ProblemRead>("/problems", { method: "POST", auth: "required", body: payload }),
    patch: (problemIdOrSlug: string, payload: ProblemPatch) =>
      apiRequest<ProblemRead>(`/problems/${problemIdOrSlug}`, {
        method: "PATCH",
        auth: "required",
        body: payload,
      }),
    attachToContest: (contestId: string, payload: ContestProblemAttach) =>
      apiRequest<ContestProblemRead>(`/contests/${contestId}/problems`, {
        method: "POST",
        auth: "required",
        body: payload,
      }),
    byContest: (contestId: string) =>
      apiRequest<ContestProblemRead[]>(`/contests/${contestId}/problems`, { auth: "optional" }),
  },
  submissions: {
    create: (payload: SubmissionCreate, idempotencyKey: string) =>
      apiRequest<SubmissionQueuedResponse>("/submissions", {
        method: "POST",
        auth: "required",
        headers: { "Idempotency-Key": idempotencyKey },
        body: payload,
      }),
    get: (submissionId: string) =>
      apiRequest<SubmissionRead>(`/submissions/${submissionId}`, { auth: "required" }),
    mine: () => apiRequest<SubmissionRead[]>("/me/submissions", { auth: "required" }),
    byContest: (contestId: string) =>
      apiRequest<SubmissionRead[]>(`/contests/${contestId}/submissions`, { auth: "required" }),
  },
  leaderboard: {
    get: (contestId: string) =>
      apiRequest<LeaderboardResponse>(`/contests/${contestId}/leaderboard`, { auth: "optional" }),
    live: (contestId: string) =>
      apiRequest<LeaderboardResponse>(`/contests/${contestId}/leaderboard/live`, { auth: "optional" }),
  },
  admin: {
    queueStatus: () => apiRequest<QueueStatus>("/admin/queue-status", { auth: "required" }),
    workers: () => apiRequest<WorkerStatus>("/admin/workers", { auth: "required" }),
  },
};
