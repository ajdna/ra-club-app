import { describe, it, expect } from "vitest";
import { generateFollowupTasks } from "./followup-planner";

// Planner always emits cycle 1 (MONTH1) + cycle 2 (MONTH2) regardless of months.
// Cycles 3..N use the repeating REPEAT pattern.
const M1 = 21;  // MONTH1 entries
const M2 = 11;  // MONTH2 entries (always emitted)
const REP = 11; // REPEAT entries per cycle

describe("generateFollowupTasks", () => {
  const start = new Date("2025-01-01");

  it("generates correct task count for 12 months", () => {
    const tasks = generateFollowupTasks(start, 12);
    expect(tasks.length).toBe(M1 + M2 + 10 * REP); // 142
  });

  it("always emits cycle 1 + cycle 2 even for months=1", () => {
    // Cycle 2 (MONTH2) is unconditional in the planner
    const tasks = generateFollowupTasks(start, 1);
    expect(tasks.length).toBe(M1 + M2);
  });

  it("months=2 also yields only cycle 1 + cycle 2 (no REPEAT yet)", () => {
    const tasks = generateFollowupTasks(start, 2);
    expect(tasks.length).toBe(M1 + M2);
  });

  it("cycle 1 = MONTH1, cycle 2 = MONTH2, cycle 3+ = REPEAT", () => {
    const tasks = generateFollowupTasks(start, 4);
    expect(tasks.filter((t) => t.cycle === 1).length).toBe(M1);
    expect(tasks.filter((t) => t.cycle === 2).length).toBe(M2);
    expect(tasks.filter((t) => t.cycle === 3).length).toBe(REP);
    expect(tasks.filter((t) => t.cycle === 4).length).toBe(REP);
  });

  it("due dates are monotonically non-decreasing across all tasks", () => {
    const tasks = generateFollowupTasks(start, 6);
    for (let i = 1; i < tasks.length; i++) {
      expect(tasks[i].due_date >= tasks[i - 1].due_date).toBe(true);
    }
  });

  it("first task due date equals start date", () => {
    expect(generateFollowupTasks(start, 1)[0].due_date).toBe("2025-01-01");
  });

  it("all activities are valid", () => {
    const valid = new Set(["call", "home_visit", "reminder"]);
    for (const t of generateFollowupTasks(start, 12)) {
      expect(valid.has(t.activity)).toBe(true);
    }
  });

  it("all due_dates match YYYY-MM-DD format", () => {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    for (const t of generateFollowupTasks(start, 3)) {
      expect(t.due_date).toMatch(iso);
    }
  });

  it("cycle boundaries align to 30-day windows", () => {
    const tasks = generateFollowupTasks(start, 3);
    // Cycle 2 starts at day 31 (offset 30), so minimum due in cycle 2 >= start+30
    const cycle2Dates = tasks.filter((t) => t.cycle === 2).map((t) => t.due_date);
    const startPlus30 = new Date("2025-01-31").toISOString().split("T")[0];
    expect(cycle2Dates[0] >= startPlus30).toBe(true);
  });
});
