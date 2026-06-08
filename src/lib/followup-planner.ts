/**
 * Consumer Follow-up Planner — Ruby Ankur Wellness Club
 *
 * Schedule extracted from the official Consumer Follow-Up Planner Excel.
 *
 * Month 1  (cycle 1, days 1-30): intensive daily contact
 * Month 2  (cycle 2, days 1-30): weekly cadence
 * Month 3+ (cycle 3+, days 1-30): repeating pattern forever
 */

export type FollowupActivity = "call" | "home_visit" | "reminder";

interface ScheduleEntry {
  day: number; // relative day within the 30-day cycle (1–30)
  activity: FollowupActivity;
  title: string;
}

export interface GeneratedTask {
  day_number: number; // relative day in cycle (1–30)
  cycle: number; // which 30-day cycle (1, 2, 3 …)
  activity: FollowupActivity;
  title: string;
  due_date: string; // YYYY-MM-DD
}

// ── Month 1 (intensive first 30 days) ──────────────────────────────────────
const MONTH1: ScheduleEntry[] = [
  { day: 1, activity: "home_visit", title: "1st Home Visit" },
  { day: 2, activity: "call", title: "Day 2 Call" },
  { day: 3, activity: "call", title: "Day 3 Call" },
  { day: 4, activity: "call", title: "Day 4 Call" },
  { day: 5, activity: "call", title: "Day 5 Call" },
  { day: 6, activity: "call", title: "Day 6 Call" },
  { day: 7, activity: "reminder", title: "Week 1 Reminder Call" },
  { day: 8, activity: "home_visit", title: "2nd Home Visit" },
  { day: 9, activity: "call", title: "Day 9 Call" },
  { day: 10, activity: "call", title: "Day 10 Call" },
  { day: 12, activity: "call", title: "Day 12 Call" },
  { day: 14, activity: "reminder", title: "Week 2 Reminder Call" },
  { day: 15, activity: "home_visit", title: "3rd Home Visit" },
  { day: 17, activity: "call", title: "Day 17 Call" },
  { day: 19, activity: "call", title: "Day 19 Call" },
  { day: 21, activity: "call", title: "Day 21 Call" },
  { day: 23, activity: "call", title: "Day 23 Call" },
  { day: 24, activity: "reminder", title: "Week 3 Reminder Call" },
  { day: 25, activity: "home_visit", title: "4th Home Visit" },
  { day: 26, activity: "call", title: "Day 26 Call" },
  { day: 29, activity: "call", title: "Day 29 Call" },
];

// ── Month 2 (days 31–60, stored as relative days 1–30) ─────────────────────
const MONTH2: ScheduleEntry[] = [
  { day: 2, activity: "call", title: "Month 2 Call" },
  { day: 4, activity: "reminder", title: "Month 2 Reminder Call" },
  { day: 5, activity: "home_visit", title: "5th Home Visit" },
  { day: 8, activity: "call", title: "Month 2 Call" },
  { day: 12, activity: "call", title: "Month 2 Call" },
  { day: 14, activity: "reminder", title: "Month 2 Reminder Call" },
  { day: 15, activity: "home_visit", title: "6th Home Visit" },
  { day: 19, activity: "call", title: "Month 2 Call" },
  { day: 24, activity: "reminder", title: "Month 2 Reminder Call" },
  { day: 25, activity: "home_visit", title: "7th Home Visit" },
  { day: 30, activity: "call", title: "Month 2 End Call" },
];

// ── Month 3+ repeating pattern (same every 30 days forever) ───────────────
const REPEAT: ScheduleEntry[] = [
  { day: 2, activity: "call", title: "Monthly Call" },
  { day: 4, activity: "reminder", title: "Reminder Call" },
  { day: 5, activity: "home_visit", title: "Monthly Home Visit" },
  { day: 9, activity: "call", title: "Mid-Month Call" },
  { day: 12, activity: "call", title: "Mid-Month Call" },
  { day: 14, activity: "reminder", title: "Mid-Month Reminder" },
  { day: 15, activity: "home_visit", title: "Mid-Month Home Visit" },
  { day: 20, activity: "call", title: "Late-Month Call" },
  { day: 24, activity: "reminder", title: "Month-End Reminder" },
  { day: 25, activity: "home_visit", title: "Month-End Home Visit" },
  { day: 29, activity: "call", title: "Month-End Call" },
];

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Generate all follow-up tasks for a member from their start date.
 *
 * @param startDate - member's 1st order / membership start date
 * @param months    - how many months to pre-generate (default 12 = 1 year)
 */
export function generateFollowupTasks(
  startDate: Date,
  months = 12,
): GeneratedTask[] {
  const tasks: GeneratedTask[] = [];

  // Cycle 1 — Month 1 (intensive)
  for (const e of MONTH1) {
    tasks.push({
      day_number: e.day,
      cycle: 1,
      activity: e.activity,
      title: e.title,
      due_date: addDays(startDate, e.day - 1), // day 1 = startDate
    });
  }

  // Cycle 2 — Month 2
  const c2Start = new Date(startDate);
  c2Start.setDate(c2Start.getDate() + 30);
  for (const e of MONTH2) {
    tasks.push({
      day_number: e.day,
      cycle: 2,
      activity: e.activity,
      title: e.title,
      due_date: addDays(c2Start, e.day - 1),
    });
  }

  // Cycles 3 to N — repeating pattern
  for (let cycle = 3; cycle <= months; cycle++) {
    const cStart = new Date(startDate);
    cStart.setDate(cStart.getDate() + (cycle - 1) * 30);
    for (const e of REPEAT) {
      tasks.push({
        day_number: e.day,
        cycle,
        activity: e.activity,
        title: e.title,
        due_date: addDays(cStart, e.day - 1),
      });
    }
  }

  return tasks;
}

/** Activity display label */
export const ACTIVITY_LABEL: Record<FollowupActivity, string> = {
  call: "📞 Call",
  home_visit: "🏠 Home Visit",
  reminder: "🔔 Reminder Call",
};
