/**
 * Member intake — the "1st Home Visit Format" (page 1). Captured once at the
 * first home visit and editable later; it's the baseline for tracking progress.
 *
 * This registry is the single source of truth shared by the capture form and
 * the save action. The DB columns in member_intake match these keys.
 */

export type IntakeFieldType = "text" | "number" | "date" | "textarea";

export type IntakeField = {
  key: string;
  label: string;
  type: IntakeFieldType;
  hint?: string;
  group: "Basics" | "Health" | "Routine" | "Habits";
};

export const INTAKE_FIELDS: IntakeField[] = [
  // Basics
  { key: "visit_date", label: "Visit date", type: "date", group: "Basics" },
  { key: "age", label: "Age", type: "number", group: "Basics" },
  { key: "height_cm", label: "Height (cm)", type: "number", group: "Basics" },
  { key: "start_weight", label: "Weight at start (kg)", type: "number", group: "Basics" },
  { key: "ideal_weight", label: "Ideal weight (kg)", type: "number", group: "Basics" },
  { key: "family_members", label: "Family members", type: "text", group: "Basics" },

  // Health
  {
    key: "health_challenge",
    label: "Health challenge / pain",
    type: "textarea",
    hint: "leg pain, back pain, headache…",
    group: "Health",
  },
  { key: "purpose", label: "Purpose of joining", type: "textarea", group: "Health" },
  { key: "energy", label: "Energy", type: "text", group: "Health" },
  {
    key: "digestion",
    label: "Digestion",
    type: "text",
    hint: "constipation, gas, acidity, burps",
    group: "Health",
  },
  {
    key: "sleep",
    label: "Sleep",
    type: "text",
    hint: "raat ko uthna, snoring",
    group: "Health",
  },

  // Routine (timings)
  { key: "wake_up_time", label: "Wake up time", type: "text", group: "Routine" },
  { key: "sleeping_time", label: "Sleeping time", type: "text", group: "Routine" },
  { key: "breakfast_time", label: "Breakfast time", type: "text", group: "Routine" },
  { key: "mid_meal_1", label: "Mid-meal 1", type: "text", group: "Routine" },
  { key: "lunch_time", label: "Lunch", type: "text", group: "Routine" },
  { key: "mid_meal_2", label: "Mid-meal 2", type: "text", group: "Routine" },
  { key: "dinner_time", label: "Dinner", type: "text", group: "Routine" },
  { key: "exercise", label: "Exercise", type: "text", group: "Routine" },
  { key: "water_intake", label: "Water intake", type: "text", group: "Routine" },

  // Habits
  { key: "fruit_salad", label: "Fruit / salad", type: "text", group: "Habits" },
  { key: "tea", label: "Tea / coffee", type: "text", group: "Habits" },
  { key: "non_veg", label: "Non-veg", type: "text", group: "Habits" },
  { key: "notes", label: "Other notes", type: "textarea", group: "Habits" },
];

export const INTAKE_GROUPS = ["Basics", "Health", "Routine", "Habits"] as const;

export const NUMERIC_INTAKE_KEYS = INTAKE_FIELDS.filter(
  (f) => f.type === "number",
).map((f) => f.key);

export type IntakeRecord = Record<string, string | number | null>;
