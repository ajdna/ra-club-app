# Feature Roadmap & Comprehensive Test Plan

> **Status:** Draft for review · **Author:** ZCode agent · **Date:** 2026-06-26
> **Scope:** (1) Audit + recommend add/remove/keep for 9 placeholder modules,
> (2) prioritization framework, (3) comprehensive E2E test plan for ~15 untested features.

---

## 0. TL;DR

- **9 stub modules** audited. **Keep 7, cut 2, add 1 net-new.**
- **Cut:** `comms` (duplicate of working messaging), `treasury` (out of scope for v1, high fraud/payment risk).
- **Keep + build next:** `followup`, `health-score`, `identity`, `hierarchy`, `dmo`, `recognition`, `marathon`.
- **Add net-new:** `food-logging` module (biggest competitive gap vs HealthifyMe).
- **Prioritization framework:** 4-axis score (Moat Fit × User Value × Cost-to-Build × Revenue Impact).
- **Test plan:** 4 new spec files closing the ~15-feature gap, organized by role + risk.

---

## 1. Prioritization Framework

Every candidate feature is scored 1–5 on four axes. Final score = weighted sum.

| Axis | Weight | Question it answers |
|---|---|---|
| **Moat Fit (MF)** | 0.30 | Does it reinforce our unique advantage (closure-table RLS hierarchy, 90-day follow-up, 9-role governance, India-first)? |
| **User Value (UV)** | 0.30 | How much daily/weekly value does it create for owner/coach/member? |
| **Cost-to-Build (CB)** | 0.20 | *Inverted* — 5 = cheap/fast (schema exists, UI is the work), 1 = expensive (new infra, payment/PII). |
| **Revenue Impact (RI)** | 0.20 | Does it directly drive retention, recharge, or coach payout? |

**Score = (MF×0.30) + (UV×0.30) + (CB×0.20) + (RI×0.20)** · Range 1.0–5.0.

### Tiers
- **4.0–5.0** → Build now (Phase 1)
- **3.0–3.9** → Build next (Phase 2)
- **2.0–2.9** → Hold / revisit
- **< 2.0** → Cut

---

## 2. Module Audit & Recommendations

### 2.1 Summary Table

| Module | DB Backing? | Score | Recommendation | Phase |
|---|---|---|---|---|
| `followup` | ✅ `follow_up_tasks` | **4.5** | **BUILD** — core moat | 1 |
| `health-score` | ⚠️ partial (signals exist, no score table) | **4.3** | **BUILD** — upgrades `health.ts` proxy | 1 |
| `identity` | ✅ `users`, `role_mappings` | **4.1** | **BUILD** — RBAC foundation | 1 |
| `hierarchy` | ✅ `hierarchy_closure` | **4.1** | **BUILD** — moat core | 1 |
| `food-logging` (NEW) | ❌ none | **4.0** | **ADD** — biggest competitive gap | 2 |
| `dmo` | ✅ `dmo_entries` | **3.9** | **BUILD** — coach retention | 2 |
| `recognition` | ⚠️ `ambassador_tier` only | **3.7** | **BUILD** — non-competitive celebration | 2 |
| `marathon` | ❌ none | **3.0** | **HOLD** — high build cost, seasonal | 3 |
| `comms` | ✅ (duplicates messaging) | **1.8** | **CUT** — redundant | — |
| `treasury` | ❌ none | **1.5** | **CUT (v1)** — payment/fraud risk, out of scope | — |

### 2.2 Module-by-Module Detail

#### BUILD NOW (Phase 1)

**`followup` — Score 4.5**
- *Why build:* The 90-day Consumer Follow-Up Planner is the app's signature moat. Logic already exists in `src/lib/followup-planner.ts` (full Month1/Month2/Repeat schedule, 3 cycles). The module stub is empty but the `follow_up_tasks` table and `/followup` page already work.
- *Gap:* No module layer — logic lives inline in the route page. Extract into `src/modules/followup/` with proper `generateForMember()`, `markDone()`, `clearOverdue()` actions. Consume `followup_cadence` from `rule_config`.
- *Effort:* Low-Medium. Schema + planner already exist; this is refactor + action extraction.

**`health-score` — Score 4.3**
- *Why build:* `src/lib/health.ts` already computes a v1 proxy (overdue/dueToday → Green/Yellow/Red). The module's JSDoc promises a proper 5-signal composite (attendance, response, engagement, weight-log, stage). This is the single biggest "feels cheap" gap — members list shows dots from a 2-signal proxy.
- *Gap:* No persistence of computed scores (recomputed on every page load = slow at scale). No intervention playbooks. No "Coach Wellness" sub-job.
- *Effort:* Medium. Add `health_scores` table + daily cron to persist. Read existing 5 signals from `attendance`, `weight_logs`, `members`.

**`identity` — Score 4.1**
- *Why build:* Auth works (`src/lib/auth.ts` returns tagged union), 9 roles defined in `types.ts`, but there is no module layer centralizing role assignment, capability checks, or the approval queue. The DB has `approve_user`, `reject_user`, `update_user_role` functions — but no admin UI to call them as a queue.
- *Gap:* Admin approval queue screen (currently `/pending` exists for users, but no owner-side queue).
- *Effort:* Medium. RBAC check helpers + approval queue UI.

**`hierarchy` — Score 4.1**
- *Why build:* Closure table (`hierarchy_closure`) + `can_see()` RLS function are fully built and used. But there is no visual team-tree / org-chart screen, and the module is empty. "Show my whole downline" is a top owner ask.
- *Gap:* No tree visualization. Sideline isolation is enforced in SQL but not surfaced in UI.
- *Effort:* Medium. Backend is done; this is a frontend tree component (collapsible nodes).

#### BUILD NEXT (Phase 2)

**`food-logging` (NEW module) — Score 4.0**
- *Why add:* Competitive research's #1 gap. HealthifyMe (India #1, 35-40M users) wins entirely on food logging. Our app tracks weight + attendance but has **zero** food/meal/diet input. For a *nutrition* club, this is the missing core.
- *Gap:* No table, no UI, no Indian food DB. Members can log weight but not what they ate.
- *Effort:* High. Needs new `food_logs` table, food search (IFCT or Edamam API for Indian foods), member-facing daily log UI. Start with free-text + photo (low-fidelity) before a full calorie DB.
- *Recommended MVP:* Photo + free-text meal log per day, coach can view. Defer calorie counting to v2.

**`dmo` — Score 3.9**
- *Why build:* `dmo_entries` table exists with full fields (calls_made, contact_list, new_guests, present_in_club, video_on_interaction, status_posts). Noom's retention engine is built on daily self-logging. The `dmo_weights` rule_config key exists but has no consumer. No UI screen exists for coaches.
- *Gap:* No `/dmo` route for coaches to log. No scoring display. "Self-motivation ONLY, never shames" principle not enforced.
- *Effort:* Medium. Schema ready; build coach daily-log UI + scoring display.

**`recognition` — Score 3.7**
- *Why build:* `ambassador_tier` field exists on users (8 tiers: ambassador → emerald). `ambassador_tiers` rule_config key exists. Non-competitive celebration (badges, kudos, milestones) is a proven retention driver and fits the wellness/MLM culture. Brand `--gold` token is defined for exactly this.
- *Gap:* No gift catalog, no tier ladder visualization, no milestone cascade.
- *Effort:* Medium-High. Gift engine + tier logic + celebration UI.

#### HOLD (Phase 3)

**`marathon` — Score 3.0**
- *Why hold:* Strava-style 21-day cohort challenges are great burst engagement, but there's no schema, no evidence-upload pipeline, no Telegram integration. High build cost with seasonal/niche payoff. Build *after* the core nutrition loop (food-logging) exists.
- *Effort:* High. New tables (cohorts, evidence, leaderboard) + file uploads + 3rd-party integration.

#### CUT

**`comms` — Score 1.8 → CUT**
- *Why cut:* The JSDoc describes "personalized broadcasts, team spaces, knowledge hub" — but **all of this already exists** as real, working code in the messaging system (`chat_threads` with direct/broadcast/group types, `/messages/broadcast`, `/messages/group/new`, `broadcast_groups` saved filters, `message_reactions`, pinned messages). The stub is redundant. Rename this module's intent as "messaging extensions" or delete it.

**`treasury` — Score 1.5 → CUT (v1)**
- *Why cut:* Multi-tenant treasury hubs, payment routing, coach payouts, cash-profit distribution. This is a **full fintech product** — payment fraud risk, regulatory exposure (Indian payment laws), reconciliation complexity, and zero existing schema. It does not belong in a wellness/engagement v1. If payouts are needed, use an external tool (Razorpay/Stripe) and track results in a simple ledger later. **Flag for owner decision — this is a product-scope call, not an engineering one.**

---

## 3. Net-New Feature Recommendations (beyond modules)

| Feature | Rationale | Effort |
|---|---|---|
| **Admin approval queue** (`/admin/approvals`) | `approve_user`/`reject_user` exist but no owner UI to call them as a queue | Low |
| **Intake form recording UI** | `member_intake` has 24 rich fields; no coach screen to fill them | Medium |
| **Weight trend chart** | Home + my-progress show weight but no visual line chart (brief calls for it) | Low (add `recharts`) |
| **PWA install prompt + offline shell** | Brief mandates PWA; current push works but install/offline unclear | Medium |
| **README rewrite** | Still says "scaffold, no features" — factually wrong (29 pages built) | Trivial |

---

## 4. Comprehensive Test Plan

### 4.1 Current State
- **17 tests pass** across 4 files: `public.spec.ts` (3), `register.spec.ts` (4), `authed.spec.ts` (4), `features.spec.ts` (6).
- **~15 features untested.** All existing tests use a shared `login()` helper gated on `TEST_EMAIL`/`TEST_PASSWORD`.

### 4.2 Conventions (match existing)
- Playwright + `@playwright/test`.
- Each file `test.skip`s unless `TEST_EMAIL`/`TEST_PASSWORD` set (avoids touching real data).
- Public-page tests run anywhere (no login); authed tests need the test account.
- Selectors: prefer `getByRole` / `getByText` / `getByPlaceholder` over CSS. Hinglish copy is intentional — match it.
- Navigation assertions use `timeout: 10_000` (client routing is slow).
- **Safety rule:** tests that would mutateate real data (send real messages, create real members) submit *invalid* data so client validation blocks, OR are marked `test.fixme` with a note. Never create real DB rows from CI.

### 4.3 New Spec Files (4 files, ~22 tests)

#### File A: `e2e/admin.spec.ts` (authed, role-gated)
*Note: needs an admin/owner test account. If only the coach/member test account exists, gate the owner-only tests behind a separate `ADMIN_EMAIL`/`ADMIN_PASSWORD` env and `test.skip` otherwise.*

| # | Test | Asserts |
|---|---|---|
| 1 | admin panel loads for owner | `/admin` renders, not redirected |
| 2 | admin → users management | `/admin/users` loads, user list visible |
| 3 | admin → roles page | `/admin/roles` loads |
| 4 | admin → import page | `/admin/import` loads, import form visible |
| 5 | admin → analytics | `/admin/analytics` loads, a stat tile visible |
| 6 | admin → push management | `/admin/push` loads |
| 7 | non-admin redirected from `/admin` | coach/member → redirected away (RLS) |

#### File B: `e2e/members.spec.ts` (authed)
| # | Test | Asserts |
|---|---|---|
| 1 | members list renders rows | `/members` shows at least one row or empty state |
| 2 | member detail opens | click a member → URL `/members/[id]`, profile visible |
| 3 | intake (1st home visit) form renders for coach | `/members/[id]/intake` shows fields (visit_date, health_challenge, etc.) |
| 3a | intake blocked for member role | member account → submit action rejected (auth guard: coaching roles only) |
| 3b | intake submit validation | invalid/empty `visit_date` blocked before write (no real mutation) |
| 3c | *(fixme)* intake submit anchors schedule | with `ff_followup_v2` on + isolated test member → 90-day schedule generated from `visit_date`; mark `test.fixme` (mutates data) |
| 4 | member report tab | navigate to `/members/[id]/report`, renders |
| 5 | add-member form validation | `/add` rejects invalid phone (no real submit) |
| 6 | search page works | `/search`, type query, results or empty state |

#### File C: `e2e/messaging.spec.ts` (authed)
| # | Test | Asserts |
|---|---|---|
| 1 | new-message composer loads | `/messages/new` renders form |
| 2 | broadcast composer loads | `/messages/broadcast` renders |
| 3 | group composer loads | `/messages/group/new` renders |
| 4 | message thread opens | click thread → `/messages/[id]`, conversation visible |
| 5 | thread back-nav | from thread, back returns to `/messages` |
| *6* | *send message (fixme)* | *Real send — mark `test.fixme`, needs isolated test thread* |

#### File D: `e2e/misc-features.spec.ts` (authed)
| # | Test | Asserts |
|---|---|---|
| 1 | calendar renders | `/calendar` loads, month grid visible |
| 2 | my-progress renders | `/my-progress` loads (member view) |
| 3 | alerts/notifications renders | `/alerts` loads, feed or empty state |
| 4 | profile edit form | `/profile`, edit fields present |
| 5 | dark mode toggle works | click toggle, `html` gains/loses dark class |

### 4.4 Test Pyramid Note
The plan above is **E2E (Playwright)** only, matching the existing approach. For the new module logic (followup generation, health-score math, food-log validation), add **unit tests** in parallel (`*.test.ts` next to the source, run via `npm run test` / vitest if configured). Pure functions like `generateFollowupTasks()` and `computeHealth()` are ideal unit-test targets and currently have **zero** coverage.

---

## 5. Phased Build Order

| Phase | Modules/Features | Goal |
|---|---|---|
| **1 — Foundation (now)** | `followup`, `health-score`, `identity`, `hierarchy` + admin approval queue + README rewrite | Solidify the moat; close RBAC gaps |
| **2 — Core loop (next)** | `food-logging` (MVP), `dmo`, `recognition`, weight chart, intake UI | Complete the nutrition + retention loop |
| **3 — Burst engagement (later)** | `marathon`, PWA offline, treasury (re-evaluate) | Growth + monetization |

**Parallel track:** Test plan Files A–D + unit tests for new module logic.

---

## 6. Open Questions for Owner

1. **Treasury:** Confirm cut from v1? (Payment/fraud/regulatory scope.)
2. **Food logging MVP:** Photo + free-text only, or invest in Indian calorie DB (IFCT) upfront?
3. **Test accounts:** Is there an owner-level test account for admin tests, or only coach/member?
4. **Deploy:** README rewrite + Phase 1 — deploy to Vercel before or after Phase 1 work?
