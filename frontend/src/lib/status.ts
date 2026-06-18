import type { ContestStatus, SubmissionStatus, UserRole } from "../api/types";

export function difficultyTone(difficulty: string | null | undefined): string {
  switch ((difficulty || "").toLowerCase()) {
    case "easy":
      return "bg-aqua text-lemon";
    case "medium":
      return "bg-panel text-ink";
    case "hard":
      return "bg-coral text-lemon";
    default:
      return "bg-violet text-lemon";
  }
}

export function submissionTone(status: SubmissionStatus): string {
  switch (status) {
    case "accepted":
      return "bg-aqua text-lemon";
    case "wrong_answer":
    case "time_limit_exceeded":
    case "runtime_error":
    case "compilation_error":
      return "bg-coral text-lemon";
    case "processing":
    case "queued":
      return "bg-panel text-ink";
    default:
      return "bg-ink text-lemon";
  }
}

export function contestTone(status: ContestStatus | "live" | "upcoming" | "ended" | "closed" | "draft"): string {
  switch (status) {
    case "published":
    case "live":
      return "bg-aqua text-lemon";
    case "upcoming":
      return "bg-panel text-ink";
    case "draft":
      return "bg-violet text-lemon";
    case "closed":
    case "ended":
      return "bg-ink text-lemon";
    default:
      return "bg-coral text-lemon";
  }
}

export function roleTone(role: UserRole): string {
  switch (role) {
    case "admin":
      return "bg-coral text-lemon";
    case "organizer":
      return "bg-aqua text-lemon";
    default:
      return "bg-panel text-ink";
  }
}
