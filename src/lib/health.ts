/**
 * Lightweight member health signal derived from follow-up tasks. A proper
 * 5-signal composite (attendance, response, engagement, weight-log, stage) is
 * the job of the future `health-score` module; this is a v1 proxy so the
 * Members list can show Green / Yellow / Red today.
 *
 * Self-motivation principle: messages are warm and action-oriented, never
 * shaming.
 */
export type Health = "green" | "yellow" | "red";

export function computeHealth(opts: {
  overdue: number;
  dueToday: number;
}): { status: Health; label: string } {
  if (opts.overdue > 0)
    return {
      status: "red",
      label: `${opts.overdue} follow-up${opts.overdue > 1 ? "s" : ""} overdue`,
    };
  if (opts.dueToday > 0)
    return { status: "yellow", label: "Follow-up due today" };
  return { status: "green", label: "On track" };
}

export const HEALTH_DOT: Record<Health, string> = {
  green: "bg-good",
  yellow: "bg-warn",
  red: "bg-bad",
};
