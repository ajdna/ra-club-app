/**
 * Admin Console registry — declares which `rule_config` keys are editable and
 * how. Structured sections render labelled fields; `raw` sections offer a JSON
 * editor for richer shapes. Add a section here to expose a new setting — no
 * other code changes needed.
 */

export type Field = {
  path: string; // dot-path within the config value
  label: string;
  type: "text" | "number" | "textarea" | "csvnum" | "time";
  hint?: string;
};

export type Section = {
  key: string; // rule_config.key
  title: string;
  description: string;
  raw?: boolean; // edit the whole value as JSON
  fields?: Field[];
};

export const SECTIONS: Section[] = [
  {
    key: "ui_labels",
    title: "Screen labels",
    description:
      "Hinglish titles shown on screens. Edit and save — the screens update instantly, no deploy.",
    fields: [
      { path: "home_title", label: "Home title (Command Center)", type: "text" },
      { path: "members_title", label: "Members title", type: "text" },
      { path: "alerts_title", label: "Alerts title", type: "text" },
    ],
  },
  {
    key: "membership_labels",
    title: "Membership names",
    description:
      "Rename how membership tiers appear across the app (e.g. Basic→Silver, Elite→Gold). The underlying type keys stay the same, so existing members are unaffected.",
    fields: [
      { path: "basic", label: "Name for 'basic' tier", type: "text" },
      { path: "elite", label: "Name for 'elite' tier", type: "text" },
      { path: "privilege", label: "Name for 'privilege' tier", type: "text" },
    ],
  },
  {
    key: "pricing",
    title: "Pricing & membership",
    description: "GUMS pricing used across the app.",
    fields: [
      { path: "basic", label: "Basic price (₹)", type: "number" },
      { path: "elite", label: "Elite price (₹)", type: "number" },
      { path: "currency", label: "Currency", type: "text" },
      { path: "max_payments", label: "Max payments", type: "number" },
      {
        path: "upgrade_window_days",
        label: "Upgrade window (days)",
        type: "number",
      },
    ],
  },
  {
    key: "notifications",
    title: "Notifications & triggers",
    description:
      "Templates and timing for auto-notifications. Tokens like {name}, {milestone}, {days} get filled in at send time.",
    fields: [
      {
        path: "drop_off_inactive_days",
        label: "Drop-off after N inactive days",
        type: "number",
      },
      {
        path: "renewal_nudge_days",
        label: "Renewal nudge days",
        type: "csvnum",
        hint: "Comma-separated, e.g. 20, 25, 28, 30",
      },
      { path: "templates.milestone", label: "Milestone template", type: "textarea" },
      {
        path: "templates.recharge_due",
        label: "Recharge-due template",
        type: "textarea",
      },
      { path: "templates.drop_off", label: "Drop-off template", type: "textarea" },
    ],
  },
  {
    key: "followup_cadence",
    title: "90-day follow-up cadence",
    description: "Workflow: number of cycles and which days are visits/reminders.",
    raw: true,
  },
  {
    key: "dmo_weights",
    title: "DMO scoring weights",
    description: "Points per DMO activity (self-motivation scoring).",
    raw: true,
  },
  {
    key: "ambassador_tiers",
    title: "Ambassador tiers",
    description: "Consumer-count ranges per tier.",
    raw: true,
  },
  {
    key: "club_timings",
    title: "Club session times",
    description:
      "IST start times for morning and evening club sessions. The dispatch cron sends push reminders in the 15-min window after each time.",
    fields: [
      { path: "morning", label: "Morning club time", type: "time", hint: "e.g. 06:00" },
      { path: "evening", label: "Evening club time", type: "time", hint: "e.g. 18:00" },
    ],
  },
  {
    key: "session_timers",
    title: "⏱️ Session & chat timers",
    description:
      "Auto-logout on inactivity, warning countdown, and chat message auto-clear. Changes apply on next page load — no deploy needed.",
    fields: [
      {
        path: "inactivity_logout_minutes",
        label: "Auto-logout after N minutes of inactivity",
        type: "number",
        hint: "Default: 90 min. Timer resets on any mouse move, click, key press or scroll.",
      },
      {
        path: "inactivity_warn_minutes",
        label: "Show logout warning N minutes before",
        type: "number",
        hint: "Default: 2 min. A banner appears giving the user a chance to stay logged in.",
      },
      {
        path: "chat_auto_clear_hours",
        label: "Auto-delete chat messages older than N hours",
        type: "number",
        hint: "Default: 3 hours. Cron runs every hour. Set to 0 to disable auto-clear.",
      },
    ],
  },
];
