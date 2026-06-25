# HANDOFF — Club App Test & Fix Pipeline

> **Read this first if continuing in a new chat/AI app.**
> Last updated: 2026-06-24. Session was running a 5-agent pipeline (test → fix → sync → docs) plus a competitive-research agent. This file is the single source of truth for current state.

---

## ⚡ IMMEDIATE NEXT ACTION (blocked on the user)

**The Supabase Email provider is DISABLED.** All 9 failing e2e tests fail because of this single config setting — it is NOT a code bug and NOT a user-account problem.

### What the user must do (2 minutes, Supabase Dashboard):

1. Open the Supabase project → **Authentication → Sign In / Providers**
2. Find **Email** in the provider list → click it → **toggle ON** (enable it)
3. Under Email settings, ensure:
   - ✅ **Confirm email** is ON (so we can use "Auto Confirm" for the test user)
   - ✅ **Allow email + password sign-in** is enabled
4. **Save.**

That's it. No code change required for this. After enabling, re-run the tests (commands below).

> Confirmed via direct API call:
> ```json
> { "error": { "message": "Email logins are disabled", "status": 422, "code": "email_provider_disabled" } }
> ```

---

## 📊 Current Test Status

**Run 1 (this session): 8 passed, 9 failed** — all 9 failures are the same root cause (email provider disabled).

### Passing (8) ✅ — no action needed
- `public.spec.ts` — all 3 (login page renders, register loads, reset-password loads)
- `register.spec.ts` — all 4 (page loads new fields, rejects bad email, rejects bad phone, whatsapp field logic)
- `authed.spec.ts:21` — logged-out visitor redirected to login

### Failing (9) ❌ — all blocked on Email provider being disabled
- `authed.spec.ts:26` — user can log in and leave login screen
- `authed.spec.ts:30` — members page loads after login
- `authed.spec.ts:36` — messages page loads after login
- `features.spec.ts:21` — top bar shows brand and account menu opens
- `features.spec.ts:30` — account menu: Profile navigates to /profile
- `features.spec.ts:37` — account menu: Help panel opens with contact message
- `features.spec.ts:45` — coach Plan tab opens follow-ups
- `features.spec.ts:51` — log page loads with weight + attendance
- `features.spec.ts:59` — account menu: Logout returns to login

All fail at the same line — `e2e/authed.spec.ts:15` / `e2e/features.spec.ts:15`:
```ts
await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
```
i.e. login never succeeds, page stays on `/login`.

---

## ✅ Fixes Already Applied (this session)

### Fix 2 — Playwright config: `--webpack` flag (DONE, committed-ready)
**File:** `playwright.config.ts` (line ~42)
**Change:** `command: "npm run dev"` → `command: "npx next dev --webpack"`
**Why:** Next.js 16 defaults to Turbopack, which is broken on Windows — it tries to read the Windows `NUL` device as a file, causing `OS error 1: Incorrect function`. Tracked at https://github.com/vercel/next.js/issues/90860.
**Status:** Applied. NOT yet committed to git.

### Fix 1 (original) — e2e-bot test user created in Supabase (USER DID THIS)
The user `e2e-bot@rubyankur.test` was created in Supabase Auth + linked in the `users` table with `status='active'`, `role='coach'`. This part is correct — the account exists and is properly configured. The ONLY remaining blocker is the Email provider being disabled.

---

## 🔄 How to Re-Run Tests (after enabling Email provider)

**Windows / PowerShell:**

```powershell
# Terminal 1 — start dev server (keep open)
cd "D:\RA Club\CLUB APP\club-app"
npx next dev --webpack

# Terminal 2 — run tests (new window)
cd "D:\RA Club\CLUB APP\club-app"
$env:BASE_URL="http://localhost:3000"
npx playwright test --reporter=list
```

**Verify the fix worked before running full suite:**
```powershell
cd "D:\RA Club\CLUB APP\club-app"
node -e "require('dotenv').config({path:'.env.local'});const {createClient}=require('@supabase/supabase-js');const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);s.auth.signInWithPassword({email:'e2e-bot@rubyankur.test',password:'E2eBot!Pass2026'}).then(r=>console.log(r.error?('FAIL: '+r.error.message):'LOGIN OK'))"
```
- If it prints `LOGIN OK` → Email provider is enabled, proceed to run the suite.
- If it still prints `FAIL: Email logins are disabled` → provider still off, re-check Supabase dashboard.

---

## 🗺️ The 5-Agent Pipeline (overall plan)

The user asked for 5 agents. We established they form a pipeline with shared state (so they run sequentially, not in parallel) except the research agent which is independent.

| # | Agent | Role | Status |
|---|-------|------|--------|
| 1 | E2E Tests | Run Playwright suite, report pass/fail | ✅ DONE (8 pass, 9 fail) |
| 5 | Competitive Research | Compare vs HealthifyMe/Noom/Trainerize/MLM tools | ✅ DONE (full report below) |
| 2 | Fix Errors | Fix what agent #1 finds | 🔄 BLOCKED — needs Email provider fix first |
| 3 | Git/Vercel Sync | Commit + deploy verified fixes | ⏳ Waiting on #2 |
| 4 | Feature Docs | Document readiness + suggestions | ⏳ Not started (can run anytime) |
| — | Coordinator | Merge all outputs, final report | ⏳ Last step |

### Why pipeline, not parallel
Agents #1–#4 share state (test runs against code the fixer edits; syncer commits what the fixer changed). The `dispatching-parallel-agents` skill forbids parallel work on shared state. Agent #5 (research) is read-only and was run in parallel. Agent #4 (docs) is also independent and can run anytime.

---

## 🏗️ Project Context (for a fresh AI session)

- **App:** Ruby Ankur Wellness Club App — wellness/weight-loss club management platform
- **Stack:** Next.js 16 (App Router) + React 19 + Supabase + Capacitor (Android) + Tailwind v4
- **Location:** `D:\RA Club\CLUB APP\club-app`
- **Architecture:** Modular monolith — 12 modules in `src/modules/` but only 3 have code (`rules-engine`, `notifications`, `members`); real logic lives in `src/lib/`. 9 modules are empty `export {};` placeholders.
- **Auth:** Supabase Auth, username-or-phone login mapped to email via `get_login_email` RPC, 9 roles, closure-table hierarchy with RLS.
- **⚠️ IMPORTANT:** README.md is stale (claims "scaffold, no features") — the app is actually substantially built (30 pages, 13 API routes).

### Key files for the fix/sync agents
- `playwright.config.ts` — test config (already patched with `--webpack`)
- `.env.local` — Supabase URL + anon key (git-ignored, present)
- `.env.test` — `TEST_EMAIL=e2e-bot@rubyankur.test`, `TEST_PASSWORD=E2eBot!Pass2026` (git-ignored, present)
- `src/app/login/page.tsx` — login form (calls `supabase.auth.signInWithPassword`)
- `src/lib/supabase/session.ts` — proxy/middleware that redirects unauthenticated users
- `src/lib/auth.ts` — `getCurrentUser()` returns tagged union (null/unlinked/pending/rejected/active)

### Node on this machine
Node is at `C:\Program Files\nodejs` and may not be on PATH. If `npm`/`npx` isn't found, run:
```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
```

---

## 📋 Agent #5 — Competitive Research Summary (COMPLETED)

Benchmarked against: HealthifyMe (India #1, 35-40M users), Noom, Trainerize, TrueCoach, MLM genealogy tools (Epixel/Global MLM), Strava.

**Top 5 feature adoption recommendations:**
1. **Food/meal logging with Indian food DB** (photo-AI later) — biggest gap; HealthifyMe's core loop. Effort: Large.
2. **Recognition & celebration layer** (badges, kudos, milestones — NON-competitive) — Strava kudos model. Effort: Medium.
3. **Treasury / coach-payout ledger** — every MLM tool has this. Effort: Large.
4. **Habit curriculum + full DMO scoring** — Noom's retention engine; aligns with self-motivation. Effort: Medium.
5. **21-day marathon cohort challenges** (opt-in) — Strava-style burst engagement. Effort: Medium.

**App's standout moats:** closure-table RLS-enforced hierarchy isolation, baked-in 90-day follow-up planner, 9-role governance, India-first by construction.

**One-line summary:** "Prioritize an Indian-food logging/tracking module first, then a celebration-only recognition layer and a coach-payout treasury — design any leaderboard as kudos, never competitive ranking, to protect the no-shaming principle."

---

## 🔜 After Email Provider is Fixed — Remaining Pipeline Steps

1. **Re-run e2e** (commands above). If all 17 pass → skip to step 3.
2. **Agent #2 (fix):** If any tests still fail after email provider fix, fix the actual code bug. Likely candidates if failures persist: user row status not 'active', test role mismatch (specs assume coach role sees Plan tab), or timing/timeout issues.
3. **Agent #3 (sync):** Commit the `playwright.config.ts` change (already applied) + any fixes from #2. Push to git. Deploy to Vercel (confirm with user first — this is an outward-facing action).
4. **Agent #4 (docs):** Update README.md to reflect actual feature set. Document feature readiness. Optionally incorporate Agent #5's competitive recommendations.
5. **Coordinator:** Final report to user with everything integrated.

### Commit message suggested (for when we sync)
```
fix: use webpack for local dev (turbopack broken on Windows, #90860)
```

---

## 🚨 Destructive/irreversible actions policy
Per AGENTS.md: deploy, delete, payment, and auth/schema changes always pause for explicit user confirmation. Do NOT commit, push, or deploy without asking the user first in the current chat.
