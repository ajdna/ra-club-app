# Spec — `followup` module + 1st-home-visit anchor + team health pointers

> **Checkpoint 1 of the execution plan.** Phase 1. Updated per owner: the 90-day schedule is anchored to the **1st home visit**, not enrollment (there's a 5–7 day gap until the member receives product). The 1st home visit template is filled by the member's 1st **active supervisor/coach**, and key health pointers (AI-derived) are visible to the whole coaching team.
>
> **Owner-approved (2026-06-27):** 1A approved to build. 1B = **AI-later** — ship the pointers
> card with rule-based draft + manual override now; real AI (Haiku) stays behind `ff_ai_pointers`
> (default OFF) until an `ANTHROPIC_API_KEY` is added. No new cost now.
>
> **Split into two shippable features** (independent branches/flags/rollback):
> - **1A — Follow-up engine + 1st-home-visit anchor + intake recording UI** · branch `feat/followup-module` · flag `ff_followup_v2` · model `sonnet`, review `opus`. **← building now**
> - **1B — Team-visible health pointers** · branch `feat/health-pointers` · flag `ff_ai_pointers` · AI deferred. Depends on 1A.

---

## Key model change: anchor = 1st home visit date
- Enrollment/approval does **not** start the 90-day plan. Product arrives 5–7 days later; **Day 1 = the 1st home visit.**
- `member_intake.visit_date` is that anchor. `generateForMember(..., startDate = visit_date)`.
- The 1st home visit template = the **`member_intake` form** (already has 24 fields incl. `visit_date`, `recorded_by`). Recording it is the trigger that generates the schedule.

---

# Feature 1A — Follow-up engine + anchor + intake UI

## Goal
Extract the planner into `src/modules/followup/`, remove duplicated generation, make cadence configurable, and drive generation from the **1st home visit** intake submission (anchored at `visit_date`), filled by the member's active coach/supervisor.

## Current state
- `src/lib/followup-planner.ts` — pure `generateFollowupTasks(startDate, months)`. No tests.
- `src/app/(app)/followup/actions.ts` — `markTaskDone`, `scheduleHomeVisit`, `setMeetingLink`, `clearOverdueTasks`.
- `src/app/(app)/admin/import/actions.ts` — duplicated `generateAndInsertTasks`.
- `member_intake` table exists (full template incl. `visit_date`, `recorded_by`); **no coach UI to fill it** (roadmap gap).
- `members` has `join_date` only; no schedule today for self-registered→approved members.

## Scope (1A)
1. `src/modules/followup/` = single home for logic: `generate.ts` (`generateForMember`, `regenerateForMember`), `actions.ts` (`markDone`, `clearOverdue`), `index.ts` (public surface, re-export planner + types).
2. DRY: `import/actions.ts` calls `generateForMember`.
3. Cadence from `rule_config.followup_cadence` (`{months:12}` default).
4. **1st Home Visit form** (`/members/[id]/intake` — coach/supervisor facing): renders `member_intake` fields; on submit writes intake (with `visit_date`, `recorded_by = filler`) and, gated by `ff_followup_v2`, calls `generateForMember(memberId, coachId, visit_date)`.
5. **Authorization:** only the member's **active** coach/supervisor/jco/nco/owner may fill it — server check `can_see(member)` + role in the coaching set; `recorded_by` = the filler.
6. Idempotent: a 2nd intake submit updates intake + `regenerateForMember` (delete pending, regenerate from new `visit_date`).
7. Surface a **"1st home visit due"** prompt on the member card / coach home for approved members with no `visit_date` yet.
8. Unit tests for `generateFollowupTasks`.

## Flag / config / rollback (1A)
- `ff_followup_v2` (default OFF) gates schedule generation on intake submit. OFF = intake saves but no auto-gen (today's behavior).
- `rule_config.followup_cadence` — 🟢 I seed; reversible (delete key → default 12).
- Rollback: flag OFF (instant), git revert / Vercel promote (no schema change in 1A).

## Files (1A)
| File | Change |
|---|---|
| `src/modules/followup/{index,generate,actions}.ts` | NEW module |
| `src/app/(app)/followup/actions.ts` | import/re-export from module |
| `src/app/(app)/admin/import/actions.ts` | use `generateForMember` |
| `src/app/(app)/members/[id]/intake/*` | NEW / expand: coach-facing 1st-home-visit form + submit action |
| `src/lib/followup-planner.test.ts` | NEW unit tests |

## Acceptance (1A)
- [ ] One generation path; import still works; cadence from config.
- [ ] Filling the 1st home visit form (by an authorized active coach/supervisor) with `ff_followup_v2` ON generates the full schedule anchored at `visit_date`; OFF = no gen.
- [ ] Unauthorized user cannot submit the form.
- [ ] Planner unit tests pass; `verify` green; no `/followup` regression.

---

# Feature 1B — Team-visible health pointers (AI)

## Goal
Surface the key facts/health pointers about a member to the **whole coaching team** (anyone who can_see them), derived by **AI** from the intake.

## Design
- On 1st-home-visit intake submit, generate 3–6 concise pointers from intake fields (`health_challenge`, `purpose`, `energy`, `digestion`, `sleep`, `exercise`, `non_veg`, weights, age) — e.g. "Diabetic — watch sugar", "Low energy + poor sleep", "Goal: −8 kg in 90 days", "Veg only".
- Store on `member_intake.ai_pointers` (NEW `jsonb` column — reversible: drop column).
- Show a **Health Pointers card** on `/members/[id]` (and a compact line on the member list), visible to the whole coaching team via existing `can_see` RLS.
- Coaches can **edit/override** pointers (human-in-the-loop; AI is a draft).

## AI — cost decision (the one open item)
AI extraction needs an LLM call, which means an API key + per-call cost. Given your "no new cost yet" rule, I recommend:
- **Ship 1B structure now** (the `ai_pointers` column + team-visible card + manual entry/override + a free rule-based draft from intake fields).
- **Gate the real AI call behind `ff_ai_pointers`** (default OFF). Flip it on — and add an `ANTHROPIC_API_KEY` — when you're ready; uses cheap **Haiku**, one call per intake (fractions of a ₹ each).
- Until then the card still works (rule-based + manual), zero cost.

→ **Confirm:** (a) ship structure + rule-based now, AI behind flag later (recommended), or (b) wire the Haiku call now (needs an API key + accepts small per-intake cost)?

## Flag / rollback (1B)
- `ff_ai_pointers` (default OFF). Rollback: flag OFF, drop `ai_pointers` column (DOWN documented), git revert.

## Acceptance (1B)
- [ ] Pointers visible to the whole coaching team on member detail.
- [ ] Coach can edit/override.
- [ ] With `ff_ai_pointers` OFF: rule-based/manual pointers, no external calls.
- [ ] With ON + key: Haiku drafts pointers on intake submit.

---

## Build order
1A first (it produces the intake data 1B reads), then 1B. Each: branch → build (🔵 Claude Code, `sonnet`) → `verify` → 🟢 review + live test → tag → 🟡 flip flag for pilot.
