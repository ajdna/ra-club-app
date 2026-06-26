# Ruby Nutrition Center — Club App

Mobile-first PWA for **Ruby Nutrition Center** (organization **2A**, club code
**RA**). Used by the club owner, supervisors/coaches, and members to manage
members, track weight & attendance, run 90-day follow-ups, and message each
other. Copy is **Hinglish**. Built with Next.js 16, React 19, Supabase, and
Capacitor (Android).

> **Status: production-ready for first field trial.** 29 pages built, 17/17 E2E
> tests pass, lint + build clean. See `HANDOFF.md` for full state.

---

## What's built

### Core flows (all live)
- **Auth** — email/password + username login, registration with email/phone/WhatsApp validation, password reset, pending-approval state
- **Home dashboard** — role-aware: coaches see follow-ups + stats, members see streak/weight/today's tasks
- **Members** — searchable, filterable directory; per-member detail, intake form (24 fields), and progress report
- **Messaging** — direct, group, and broadcast threads; replies, reactions, pinned messages, read receipts, thread delete
- **Follow-ups** — 90-day Consumer Follow-Up Planner (Month 1 intensive → Month 2 weekly → Month 3+ repeating)
- **Self-logging** — members log weight + mark attendance; my-progress view with streaks
- **Admin console** — owner-only: users, roles, bulk import, analytics, push management, rules-engine config
- **Notifications** — 9 notification types (milestone, recharge-due, drop-off, reminders…), in-app feed + web push
- **Calendar, search, alerts** — full secondary screens

### Stack
- **Framework:** Next.js 16 (App Router, RSC) · React 19 · TypeScript
- **Styling:** Tailwind CSS v4, warm-earth design tokens (emerald / terra / cream), light + dark
- **Backend:** Supabase (Postgres + Auth + Realtime + Storage), 18 tables, closure-table hierarchy with RLS, 9 roles
- **Mobile:** PWA + Capacitor (Android) · web push via VAPID
- **Bundler:** Webpack (Turbopack is broken on Windows — vercel/next.js#90860)

---

## 1. Prerequisites

- **Node.js 18+** (this machine has v26). If `node`/`npm` aren't on your PATH,
  add `C:\Program Files\nodejs` or prefix your session:
  ```powershell
  $env:Path = "C:\Program Files\nodejs;" + $env:Path
  ```

All commands run from inside this `club-app` folder.

## 2. Run it locally

```powershell
npm install      # first time only
npm run dev      # NOTE: on Windows, use `npx next dev --webpack` (Turbopack is broken)
```

Open **http://localhost:3000**. You'll be redirected to `/login`.

```powershell
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint (flat config)
npm run test:e2e   # Playwright (auto-starts the dev server)
```

## 3. Environment

All keys live in **`.env.local`** (git-ignored). Copy from `.env.example` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...          # server-only — never expose to browser
CRON_SECRET=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...       # web push
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=...
PUSH_WEBHOOK_SECRET=...
```

Get Supabase keys from **Project Settings → API**. The `service_role` key is
**server-only** — never commit it or ship it to the browser. Database migrations
live in `supabase/migrations/` (28 applied to prod).

### E2E tests
Copy `.env.test.example` → `.env.test` and set a **dedicated test account**
(never your real admin login):
```
TEST_EMAIL=...
TEST_PASSWORD=...
```
Create the account in Supabase Dashboard → Authentication → Users, then approve
it in the app if needed. Without these, the logged-in tests auto-skip.

## 4. Project structure

```
club-app/
├─ src/
│  ├─ app/
│  │  ├─ login/  auth/  pending/        # auth flow
│  │  ├─ (app)/                          # authenticated shell
│  │  │  ├─ page.tsx                     # home / command center
│  │  │  ├─ members/  messages/  followup/  log/
│  │  │  ├─ my-progress/  calendar/  search/  alerts/  profile/  add/
│  │  │  └─ admin/                       # owner-only (users, roles, import, analytics, push)
│  │  ├─ api/                            # push, cron (morning/evening/chat-clear), keepalive
│  │  └─ globals.css                     # design tokens (source of truth)
│  ├─ components/                        # AppBar, BottomNav, DarkModeToggle, InactivityTimer, push…
│  ├─ lib/                               # auth, supabase clients, followup-planner, health, validate, types, database.types
│  └─ modules/                           # rules-engine, notifications, members (real); 9 planned stubs
├─ e2e/                                  # Playwright specs (17 tests)
├─ supabase/migrations/                  # 28 SQL migrations
├─ design/                               # screen prototypes (.dc.html) + tokens.json
├─ HANDOFF.md                            # ← read this first if continuing work
├─ CONTEXT_PACK.md                       # compact brief for sub-agents
└─ PROGRESS.md                           # append-only delta log
```

### Modules (`src/modules/`)
**3 real** (have working Supabase logic): `rules-engine`, `notifications`, `members`.
**9 planned stubs** (`export {};` with JSDoc): `followup`, `health-score`,
`hierarchy`, `identity`, `comms`, `dmo`, `marathon`, `recognition`, `treasury`.
Their logic currently lives inline in route pages + `src/lib/` — the stubs are
the intended future home. See `docs/superpowers/specs/` for the build roadmap.

## 5. Field-trial checklist

Before putting real users on it:
- [x] Lint clean (0 errors), build passes, 17/17 E2E tests pass
- [x] All env vars set, schema applied to prod
- [ ] **Deploy to Vercel** — coaches need a live URL (not `localhost`)
- [ ] **Create + approve role accounts** in Supabase (owner + coach + member)
- [ ] Configure custom SMTP in Supabase if expecting many signups (avoids Auth email rate limits)

## 6. Known limitations (v1)
- **Health score** is a 2-signal proxy (overdue/due-today → Red/Yellow/Green), not the full 5-signal composite
- **No food/meal logging** yet — biggest gap vs HealthifyMe (planned, see spec)
- **~15 features lack E2E coverage** (admin, member detail, messaging compose, calendar, search) — they work but aren't regression-protected
- **9 modules are stubs** — functionally fine via inline code, not yet refactored into the module layer

## 7. Continuing work / handoff

If resuming in a new AI session or with another developer, read these **in order**:
1. **`HANDOFF.md`** — single source of truth for current state, test status, pipeline
2. **`CONTEXT_PACK.md`** — compact brief (stack, brand tokens, key files, hard rules)
3. **`PROGRESS.md`** — recent delta log
4. **`docs/superpowers/specs/`** — feature roadmap + test plan

Hard rules (see `CONTEXT_PACK.md`): never change data/logic when restyling;
RLS/auth/schema changes flag for owner; gate = `npm run lint && npm run build`;
UI changes must work in **both light and dark**.

## Notes on this stack version
- **Next.js 16** renamed `middleware.ts` → **`proxy.ts`** — auth-session refresh lives in `src/proxy.ts`.
- **Tailwind v4** is configured via CSS (`@theme` in `globals.css`), not `tailwind.config.js`. Brand colors are utilities like `bg-terra`, `text-sage-d`, `border-line`.
- **React-Compiler eslint rules are OFF**; `rules-of-hooks` + `exhaustive-deps` are ON. `.claude/**` and `design/**` are lint-ignored.
