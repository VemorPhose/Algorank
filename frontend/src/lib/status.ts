import type { ContestStatus, SubmissionStatus, UserRole } from "../api/types";

export function difficultyTone(difficulty: string | null | undefined): string {
  switch ((difficulty || "").toLowerCase()) {
    case "easy":
      return "bg-grass text-ink";
    case "medium":
      return "bg-lemon text-ink";
    case "hard":
      return "bg-coral text-white";
    default:
      return "bg-aqua text-ink";
  }
}

export function submissionTone(status: SubmissionStatus): string {
  switch (status) {
    case "accepted":
      return "bg-grass text-ink";
    case "wrong_answer":
    case "time_limit_exceeded":
    case "runtime_error":
    case "compilation_error":
      return "bg-coral text-white";
    case "processing":
    case "queued":
      return "bg-lemon text-ink";
    default:
      return "bg-ink text-white";
  }
}

export function contestTone(status: ContestStatus | "live" | "upcoming" | "ended" | "closed" | "draft"): string {
  switch (status) {
    case "published":
    case "live":
      return "bg-grass text-ink";
    case "upcoming":
      return "bg-aqua text-ink";
    case "draft":
      return "bg-lemon text-ink";
    case "closed":
    case "ended":
      return "bg-ink text-white";
    default:
      return "bg-violet text-white";
  }
}

export function roleTone(role: UserRole): string {
  switch (role) {
    case "admin":
      return "bg-coral text-white";
    case "organizer":
      return "bg-violet text-white";
    default:
      return "bg-aqua text-ink";
  }
}
