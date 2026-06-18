import { describe, expect, it } from "vitest";
import { contestPhase, formatDuration, titleCase } from "../lib/format";
import type { ContestRead } from "../api/types";

const baseContest: ContestRead = {
  id: "c1",
  title: "Weekly",
  description: null,
  start_time: "2026-01-01T10:00:00.000Z",
  end_time: "2026-01-01T12:00:00.000Z",
  registration_deadline: null,
  status: "published",
  allowed_languages: ["cpp"],
  rules: {},
  created_by_id: "u1",
  participant_count: 0,
  problem_count: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("format utilities", () => {
  it("formats penalty duration", () => {
    expect(formatDuration(65)).toBe("1m 5s");
    expect(formatDuration(7200)).toBe("2h 0m");
  });

  it("converts enum-ish strings to display text", () => {
    expect(titleCase("wrong_answer")).toBe("Wrong Answer");
  });

  it("derives contest phase from time and status", () => {
    expect(contestPhase(baseContest, new Date("2026-01-01T09:00:00.000Z"))).toBe("upcoming");
    expect(contestPhase(baseContest, new Date("2026-01-01T11:00:00.000Z"))).toBe("live");
    expect(contestPhase(baseContest, new Date("2026-01-01T13:00:00.000Z"))).toBe("ended");
  });
});
