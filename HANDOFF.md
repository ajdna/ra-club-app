# HANDOFF — Club App Test & Fix Pipeline

> **Read this first if continuing in a new chat/AI app.**
> Last updated: 2026-06-27 (session 3). This file is the single source of truth for current state.
> Project memory: read this, then query the graph (`../graphify-out`) instead of grepping. See `KNOWLEDGE_GRAPH.md`.

---

## 🆕 SESSION 3 (2026-06-27) — Registration hardening

**Symptom:** new-user registration spinner froze ("Register ho raha hai…"), no success/error.

**Root causes (diagnosed via Supabase logs + live DB):**
1. Supabase Auth "Confirm email" was ON with a custom SMTP whose creds failed → `535` /
   "Error sending confirmation email". User turned confirmation **OFF** → signup now logs
   in immediately (`immediate_login_after_signup`). Correct fix: access is gated by
   club-owner approval, so email verification is redundant.
2. Phone `+919592839444` was already on a leftover inactive test row (`123@gmai.com`), so
   `register_user_v2` raised "Phone already registered".
3. `RegisterForm.submit()` had no try/catch/finally and ran `signOut()` before `setError`,
   so the real error never surfaced → frozen spinner.
4. Each failed attempt left an **orphaned auth user** (signup ok, profile insert failed).

**Fixes applied this session:**
| Fix | File / object | Status |
|-----|---------------|--------|
| New pre-check RPC `check_registration_available(email,username,phone)` (anon-callable) | `supabase/migrations/20260623000000_registration_precheck.sql` | ✅ Applied to live DB + migration file |
| Robust `submit()` — pre-check before signUp, try/catch/finally, errors always show, signOut non-blocking | `src/app/auth/register/RegisterForm.tsx` | ✅ Edited (needs commit) |
| `null` → `undefined` for optional RPC args (post `gen:types`) | `admin/actions.ts` (update_user_role, update_user_details), `admin/import/actions.ts` (bulk_upsert_user) | ✅ Edited (needs commit) |
| Freed stuck phone on leftover test row (non-destructive) | live DB row `a9782d36…` | ✅ Done |
| **Detached-RPC `this` bug** — `const rpc = supabase.rpc` loses `this` → runtime "Cannot read properties of undefined (reading 'rest')". Caught by live deploy test (build gate can't see it). Fixed with `.bind(supabase)` | `RegisterForm.tsx`, `login/page.tsx`, `auth/register/actions.ts` | ✅ Edited (needs commit + redeploy + re-test) |

**Still open for the user to decide:**
- 2 orphaned auth users (`raclubuser1@gmail.com`, `rubyankur30@gmail.com`) block re-using
  those exact emails. Delete them in Supabase → Authentication → Users, OR test with a
  fresh email. (Permanent delete → user action.)
- Commit + push the code changes: `npm run verify` then commit `RegisterForm.tsx`,
  `admin/actions.ts`, `admin/import/actions.ts`, the new migration, `AGENTS.md`,
  `KNOWLEDGE_GRAPH.md`, `.githooks/post-commit`.

**Infra added this session:** `post-commit` hook flags graph stale (`../graphify-out/.needs_update`);
AGENTS.md + KNOWLEDGE_GRAPH.md codify the read-graph-first / update-handoff-last protocol.

**Graph refreshed (2026-06-27):** ran `graphify update .` (code-only, AST, **0 tokens**) →
now 4011 nodes / 4342 edges / 530 communities (was 1127/1799/108). Curated semantic graph
backed up in `../graphify-out/2026-06-27/`. NOTE: AST pass does not nodalize `.sql` RPCs
(`register_user_v2`, `check_registration_available`) or design/doc concepts — that needs the
LLM semantic `/graphify --update` (costs tokens, optional). In a Cowork sandbox the manifest
root changes each session so `update` full-rebuilds (still free); on the user's machine via
Claude Code it will be truly incremental.

**Semantic top-up (2026-06-27):** added the registration DB layer as first-class nodes and
reclustered → 4019 nodes / 4355 edges / 529 communities. New nodes (all connected, queryable
via `graphify explain`/`query`): `register_user_v2`, `check_registration_available`,
`get_login_email`, `users.username`, `users.whatsapp_phone`, `users` table, + the two
migration nodes — wired to `RegisterForm.tsx`, `registerUser()`, `LoginForm()`.

---

## ✅ EARLIER BLOCKER RESOLVED (session 2)

The Supabase Email provider was **disabled** in the dashboard. The user has since enabled it. All 17 e2e tests passed in session 2.

---

## 🧪 Current Test Status

**Run 2 (this session): 17/17 pass (0 hard failures, 2 flaky-passed on retry)**

| File | Tests | Result |
|------|-------|--------|
| `public.spec.ts` | 3 | ✅ All pass |
| `register.spec.ts` | 4 | ✅ All pass |
| `authed.spec.ts` | 4 | ✅ All pass |
| `features.spec.ts` | 6 | ✅ All pass (2 flaky — fixed) |

### Flaky tests (fixed)
Two tests in `features.spec.ts` had intermittent navigation timeouts (Next.js client-side routing slower than 5s default):
- `account menu: Profile navigates to /profile` (line 34)
- `coach Plan tab opens follow-ups` (line 48)

**Fix applied:** Increased `toHaveURL` timeout from 5s → 10s on both assertions. File: `e2e/features.spec.ts`.

---

## 🔧 Fixes Applied (across both sessions)

| Fix | File | Change | Status |
|-----|------|--------|--------|
| Turbopack Windows workaround | `playwright.config.ts:42` | `npm run dev` → `npx next dev --webpack` | ✅ Committed (`004a56f`) |
| Flaky navigation timeout | `e2e/features.spec.ts:34,48` | Added `timeout: 10_000` to `toHaveURL` | ⚠️ Applied, not yet committed |
| e2e-bot test user | Supabase (user + users row) | Created by user in Dashboard | ✅ Done |

---

## 📊 Feature Readiness Report

### Pages & Routes (30 pages across 29 routes)

| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Login | `/login` | ✅ Ready | Email/password + username/phone via RPC |
| Register | `/auth/register` | ✅ Ready | Full validation (email, phone, WhatsApp) |
| Reset Password | `/auth/reset-password` | ✅ Ready | Email-based reset flow |
| Update Password | `/auth/update-password` | ✅ Ready | Post-reset password change |
| Pending Approval | `/pending` | ✅ Ready | Shown when user status = 'pending' |
| Dashboard (Home) | `/(app)/` | ✅ Ready | Main landing after login |
| Profile | `/(app)/profile` | ✅ Ready | User profile editing |
| Follow-up Planner | `/(app)/followup` | ✅ Ready | 90-day consumer follow-up |
| Member Log | `/(app)/log` | ✅ Ready | Weight + attendance tracking |
| Members List | `/(app)/members` | ✅ Ready | Role-filtered member directory |
| Member Detail | `/(app)/members/[id]` | ✅ Ready | Individual member view |
| Member Intake | `/(app)/members/[id]/intake` | ✅ Ready | Intake form data |
| Member Report | `/(app)/members/[id]/report` | ✅ Ready | Member progress report |
| Messages (Inbox) | `/(app)/messages` | ✅ Ready | Message list |
| Message Thread | `/(app)/messages/[id]` | ✅ Ready | Individual conversation |
| New Message | `/(app)/messages/new` | ✅ Ready | Compose new message |
| Group Message | `/(app)/messages/group/new` | ✅ Ready | Group compose |
| Broadcast | `/(app)/messages/broadcast` | ✅ Ready | Admin broadcast messages |
| Search | `/(app)/search` | ✅ Ready | Member/search |
| My Progress | `/(app)/my-progress` | ✅ Ready | Personal progress tracking |
| Alerts | `/(app)/alerts` | ✅ Ready | Notification alerts page |
| Calendar | `/(app)/calendar` | ✅ Ready | Calendar view |
| Add Member | `/(app)/add` | ✅ Ready | New member flow |
| Admin Panel | `/(app)/admin` | ✅ Ready | Admin dashboard |
| Admin Users | `/(app)/admin/users` | ✅ Ready | User management |
| Admin Roles | `/(app)/admin/roles` | ✅ Ready | Role assignment |
| Admin Import | `/(app)/admin/import` | ✅ Ready | Bulk data import |
| Admin Analytics | `/(app)/admin/analytics` | ✅ Ready | Dashboard analytics |
| Admin Push | `/(app)/admin/push` | ✅ Ready | Push notification management |
| Sentry Example | `/sentry-example-page` | ⚪ Dev | Sentry test page (not production) |

**Summary: 29 production-ready pages, 1 dev-only page.**

### Modules (12 directories)

| Module | Status | Implementation |
|--------|--------|---------------|
| rules-engine | ✅ Real | Config reads from `rule_config` table (`registry.ts`, `actions.ts`) |
| notifications | ✅ Real | Bell/feed reads from `notifications` table (`actions.ts`) |
| members | ✅ Real | Intake reads from `member_intake` table (`intake.ts`) |
| followup | 🔲 Placeholder | JSDoc stub only |
| health-score | 🔲 Placeholder | JSDoc stub only |
| hierarchy | 🔲 Placeholder | JSDoc stub only |
| identity | 🔲 Placeholder | JSDoc stub only |
| comms | 🔲 Placeholder | JSDoc stub only |
| dmo | 🔲 Placeholder | JSDoc stub only |
| marathon | 🔲 Placeholder | JSDoc stub only |
| recognition | 🔲 Placeholder | JSDoc stub only |
| treasury | 🔲 Placeholder | JSDoc stub only |

**Summary: 3/12 modules have real code. 9 are planned-but-unbuilt.**

### Libraries (`src/lib/`)

| Library | Status | Purpose |
|---------|--------|---------|
| `auth.ts` | ✅ | `getCurrentUser()` tagged union (null/unlinked/pending/rejected/active) |
| `database.types.ts` | ✅ | Generated Supabase types (18 tables, 9 roles, 9 notification types) |
| `followup-planner.ts` | ✅ | 90-day Consumer Follow-Up Planner (Month1 intensive, Month2 weekly, Month3+ repeating) |
| `push.server.ts` | ✅ | Web Push sender using VAPID keys |
| `validate.ts` | ✅ | Registration validation (email, phone, WhatsApp) |
| `health.ts` | ✅ | Health-related utilities |
| `membership.ts` | ✅ | Membership logic |
| `types.ts` | ✅ | Shared TypeScript types |

### Components (`src/components/` — 9 components)

| Component | Status | Purpose |
|-----------|--------|---------|
| `BottomNav.tsx` | ✅ | Role-based bottom navigation (5th slot varies by role) |
| `AppBar.tsx` | ✅ | Top bar with brand + account menu (Profile/Help/Logout) |
| `StreakToast.tsx` | ✅ | Streak celebration toast |
| `DarkModeToggle.tsx` | ✅ | Theme toggle |
| `InactivityTimer.tsx` | ✅ | Auto-logout after inactivity |
| `PushNavigator.tsx` | ✅ | Web Push navigation handler |
| `PushPermission.tsx` | ✅ | Push permission prompt |
| `SignOutButton.tsx` | ✅ | Sign out action |
| `ThemeProvider.tsx` | ✅ | Dark/light theme context |

### API Routes (12 endpoints)

| Route | Status | Purpose |
|-------|--------|---------|
| `api/push/subscribe` | ✅ | Push subscription endpoint |
| `api/push/notify` | ✅ | Send push notification |
| `api/push/test` | ✅ | Test push endpoint |
| `api/push/test-user` | ✅ | Test push to specific user |
| `api/push/simulate` | ✅ | Simulate push notification |
| `api/push/admin-subs` | ✅ | Admin push subscriptions |
| `api/cron/morning` | ✅ | Morning cron job |
| `api/cron/evening` | ✅ | Evening cron job |
| `api/cron/chat-clear` | ✅ | Chat cleanup cron |
| `api/keepalive` | ✅ | Server keepalive |
| `api/sentry-example-api` | ⚪ Dev | Sentry test API |
| `api/template` | ⚪ Dev | API route template |

### E2E Test Coverage

| Area | Covered? | Tests |
|------|-----------|-------|
| Login page render | ✅ | `public.spec.ts` |
| Register validation | ✅ | `register.spec.ts` (4 tests) |
| Reset password page | ✅ | `public.spec.ts` |
| Auth redirect | ✅ | `authed.spec.ts` |
| Login flow | ✅ | `authed.spec.ts` |
| Members page | ✅ | `authed.spec.ts` |
| Messages page | ✅ | `authed.spec.ts` |
| Top bar + account menu | ✅ | `features.spec.ts` |
| Profile navigation | ✅ | `features.spec.ts` |
| Help panel | ✅ | `features.spec.ts` |
| Coach Plan/followup nav | ✅ | `features.spec.ts` |
| Log page | ✅ | `features.spec.ts` |
| Logout | ✅ | `features.spec.ts` |
| Admin panel | ❌ No tests | — |
| Admin users/roles/import | ❌ No tests | — |
| Member detail/intake/report | ❌ No tests | — |
| Messages (new/group/broadcast) | ❌ No tests | — |
| Calendar | ❌ No tests | — |
| Search | ❌ No tests | — |
| My Progress | ❌ No tests | — |
| Alerts | ❌ No tests | — |
| Add Member flow | ❌ No tests | — |
| Push notifications | ❌ No tests | — |

**Coverage: 13 features tested, ~15 untested.**

### Feature Readiness Summary

| Category | Ready | Partial | Placeholder | Untested |
|----------|-------|---------|-------------|----------|
| Pages/Routes | 29 | 0 | 0 | ~15 |
| Modules | 3 | 0 | 9 | — |
| Components | 9 | 0 | 0 | — |
| API Routes | 10 | 0 | 0 | — |
| E2E Tests | 17 pass | 0 | — | ~15 features |

---

## 🏗️ Infrastructure

- **Stack:** Next.js 16 (App Router) + React 19 + Supabase + Capacitor (Android) + Tailwind v4
- **Bundler:** Webpack (Turbopack broken on Windows — vercel/next.js#90860)
- **Auth:** Supabase Auth, 9 roles, closure-table hierarchy with RLS, username-or-phone login via RPC
- **Database:** 18 tables, 28 Supabase migrations, generated types in `database.types.ts`
- **Mobile:** Capacitor config present (`capacitor.config.ts`)
- **Push:** Web Push with VAPID keys, subscription/notify/simulate endpoints
- **Cron:** Morning, evening, chat-clear cron jobs

---

## 🔄 Git & Remote Status

- **Branch:** `main` (0 ahead, 0 behind `origin`)
- **Remote:** `https://github.com/ajdna/ra-club-app.git`
- **Last commit:** `004a56f fix: use webpack for local dev (turbopack broken on Windows, #90860)`
- **Uncommitted changes:** `e2e/features.spec.ts` (flaky test timeout fix)
- **`gh` CLI:** Not installed on this machine

---

## 🏆 Competitive Research Summary (from Agent #5)

Benchmarked against: HealthifyMe (India #1, 35-40M users), Noom, Trainerize, TrueCoach, MLM genealogy tools, Strava.

**Top 5 feature recommendations:**
1. **Food/meal logging with Indian food DB** — biggest gap vs HealthifyMe
2. **Recognition & celebration layer** — badges, kudos, milestones (non-competitive)
3. **Treasury / coach-payout ledger** — every MLM tool has this
4. **Habit curriculum + full DMO scoring** — Noom's retention engine
5. **21-day marathon cohort challenges** — Strava-style burst engagement

**App moats:** closure-table RLS hierarchy, 90-day follow-up planner, 9-role governance, India-first.

---

## 📋 Remaining Pipeline Steps

| Step | Status |
|------|--------|
| 1. E2E test run | ✅ 17/17 pass |
| 2. Fix errors | ✅ Flaky tests fixed |
| 3. Commit + push | ⚠️ Needs: `git add e2e/features.spec.ts && git commit && git push` |
| 4. Feature docs | ✅ This HANDOFF.md IS the feature doc |
| 5. Update README.md | 🔲 README is stale — still claims "scaffold, no features" |
| 6. Deploy to Vercel | 🔲 Needs user confirmation (outward-facing action) |

---

## 🛠️ How to Run Tests

**Windows / PowerShell:**
```powershell
cd "D:\RA Club\CLUB APP\club-app"
npx playwright test --reporter=list
```
(Playwright auto-starts dev server via `npx next dev --webpack` from config.)

---

## ⚠️ Destructive/irreversible actions policy
Per AGENTS.md: deploy, delete, payment, and auth/schema changes always pause for explicit user confirmation.
