# Ruby Ankur Wellness — Club App · Technical Audit
**Pre-Launch Architecture Review · June 2026**
*Principal Software Architect — read-only analysis, no code changes*

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Frontend Documentation](#2-frontend-documentation)
3. [Backend Documentation](#3-backend-documentation)
4. [Supabase Documentation](#4-supabase-documentation)
5. [Infrastructure Documentation](#5-infrastructure-documentation)
6. [Mobile Readiness Assessment](#6-mobile-readiness-assessment)
7. [Technical Debt Assessment](#7-technical-debt-assessment)
8. [Architecture Diagram](#8-architecture-diagram)
9. [Data Flow Diagram](#9-data-flow-diagram)
10. [Deployment Diagram](#10-deployment-diagram)
11. [Launch Readiness Score](#11-launch-readiness-score)

---

## 1. Executive Summary

### What Has Been Built

Ruby Ankur Wellness Club App is a **full-stack, mobile-first club management platform** for a Herbalife-affiliated wellness club (Organisation 2A, Club Code RA) running the GUMS (Get Up, Move & Sweat) business model.

The application covers two operational tracks:
- **Health Track** — member onboarding, 1st Home Visit intake profiling, weight logging, daily attendance, 90-day follow-up task tracking, Green/Yellow/Red health signalling
- **Business Track** — coach DMO (Daily Method of Operation) self-scoring, hierarchical downline visibility, configurable GUMS pricing, notifications for milestones/recharges/drop-offs, Club Owner Admin Console (Rules Engine)

**Completed milestones (13 build steps):**
| Step | Feature | Status |
|------|---------|--------|
| 1 | Next.js scaffold (App Router, TS, Tailwind, Supabase) | ✅ Done |
| 2 | Database schema (all core tables + RLS) | ✅ Done |
| 3 | Authentication (email+password; OTP feature-flagged) | ✅ Done |
| 4 | Morning Command Center + Members list/detail/logging | ✅ Done |
| 5 | Admin Console / Rules Engine | ✅ Done |
| 6 | Configurable membership display names | ✅ Done |
| 7 | In-app notifications (bell + feed + config triggers) | ✅ Done |
| 8 | 1st Home Visit intake profile (23 fields, 4 groups) | ✅ Done |
| 9 | Deploy to Vercel | ⏳ Pending |

### Current Architecture

**Modular monolith** — one Next.js codebase, 12 domain modules with clear boundaries (ready to extract as scale demands). Supabase provides auth, database, and edge infrastructure. No custom server; fully serverless.

Pattern: **Server Components for reads → Server Actions for writes → RLS for enforcement**. All business logic parameters live in `rule_config` (JSONB table), edited via Admin Console with zero-deploy propagation.

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.7 |
| UI runtime | React | 19.2.4 |
| Language | TypeScript (strict) | ^5 |
| Styling | Tailwind CSS v4 | ^4 |
| Database / Auth / Storage | Supabase | @supabase/ssr ^0.10.3 |
| Fonts | Fraunces (display) + Manrope (body) | Google Fonts |
| Linter | ESLint | ^9 |
| Package manager | npm | (Node v26) |

### Deployment Architecture

Serverless, zero-infrastructure:
- **Frontend + API**: Vercel (Edge Network, global CDN, automatic HTTPS)
- **Database + Auth**: Supabase (PostgreSQL 15, GoTrue auth, Row Level Security)
- **Proxy layer**: Next.js 16 `proxy.ts` (renamed from middleware) — session refresh + auth redirect on every request
- **Storage**: Supabase Storage (not yet used; reserved for media uploads)
- **Edge Functions**: None yet (planned for background notification jobs)

---

## 2. Frontend Documentation

### Framework Used

**Next.js 16.2.7** with the **App Router** (React Server Components architecture). This is a breaking-change version — `middleware.ts` is renamed to `proxy.ts`, exporting `proxy()` instead of `middleware()`. Custom Next.js docs in `node_modules/next/dist/docs/` govern API choices.

### Folder Structure

```
club-app/
├── src/
│   ├── app/                        # Next.js App Router root
│   │   ├── layout.tsx              # Root layout: fonts (Fraunces + Manrope), metadata
│   │   ├── globals.css             # Tailwind v4 @theme tokens + warm-earth design system
│   │   ├── login/
│   │   │   └── page.tsx            # Public login page (Client Component)
│   │   └── (app)/                  # Route group: authenticated shell
│   │       ├── layout.tsx          # App shell: max-w-md container + BottomNav
│   │       ├── page.tsx            # / — Morning Command Center (Server Component)
│   │       ├── members/
│   │       │   ├── page.tsx        # /members — list + health filter (Server + Client)
│   │       │   ├── [id]/
│   │       │   │   ├── page.tsx    # /members/[id] — member detail (Server)
│   │       │   │   └── intake/
│   │       │   │       ├── page.tsx      # /members/[id]/intake (Server)
│   │       │   │       └── IntakeForm.tsx # 23-field intake form (Client)
│   │       │   ├── actions.ts      # "use server" — markPresent, logWeight, addMember, saveIntake
│   │       │   ├── MembersList.tsx # Client: search + filter list
│   │       │   ├── LogWeightForm.tsx     # Client: weight input
│   │       │   └── MarkPresentButton.tsx # Client: attendance button
│   │       ├── add/
│   │       │   ├── page.tsx        # /add — server page (reads pricing from rule_config)
│   │       │   └── AddMemberForm.tsx # Client: add member form
│   │       ├── admin/
│   │       │   ├── page.tsx        # /admin — Club Owner only (Server, role-guarded)
│   │       │   └── AdminConsole.tsx # Client: Rules Engine editor
│   │       ├── alerts/
│   │       │   ├── page.tsx        # /alerts — notification feed (Server)
│   │       │   └── AlertsFeed.tsx  # Client: auto-scan + mark read
│   │       └── profile/
│   │           └── page.tsx        # /profile — user card + sign-out
│   ├── components/
│   │   ├── BottomNav.tsx           # Client: 5-item nav with red badge for unread alerts
│   │   └── SignOutButton.tsx       # Client: Supabase signOut
│   ├── lib/
│   │   ├── auth.ts                 # getCurrentUser() / getAuthUser() — cached per request
│   │   ├── health.ts               # computeHealth() → Green/Yellow/Red + HEALTH_DOT map
│   │   ├── membership.ts           # membershipLabel() — enum → configurable display name
│   │   ├── types.ts                # Domain types: Role, MembershipType, MemberStage, etc.
│   │   └── supabase/
│   │       ├── client.ts           # Browser client (createBrowserClient)
│   │       ├── server.ts           # Server client (createServerClient + cookies)
│   │       └── session.ts          # updateSession() — proxy session refresh + redirects
│   ├── modules/                    # Domain modules (modular monolith)
│   │   ├── README.md               # Module map (12 modules × architecture alignment)
│   │   ├── members/
│   │   │   ├── index.ts            # getIntake(memberId)
│   │   │   └── intake.ts           # INTAKE_FIELDS registry (23 fields, 4 groups)
│   │   ├── notifications/
│   │   │   ├── index.ts            # getNotifications(), getUnreadCount()
│   │   │   └── actions.ts          # markRead, markAllRead, generateNotifications
│   │   ├── rules-engine/
│   │   │   ├── index.ts            # getConfigValue(), getConfigMap()
│   │   │   ├── registry.ts         # SECTIONS — Admin Console tab definitions
│   │   │   └── actions.ts          # setConfig() — Club Owner only
│   │   ├── hierarchy/index.ts      # Stub (closure-table queries — future)
│   │   ├── health-score/index.ts   # Stub (5-signal composite — future)
│   │   ├── dmo/index.ts            # Stub (DMO scoring — future)
│   │   ├── followup/index.ts       # Stub (90-day task gen — future)
│   │   ├── treasury/index.ts       # Stub (NCO/JCO ledger — future)
│   │   ├── recognition/index.ts    # Stub (gift engine — future)
│   │   ├── marathon/index.ts       # Stub (21-day cohorts — future)
│   │   ├── comms/index.ts          # Stub (broadcast + WhatsApp — future)
│   │   └── identity/index.ts       # Stub (role assignment — future)
│   └── proxy.ts                    # Next.js 16 Proxy (session refresh on all requests)
├── supabase/migrations/            # 10 ordered SQL migration files
├── public/                         # Static assets (default Next.js SVGs)
├── package.json                    # Dependencies
├── tsconfig.json                   # Strict TS, path alias @/* → src/*
├── postcss.config.mjs              # @tailwindcss/postcss plugin
├── eslint.config.mjs               # ESLint 9 flat config
└── .gitignore                      # Excludes .env*, node_modules, .next, .vercel
```

### Routing Structure

All routes use the **App Router** file-system convention. The `(app)` route group adds the authenticated shell layout without affecting URL paths.

```
/ (public)
└── /login                       — Email+Password login (Phone OTP feature-flagged)

/ (authenticated — (app) group)
├── /                            — Morning Command Center
├── /members                     — Members list (search + health filter)
├── /members/[id]                — Member detail (facts, intake summary, weight, attendance, tasks)
├── /members/[id]/intake         — 1st Home Visit capture/edit form
├── /add                         — Add new member form
├── /alerts                      — Notification feed (auto-scan on mount)
├── /profile                     — User profile + sign-out
└── /admin                       — Admin Console / Rules Engine (Club Owner only)

Proxy intercepts all routes except:
  _next/static, _next/image, favicon.ico, *.svg/png/jpg/jpeg/gif/webp
```

**Protection pattern:**
1. `proxy.ts` redirects unauthenticated requests to `/login?next=<path>` (optimistic check)
2. Each Server Component re-checks `getCurrentUser()` and redirects/gates independently (authoritative check)
3. RLS enforces data access at the database level (final layer)

### State Management Approach

**No global state library** (no Redux, Zustand, Jotai). State is handled at three levels:

| Level | Mechanism | Used for |
|-------|-----------|---------|
| Server state | React Server Components + `revalidatePath()` | All data fetching; mutations invalidate and refetch |
| Local UI state | `useState` / `useTransition` in Client Components | Form input, loading flags, error messages, filter selection |
| Cross-request cache | `React.cache()` wrapping `getCurrentUser()` / `getAuthUser()` | De-duplicate auth DB calls within a single request |

`revalidatePath()` is called in every Server Action after a successful mutation, propagating changes to all consuming routes instantly (no polling, no WebSocket).

### Component Architecture

**Pattern: Server Component shell → minimal Client Component leaf**

- Server Components own data fetching and pass serialisable props to client leaves
- Client Components handle: form interaction, `useTransition` for async Server Actions, local filter/search state
- No prop-drilling of auth state — every page calls `getCurrentUser()` independently (cached per request)

**Component inventory:**

| Component | Type | Responsibility |
|-----------|------|---------------|
| `RootLayout` | Server | Fonts, metadata, HTML shell |
| `AppLayout` | Server | Authenticated container (max-w-md), fetches unread count, renders BottomNav |
| `BottomNav` | Client | 5-tab navigation, red badge on Alerts |
| `SignOutButton` | Client | Supabase signOut |
| `MembersList` | Client | Search input + Green/Yellow/Red filter pills |
| `LogWeightForm` | Client | Weight input + Log button |
| `MarkPresentButton` | Client | Attendance toggle |
| `AddMemberForm` | Client | New member form |
| `AdminConsole` | Client | Rules Engine section editors (structured fields + raw JSON) |
| `AlertsFeed` | Client | Auto-scan on mount, mark-read interactions |
| `IntakeForm` | Client | 23-field grouped intake form |

**Design system — Warm Earth:**
- Fonts: Fraunces (display/headings) + Manrope (body) via `next/font/google`
- Tokens defined in `:root {}` (CSS custom properties) + `@theme inline {}` (Tailwind v4 bridge)
- Palette: cream `#f6efe3` · terra `#c2643a` · sage `#8a9a7b` · emerald `#1f3d2b` · gold `#c89a3c`
- Status: good `#4d7a4a` · warn `#c8902b` · bad `#b04830`
- Max app width: `max-w-md` (375–440px) — optimised for mobile, degrades gracefully on desktop

---

## 3. Backend Documentation

### APIs

There are **no REST or GraphQL API routes** in this codebase. All backend calls use:
1. **Supabase JS Client** (direct DB queries from Server Components and Server Actions — auth session forwarded via cookies)
2. **Next.js Server Actions** (`"use server"` files) — RPC-style mutations callable from Client Components

This means there are no `/api/` routes to document. The "API surface" is the set of exported Server Actions.

### Server Actions (Public Surface)

**`src/app/(app)/members/actions.ts`**

| Action | Parameters | Business Logic |
|--------|-----------|---------------|
| `markPresent(memberId)` | `string` | Upserts `attendance` row for today; idempotent (onConflict: member_id,date). Revalidates member detail + list + home. |
| `logWeight(memberId, weight)` | `string, number` | Validates range (0–500kg). Inserts `weight_logs` + updates `members.current_weight`. Revalidates member detail + list. |
| `addMember(formData)` | `FormData` | Calls `create_member()` SECURITY DEFINER RPC to bypass RLS race during closure-table insert. Revalidates members + home. |
| `saveIntake(memberId, formData)` | `string, FormData` | Upserts `member_intake` from INTAKE_FIELDS registry. Syncs `ideal_weight` and seeds `current_weight` if null. Revalidates member detail + intake + list. |

**`src/modules/rules-engine/actions.ts`**

| Action | Parameters | Business Logic |
|--------|-----------|---------------|
| `setConfig(key, value)` | `string, unknown` | Club Owner only (double-guarded: server check + RLS). Upserts `rule_config` JSONB. Revalidates admin + home + members + alerts. |

**`src/modules/notifications/actions.ts`**

| Action | Parameters | Business Logic |
|--------|-----------|---------------|
| `markRead(id)` | `string` | Sets `read_at = now()` on own notification. |
| `markAllRead()` | — | Sets `read_at = now()` on all unread own notifications. |
| `generateNotifications()` | — | Scans all visible members; evaluates 3 trigger rules (milestone / recharge_due / drop_off); dedupes by `type:member_id`; bulk-inserts. Templates + thresholds from `rule_config`. |

### Services (Module Layer)

**`src/lib/auth.ts`**
- `getAuthUser()` — wraps `supabase.auth.getUser()`; React-cached per request
- `getCurrentUser()` — joins auth user → `users` table via `auth_id`; returns `CurrentUser | "unlinked" | null`; React-cached per request

**`src/modules/rules-engine/index.ts`**
- `getConfigValue<T>(key, fallback)` — typed single-key read from `rule_config`
- `getConfigMap(keys[])` — multi-key batch read (single query)

**`src/modules/notifications/index.ts`**
- `getNotifications(limit?)` — returns ordered notification rows for current user
- `getUnreadCount()` — COUNT query using partial index on `read_at IS NULL`

**`src/modules/members/index.ts`**
- `getIntake(memberId)` — returns `member_intake` row or null

### Business Logic Layers

**Layer 1 — Proxy (every request)**
Session refresh via Supabase auth cookie sync. Optimistic auth redirect to `/login`. Runs in `proxy.ts`.

**Layer 2 — Server Components (per page load)**
Role-based gate (`getCurrentUser()` → redirect or show access-denied UI). Data fetching via server Supabase client (auth scoped via cookies, RLS applies).

**Layer 3 — Server Actions (per mutation)**
- Idempotency guards (e.g., weight validation, markPresent upsert)
- Role check: `getCurrentUser()` re-called inside every action (can't trust client)
- Supabase RLS re-enforces at DB level even if role check was somehow bypassed

**Layer 4 — PostgreSQL RLS + SECURITY DEFINER functions**
Final enforcement layer — all access policy lives in the database. Cannot be bypassed by client code or a leaked anon key.

**Notification trigger engine:**
The `generateNotifications()` action implements a simple rule evaluator:
- **Milestone**: `current_weight <= ideal_weight`
- **Recharge due**: `cycleDay >= firstNudge && cycleDay <= 31 && recharge_count < max_payments`
- **Drop-off**: `inactive_days >= drop_off_inactive_days` (configurable, default 5 days)
- All thresholds + templates stored in `rule_config`; Admin Console changes take effect on next scan

**Health signal engine:**
`computeHealth({overdue, dueToday})` in `src/lib/health.ts` is a v1 proxy:
- Red: any overdue follow-up tasks
- Yellow: tasks due today (none overdue)
- Green: no pending tasks

### External Integrations

| Integration | Status | Purpose |
|-------------|--------|---------|
| Supabase Auth (GoTrue) | ✅ Active | Email+Password sign-in, session cookies |
| Supabase Database (PostgreSQL) | ✅ Active | All application data |
| Google Fonts | ✅ Active | Fraunces + Manrope typefaces via `next/font` |
| Vercel | ⏳ Pending deployment | Hosting, CDN, serverless functions |
| SMS provider (Twilio/MSG91) | ⏳ Not configured | Phone OTP (code exists, feature-flagged off) |
| WhatsApp Business API | 🗓 Planned | Comms module (stub only) |
| FCM (Firebase Cloud Messaging) | 🗓 Planned | Push notifications (stub only) |
| Telegram | 🗓 Planned | Marathon module group integration |

---

## 4. Supabase Documentation

### Project Details
- **URL**: `https://ixibkiujxiecahvopgwu.supabase.co`
- **Region**: (auto-selected at creation)
- **Auth**: GoTrue, email+password enabled; Phone OTP available but not configured with SMS provider

### Database Schema

**10 migration files, applied in timestamp order:**

```
20260607090000_core.sql          — enums, users, hierarchy_closure, members, follow_up_tasks, dmo_entries, rule_config, SECURITY DEFINER helpers
20260607090100_rls.sql           — Row Level Security policies on all 6 tables
20260607090200_seed.sql          — Demo org tree (8 users, 3 members, tasks, DMO, rule_config seeds)
20260607093000_attendance_weight.sql — attendance + weight_logs tables + RLS
20260607093100_seed_activity.sql — Demo tasks/weights/attendance for health filter variety
20260607093200_create_member_fn.sql — create_member() SECURITY DEFINER RPC
20260607094000_membership_labels.sql — membership_labels rule_config row
20260607095000_notifications.sql — notifications table + RLS
20260607095100_seed_notifications_demo.sql — Sets Anjali at ideal weight, Vikram inactive 27d
20260607096000_member_intake.sql — member_intake table + RLS
```

### Tables

**`users`** — Org tree nodes (every person in the platform)
```sql
id              uuid PK (gen_random_uuid)
auth_id         uuid UNIQUE              -- links to auth.users.id
name            text NOT NULL
phone           text UNIQUE
email           text UNIQUE
role            user_role ENUM           -- upline|club_owner|nco|jco|coach|member|privilege|guest
parent_id       uuid → users(id)         -- upline in org tree
ambassador_tier text                     -- ambassador|silver|gold|platinum|elite_platinum|ruby|topaz|emerald
status          text DEFAULT 'active'
address, locale, timezone text
created_at      timestamptz
```
Indexes: `users_parent_id_idx`, `users_auth_id_idx`

**`hierarchy_closure`** — Closure table (downline + sideline isolation)
```sql
ancestor_id   uuid → users(id) ON DELETE CASCADE
descendant_id uuid → users(id) ON DELETE CASCADE
depth         int
PRIMARY KEY (ancestor_id, descendant_id)
```
Maintained by `add_to_closure()` AFTER INSERT trigger on `users`. Self-row (depth=0) added on insert. Each ancestor of parent gets a (ancestor, new_user, depth+1) row.
Indexes: `hierarchy_closure_ancestor_idx`, `hierarchy_closure_descendant_idx`

**`members`** — Health track data (1:1 with users who are members)
```sql
user_id         uuid PK → users(id) CASCADE
coach_id        uuid → users(id)
membership_type membership_type ENUM   -- basic|elite|privilege
stage           smallint 0–6
join_date       date
recharge_count  int DEFAULT 0
ideal_weight    numeric
current_weight  numeric
program_config  jsonb DEFAULT '{}'
```
Index: `members_coach_id_idx`

**`follow_up_tasks`** — 90-day consumer follow-up workflow
```sql
id           uuid PK
member_id    uuid → members(user_id) CASCADE
coach_id     uuid → users(id)
day_number   int 1–90
cycle        smallint 1–3
activity     followup_activity ENUM   -- call|home_visit|reminder
due_date     date
status       followup_status ENUM     -- pending|done|skipped
completed_at timestamptz
created_at   timestamptz
```
Indexes: `follow_up_tasks_member_idx`, `follow_up_tasks_coach_due_idx`

**`dmo_entries`** — Coach self-motivation daily scorecard
```sql
id                   uuid PK
coach_id             uuid → users(id) CASCADE
entry_date           date
present_in_club      int
video_on_interaction int
video_on_meet        int
status_posts         int
calls_made           int
new_guests           int
contact_list         int
second_shake         int
total                int GENERATED ALWAYS AS (sum of above) STORED
created_at           timestamptz
UNIQUE (coach_id, entry_date)
```

**`rule_config`** — Rules Engine / Admin Console (all configurable parameters)
```sql
id         uuid PK
key        text UNIQUE                  -- 'pricing'|'notifications'|'ui_labels'|etc.
value      jsonb                        -- arbitrary configuration shape
updated_by uuid → users(id)
updated_at timestamptz
```
Current keys and shapes:
```
pricing           → {basic:8400, elite:12070, currency:"INR", max_payments:2, upgrade_window_days:10}
dmo_weights       → {present_in_club:1, video_on_interaction:1, ...}
ambassador_tiers  → {ambassador:[2,4], silver:[5,6], gold:[7,9], ...}
followup_cadence  → {cycles:3, cycle_days:30, home_visit_days:[1,8,15,25], reminder_days:[7,14,24]}
notifications     → {drop_off_inactive_days:5, renewal_nudge_days:[20,25,28,30], templates:{...}}
ui_labels         → {home_title:"Aaj ka Plan", members_title:"Mere Members", alerts_title:"..."}
membership_labels → {basic:"Basic", elite:"Elite", privilege:"Privilege"}
```

**`attendance`** — Daily club check-in
```sql
id         uuid PK
member_id  uuid → members(user_id) CASCADE
date       date DEFAULT current_date
present    boolean DEFAULT true
marked_by  uuid → users(id)
created_at timestamptz
UNIQUE (member_id, date)
```

**`weight_logs`** — Weight history (members.current_weight = latest)
```sql
id         uuid PK
member_id  uuid → members(user_id) CASCADE
weight     numeric NOT NULL
logged_at  timestamptz DEFAULT now()
logged_by  uuid → users(id)
```
Index: `weight_logs_member_idx (member_id, logged_at DESC)`

**`notifications`** — In-app bell notifications
```sql
id         uuid PK
user_id    uuid → users(id) CASCADE   -- recipient
type       notification_type ENUM     -- milestone|recharge_due|drop_off|info
title      text NOT NULL
body       text
data       jsonb DEFAULT '{}'         -- {member_id: uuid}
read_at    timestamptz                -- null = unread
created_at timestamptz
```
Indexes: `notifications_user_idx (user_id, created_at DESC)`, `notifications_unread_idx (user_id) WHERE read_at IS NULL`

**`member_intake`** — 1st Home Visit profile (1:1 with members)
```sql
member_id        uuid PK → members(user_id) CASCADE
first_day        date
age              int
height_cm        numeric
start_weight     numeric
ideal_weight     numeric
family_members   text
health_challenge text
purpose          text
energy           text
digestion        text
sleep            text
wake_up_time     text
sleeping_time    text
breakfast_time   text
mid_meal_1       text
lunch_time       text
mid_meal_2       text
dinner_time      text
exercise         text
water_intake     text
fruit_salad      text
tea              text
non_veg          text
notes            text
recorded_by      uuid → users(id)
updated_at       timestamptz DEFAULT now()
```

### Table Relationships

```
auth.users (Supabase managed)
    │ auth_id
    ▼
users ──parent_id──▶ users (self-referential tree)
    │
    ├──▶ hierarchy_closure (ancestor_id, descendant_id, depth)
    │
    ├──▶ members (user_id 1:1)
    │        ├──▶ follow_up_tasks (member_id)
    │        ├──▶ attendance (member_id)
    │        ├──▶ weight_logs (member_id)
    │        └──▶ member_intake (member_id 1:1)
    │
    ├──▶ dmo_entries (coach_id)
    └──▶ notifications (user_id — recipient)

rule_config — standalone key/value store (no FK to users except updated_by)
```

### Row Level Security

**All 10 tables have RLS enabled.** Three helper SECURITY DEFINER functions underpin all policies:

```sql
app_user_id()   → uuid   -- current user's users.id (from auth.uid())
app_user_role() → user_role  -- current user's role
can_see(target) → bool   -- is target in current user's closure subtree?
```

**Policy matrix:**

| Table | SELECT | INSERT | UPDATE |
|-------|--------|--------|--------|
| `users` | `can_see(id)` | parent visible | target visible |
| `hierarchy_closure` | `ancestor_id = me` | — | — |
| `members` | `can_see(user_id)` | target or coach visible | target visible |
| `follow_up_tasks` | `can_see(member_id)` | member visible | member visible |
| `dmo_entries` | `can_see(coach_id)` | `coach_id = me` | `coach_id = me` |
| `rule_config` | `auth.uid() NOT NULL` | club_owner only | club_owner only |
| `attendance` | `can_see(member_id)` | member visible | member visible |
| `weight_logs` | `can_see(member_id)` | member visible | — |
| `notifications` | `user_id = me` | `user_id = me` | `user_id = me` |
| `member_intake` | `can_see(member_id)` | member visible | member visible |

**Sideline isolation** is automatic: the closure table only contains rows for direct ancestors/descendants. Coach A cannot see Coach B's members even at the same tree level.

### Authentication Setup

- **Provider**: Supabase GoTrue
- **Active method**: Email + Password (`supabase.auth.signInWithPassword()`)
- **Staged method**: Phone OTP (`supabase.auth.signInWithOtp()`) — code exists, hidden behind `NEXT_PUBLIC_ENABLE_PHONE_OTP=false`
- **Session**: JWT stored in cookies, refreshed on every request by `updateSession()` in `proxy.ts`
- **Auth → App link**: `users.auth_id = auth.uid()` — must be set manually in Supabase dashboard for each real user (seed users have `auth_id = null`)
- **Redirect after login**: `?next=<path>` preserved; authenticated users on `/login` redirect to `/`

### Storage Usage

**Not yet used.** Supabase Storage bucket exists (provisioned with project) but no upload code has been written. Planned for: member photos, marathon evidence (photo/video), Knowledge Hub assets.

### Edge Functions

**None deployed.** The `generateNotifications()` server action currently runs on-demand (triggered when the Alerts screen is opened). Production architecture should move this to a scheduled Edge Function (Supabase cron or Vercel cron job) to generate notifications even when no user opens the app.

---

## 5. Infrastructure Documentation

### Environment Variables

**Required — must be set in Vercel project settings:**

| Variable | Scope | Purpose | Where to find |
|----------|-------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser + server) | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (browser + server) | Supabase anon key (RLS-protected) | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_ENABLE_PHONE_OTP` | Public (browser) | Feature flag for Phone OTP UI | Set to `false` until SMS provider configured |

**Never expose / never commit:**
| Variable | Notes |
|----------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; bypasses RLS; for future background jobs only |

**Local development:** `.env.local` (git-ignored via `.env*` in `.gitignore`). Contains real Supabase URL and anon key.

### Secrets Used

| Secret | Type | Risk level | Notes |
|--------|------|-----------|-------|
| Supabase anon key | Public (safe) | Low | RLS enforces access; exposed to browser is intentional |
| Supabase URL | Public (safe) | Low | Not sensitive |
| Supabase service_role key | Private | **CRITICAL** | Never in source; only for server-side Edge Functions |
| JWT signing secret | Managed by Supabase | N/A | Not in app config |

### Build Process

```bash
# Install dependencies
npm install

# TypeScript type-check + build
npm run build      # next build

# Local development
npm run dev        # next dev (Next.js 16 dev server — singleton, one at a time)

# Production preview (local)
npm run start      # next start (port 3000 default; 3100 used in .claude/launch.json)

# Lint
npm run lint       # eslint
```

**Build output (confirmed green):**
```
Route (app)
├ ƒ /           (dynamic — server-rendered on demand)
├ ○ /login      (static)
├ ƒ /add        (dynamic)
├ ƒ /admin      (dynamic)
├ ƒ /alerts     (dynamic)
├ ƒ /members    (dynamic)
├ ƒ /members/[id]     (dynamic)
└ ƒ /members/[id]/intake (dynamic)

ƒ Proxy (Middleware — proxy.ts)
```

All authenticated routes are `force-dynamic` (no stale cache for member data).

### Deployment Process (Step 7 — Pending)

**Prerequisites:**
1. User runs `npx vercel login` interactively in terminal
2. All 3 pending SQL migrations run in Supabase SQL Editor (in order):
   - `20260607095000_notifications.sql`
   - `20260607095100_seed_notifications_demo.sql`
   - `20260607096000_member_intake.sql`

**Deployment steps (once logged in):**
```bash
cd "D:/RA Club/CLUB APP/club-app"
npx vercel --prod \
  --build-env NEXT_PUBLIC_SUPABASE_URL=<url> \
  --build-env NEXT_PUBLIC_SUPABASE_ANON_KEY=<key> \
  --build-env NEXT_PUBLIC_ENABLE_PHONE_OTP=false
```

**Post-deployment:**
- Add Vercel deployment URL to Supabase Auth → URL Configuration → Site URL + Redirect URLs
- Link `users.auth_id` for Ruby Ankur's real Supabase auth account (via SQL Editor: `UPDATE users SET auth_id = '<auth-uid>' WHERE id = '00000000-0000-0000-0000-000000000001'`)

---

## 6. Mobile Readiness Assessment

The app is designed mobile-first (`max-w-md`, `pb-[safe-area-inset-bottom]`, `min-h-dvh`, bottom nav) and functions well in a mobile browser today.

### Option A: Progressive Web App (PWA)

**What's needed:**
- Add `manifest.json` (app name, icons, theme colour, display: standalone)
- Add `<link rel="manifest">` to root layout
- Register a Service Worker (Next.js 16 supports this via a plugin like `next-pwa`)
- Add icon set (192×192, 512×512 PNG)
- Set `theme-color` meta tag

**Effort required:** **2–3 days** (1 dev, no backend changes)

**Risks:**
- iOS Safari PWA limitations: push notifications not supported (until iOS 17.4+, and only for EU in some markets); install prompt is manual
- No access to native device APIs (camera, biometrics, Bluetooth step counter)
- Service worker caching strategy must be tuned to avoid stale Supabase data

**Estimated code reuse:** **~98%** — the entire existing codebase is used; only a manifest, icons, and SW registration are added

**Recommendation:** ✅ Do this before or immediately after Vercel deployment. Gives "Add to Home Screen" UX at near-zero cost.

---

### Option B: Capacitor Android/iOS App

Capacitor wraps the existing Next.js web app in a WebView and gives access to native APIs via plugins.

**What's needed:**
1. Build Next.js as a static export (`output: 'export'`) — **BREAKING**: currently all routes are `force-dynamic` and use server-side Supabase; static export removes Server Components and Server Actions entirely
2. Alternative: run Next.js as an API server and point Capacitor WebView at it — adds hosting complexity
3. Alternatively, separate the client-side logic into a Capacitor-compatible SPA (React) that calls Supabase directly from the browser
4. Add Capacitor core + platform packages
5. Android Studio (for Android) / Xcode (for iOS) build toolchains
6. Google Play / App Store developer accounts (₹2,500/yr + $99/yr)

**Effort required:** **3–6 weeks** (significant refactoring)
- Server Actions must be converted to direct Supabase client calls (or a thin API layer)
- All `force-dynamic` routes must be rethought for client-side rendering
- Native build pipelines must be set up

**Risks:**
- Server Actions and React Server Components **do not work** in a static Capacitor export
- WebView performance is acceptable for this app's complexity but not "native feel"
- App Store review process (Apple) is slow (1–7 days per submission) and has rejection risk
- Maintaining native build toolchains adds ongoing DevOps overhead

**Estimated code reuse:**
- UI components (Tailwind, React): **~75%** (reusable as-is)
- Data layer: **~20%** (Server Actions must be rewritten as client-side Supabase calls)
- Overall: **~55–60%**

**Recommendation:** ⚠️ Only pursue if native device features (camera for marathon evidence, push notifications, step counter) are required. PWA is a better first step.

---

### Option C: React Native App

A full React Native rewrite using Expo (React Native + managed workflow).

**What's needed:**
- Rewrite all UI in React Native components (no Tailwind, no HTML — use StyleSheet or NativeWind)
- Supabase React Native client (`@supabase/supabase-js` works; auth with AsyncStorage)
- Expo Router for navigation (analogous to App Router)
- Rebuild all forms, BottomNav, cards, etc. in RN primitives

**Effort required:** **8–16 weeks** (essentially a new project)
- Zero Next.js code is portable to React Native
- Tailwind CSS classes do not apply (NativeWind is an approximation)
- Design system must be re-implemented in RN StyleSheet
- All 13 completed build steps must be re-implemented

**Risks:**
- Highest effort of all three options
- Expo managed workflow limits some native capabilities (mitigated by EAS Build)
- Two separate codebases to maintain (web + mobile)
- Fraunces font may not load correctly on all Android versions

**Estimated code reuse:**
- Business logic / Supabase queries: **~40%** (TypeScript is portable)
- Types, module interfaces: **~60%**
- UI components: **~0%** (complete rewrite)
- Overall: **~25–30%**

**Recommendation:** ❌ Not recommended for v1. Too high an investment relative to benefit when PWA + Capacitor covers the near-term need.

---

### Mobile Readiness Summary

| Option | Effort | Code Reuse | Recommendation | Timeline |
|--------|--------|-----------|---------------|---------|
| PWA | 2–3 days | 98% | ✅ Do it now | Week 1 post-launch |
| Capacitor | 3–6 weeks | 55–60% | ⚠️ Phase 2 | After 3 months live |
| React Native | 8–16 weeks | 25–30% | ❌ Not yet | Not recommended for v1 |

---

## 7. Technical Debt Assessment

### Missing Pieces (Functional Gaps)

| Gap | Impact | Priority |
|-----|--------|---------|
| **90-day follow-up task auto-generation** — `followup` module is a stub; tasks exist in DB but must be created manually/by seed | Coaches won't get their task lists automatically when a new member is added | HIGH |
| **`auth_id` linking for real users** — seed users have `auth_id = null`; real team members must be manually linked in Supabase | Every new team member gets "unlinked account" error on first login | HIGH |
| **Notification generation is on-demand** — runs only when Alerts screen opened; no background scheduling | Coaches who don't open Alerts screen miss notifications | MEDIUM |
| **No password reset / forgot password flow** | Users who forget password have no self-service recovery | MEDIUM |
| **No phone OTP SMS provider configured** — Twilio/MSG91 not set up | OTP login is code-complete but non-functional | LOW (feature-flagged off) |
| **DMO entry form** — `dmo_entries` table + RLS exist; no UI to enter daily scores | Coaches cannot log their DMO from the app | MEDIUM |
| **Weight chart / progress visualisation** — only a list of last 6 weights shown | Members' visual progress not clear | LOW |
| **Supabase types not generated** — types are hand-written in `lib/types.ts` | Type drift risk as schema evolves | LOW |

### Stubs Without Implementation (12 modules declared, 3 implemented)

The following modules are `export {}` placeholder files — declared in the architecture but no logic yet:
`identity`, `hierarchy`, `health-score`, `dmo`, `followup`, `treasury`, `recognition`, `marathon`, `comms`

These are **by design** (modular monolith, build step-by-step), but represent the full product backlog.

### Security Risks

| Risk | Severity | Mitigation Status |
|------|----------|------------------|
| `service_role` key exposure | CRITICAL | Not in codebase; good |
| RLS bypass via service_role | HIGH | Only used in SQL Editor; no app code uses it |
| `create_member()` RPC runs as owner | MEDIUM | ✅ Mitigated — still calls `app_user_id()` to verify caller is linked |
| `rule_config` readable by all authenticated users | LOW | Intentional — pricing/labels needed app-wide; no PII in config |
| No rate limiting on Server Actions | LOW | Supabase has connection pooling; Vercel has DDoS protection |
| CORS not explicitly configured | INFO | Next.js/Vercel handle CORS for same-origin; Supabase has project-level CORS settings |

### Scalability Concerns

| Concern | Threshold | Solution |
|---------|-----------|---------|
| `generateNotifications()` scans all visible members every time Alerts opens | ~500+ members per user could be slow | Move to scheduled Edge Function with incremental scan |
| Unread count query on every page load (in AppLayout) | Acceptable up to ~10K notifications per user | Already uses partial index `WHERE read_at IS NULL` |
| Hierarchy closure table growth | O(n²) in worst case (deep trees) | For a club of 500 members, this is ~125K rows — fine for years |
| `force-dynamic` on every route | All pages re-render on every request | Correct for real-time club data; add `revalidate = 60` for semi-static pages (admin) in future |
| No connection pooling configured | Supabase default is fine for <100 concurrent users | Add PgBouncer if concurrent users exceed 50 |

### Code Quality Notes

**Positives:**
- Strict TypeScript throughout (`"strict": true` in tsconfig)
- `React.cache()` used correctly for per-request deduplication
- Server Actions re-validate auth independently (not trusting client)
- `revalidatePath()` called on all affected routes after mutations
- INTAKE_FIELDS registry as single source of truth (form ↔ action ↔ DB)
- Design tokens in CSS custom properties + Tailwind `@theme` — no magic strings
- All RLS policies + SECURITY DEFINER helpers reviewed and correct

**Issues to address:**
- `src/lib/types.ts` is hand-written; should be replaced with `supabase gen types typescript` after stable schema
- `member_intake` migration uses `first_day` column but `intake.ts` uses `visit_date` as the field key — **these are mismatched** (the DB column is `first_day`, the form field key is `visit_date`). The intake form will silently not save the visit date to the database.
- `generateNotifications()` is called with `await` inside a `useEffect` callback — correct pattern, but if this becomes a scheduled job, the on-demand call should be kept as a manual "refresh" trigger
- No test coverage (unit or integration) — acceptable for v1 but should be added before team onboarding

### Launch Blockers (must fix before go-live)

| # | Issue | Fix |
|---|-------|-----|
| 1 | `visit_date` (form field) ↔ `first_day` (DB column) mismatch | Either rename DB column to `visit_date` in a new migration, or change INTAKE_FIELDS key to `first_day` |
| 2 | Real user `auth_id` linking not done | `UPDATE users SET auth_id = '<real-uid>' WHERE name = 'Ruby Ankur'` in Supabase SQL Editor after creating Supabase auth account |
| 3 | 3 pending SQL migrations not yet run | Run in Supabase SQL Editor (see §5 Deployment) |
| 4 | Vercel deployment not done | User must `npx vercel login` then deploy |

---

## 8. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RUBY ANKUR WELLNESS — CLUB APP                           │
│                    Architecture v1 · June 2026                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  CLIENT (Mobile Browser / PWA)                                               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │  Next.js App Shell (max-w-md · warm-earth design system)            │     │
│  │                                                                     │     │
│  │  ┌──────────┐  ┌─────────┐  ┌─────┐  ┌────────┐  ┌─────────┐     │     │
│  │  │  Home /  │  │Members  │  │ Add │  │ Alerts │  │ Profile │     │     │
│  │  │ Command  │  │ List +  │  │ New │  │  Feed  │  │  + Admin│     │     │
│  │  │ Center   │  │ Detail  │  │Memb.│  │  Bell  │  │ Console │     │     │
│  │  └──────────┘  └─────────┘  └─────┘  └────────┘  └─────────┘     │     │
│  │            \        |           |          |            /           │     │
│  │             ╰───────┴───────────┴──────────┴───────────╯           │     │
│  │                          Bottom Nav (sticky)                        │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  Client Components: MembersList, LogWeightForm, MarkPresentButton,          │
│  AddMemberForm, AdminConsole, AlertsFeed, IntakeForm, SignOutButton          │
└─────────────────────────┬────────────────────────────────────────────────────┘
                          │ HTTPS
                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  VERCEL EDGE NETWORK (Global CDN)                                            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │  proxy.ts  (Next.js 16 Proxy — runs on every request)               │     │
│  │  • Refreshes Supabase JWT session cookie                            │     │
│  │  • Redirects unauthenticated → /login                               │     │
│  │  • Redirects authenticated /login → /                               │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │  Next.js 16 App Router  (React 19 Server Components)                │     │
│  │                                                                     │     │
│  │  Server Components (reads)          Server Actions (writes)         │     │
│  │  ─────────────────────────          ────────────────────────        │     │
│  │  getCurrentUser() [React.cache]     markPresent()                   │     │
│  │  getConfigValue() / getConfigMap()  logWeight()                     │     │
│  │  getIntake()                        addMember() → create_member RPC │     │
│  │  getNotifications()                 saveIntake()                    │     │
│  │  getUnreadCount()                   setConfig() [Club Owner]        │     │
│  │                                     markRead() / markAllRead()      │     │
│  │                                     generateNotifications()         │     │
│  └──────────────────────────┬──────────────────────────────────────────┘     │
└─────────────────────────────┼────────────────────────────────────────────────┘
                              │ @supabase/ssr (cookie-based JWT)
                              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  SUPABASE (ixibkiujxiecahvopgwu.supabase.co)                                │
│                                                                              │
│  ┌─────────────────┐  ┌───────────────────────────────────────────────┐     │
│  │  GoTrue Auth     │  │  PostgreSQL 15 Database                        │     │
│  │  ─────────────  │  │  ──────────────────────────────────────────   │     │
│  │  Email+Password  │  │  users · hierarchy_closure · members           │     │
│  │  (OTP ready)     │  │  follow_up_tasks · dmo_entries · rule_config   │     │
│  │  JWT signing     │  │  attendance · weight_logs · notifications      │     │
│  │  Session mgmt    │  │  member_intake                                 │     │
│  └─────────────────┘  │                                                │     │
│                        │  RLS on all 10 tables                          │     │
│  ┌─────────────────┐  │  SECURITY DEFINER: app_user_id()               │     │
│  │  Storage         │  │                   app_user_role()              │     │
│  │  (reserved for   │  │                   can_see(target)              │     │
│  │   photos/media)  │  │                   create_member() RPC          │     │
│  └─────────────────┘  │  Trigger: add_to_closure() on users INSERT      │     │
│                        └───────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  FUTURE INTEGRATIONS (stubs exist, not yet implemented)                      │
│                                                                              │
│  SMS Provider     WhatsApp Business API     FCM Push     Telegram Bot        │
│  (Twilio/MSG91)   (Comms module)            (Notifications)  (Marathon)      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Data Flow Diagram

### A. Page Load (Read Path)

```
Browser Request
      │
      ▼
proxy.ts ──── no valid session ──────────────▶ Redirect /login
      │
      │  valid session (cookie)
      ▼
Server Component
      │
      ├── getCurrentUser()
      │     └── supabase.auth.getUser()           ─▶ auth.users (JWT verify)
      │           └── supabase.from("users")       ─▶ users WHERE auth_id = uid
      │                 └── returns CurrentUser | "unlinked" | null
      │
      ├── Parallel Supabase queries (all RLS-scoped to current user's subtree)
      │     ├── supabase.from("members").select(...)
      │     ├── supabase.from("follow_up_tasks").select(...)
      │     ├── getConfigValue("ui_labels")         ─▶ rule_config
      │     ├── getConfigValue("membership_labels") ─▶ rule_config
      │     └── getUnreadCount()                    ─▶ notifications (partial idx)
      │
      ▼
Server Component renders HTML + props for Client Components
      │
      ▼
Browser hydrates Client Components (MembersList, BottomNav, etc.)
      │
      ▼
User sees page (~50–200ms depending on Supabase region)
```

### B. Write Path (Server Action)

```
User interaction (e.g. taps "Mark Present")
      │
      ▼
Client Component (MarkPresentButton)
      │  useTransition → startTransition
      ▼
Server Action: markPresent(memberId)    [runs on Vercel server]
      │
      ├── getCurrentUser()              ─▶ re-validates auth (not trusting client)
      │     └── if null/unlinked → return { ok:false, error: "Not signed in." }
      │
      ├── createClient()                ─▶ Supabase server client (cookie session)
      │
      ├── supabase.from("attendance").upsert(...)
      │     └── RLS WITH CHECK: can_see(member_id) must be true
      │           └── if false → Supabase returns error
      │
      ├── revalidatePath("/members/[id]")
      ├── revalidatePath("/members")
      └── revalidatePath("/")
            └── Next.js invalidates RSC payload cache for these routes
      │
      ▼
return { ok: true }
      │
      ▼
Client Component receives result → router.refresh() → page re-fetches
```

### C. Notification Generation Flow

```
User opens /alerts
      │
      ▼
AlertsFeed mounts → useEffect fires once (ranRef guard)
      │
      ▼
generateNotifications() Server Action
      │
      ├── getCurrentUser()              ─▶ verify signed in
      │
      ├── getConfigValue("notifications") ─▶ rule_config (thresholds + templates)
      ├── getConfigValue("pricing")       ─▶ rule_config (max_payments)
      │
      ├── Parallel reads (all RLS-scoped)
      │     ├── members (user_id, join_date, recharge_count, current/ideal weight)
      │     ├── users (id, name)
      │     ├── attendance (member_id, date, present)
      │     ├── weight_logs (member_id, logged_at)
      │     └── notifications (existing — for dedup)
      │
      ├── For each member → evaluate 3 rules:
      │     ├── MILESTONE: current_weight <= ideal_weight
      │     ├── RECHARGE_DUE: cycleDay in nudge window AND recharge_count < max
      │     └── DROP_OFF: inactive_days >= threshold
      │
      ├── Dedup: skip if `${type}:${member_id}` already in notifications
      │
      └── supabase.from("notifications").insert(newRows)
                └── RLS: user_id must equal app_user_id()
      │
      ▼
router.refresh() → page re-fetches notifications list
```

### D. Hierarchy Visibility (How Sideline Isolation Works)

```
When Coach Sana logs in and views /members:

  supabase.from("members").select(...)
        │
        └── RLS policy: can_see(user_id)
              │
              └── SELECT EXISTS (
                    SELECT 1 FROM hierarchy_closure
                    WHERE ancestor_id = app_user_id()   ← Sana's UUID
                      AND descendant_id = user_id       ← target member
                  )

  Sana sees: herself (depth 0), Anjali (depth 1), Vikram (depth 1)
  Sana does NOT see: Meena (belongs to Coach Imran — different branch)

  The closure table for Sana:
  ┌─────────────┬──────────────┬───────┐
  │ ancestor_id │ descendant_id│ depth │
  ├─────────────┼──────────────┼───────┤
  │ Sana        │ Sana         │   0   │  ← self
  │ Sana        │ Anjali       │   1   │  ← direct member
  │ Sana        │ Vikram       │   1   │  ← direct member
  └─────────────┴──────────────┴───────┘
  (No row with Meena as descendant → can_see(Meena) = false)
```

---

## 10. Deployment Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION ENVIRONMENT                               │
└─────────────────────────────────────────────────────────────────────────────┘

  Developer Laptop (Windows)
  ┌────────────────────────┐
  │  D:\RA Club\CLUB APP\  │
  │  club-app\             │     git push origin main
  │  (git repo)            │ ──────────────────────────▶  GitHub / Git remote
  └────────────────────────┘                                      │
                                                                   │ Vercel Git Integration
                                                                   │ (auto-deploy on push)
                                                                   ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  VERCEL                                                                 │
  │                                                                         │
  │  Build pipeline:                                                        │
  │  npm install → next build → output: .next/                              │
  │                                                                         │
  │  ┌─────────────────────────────────────────────────────────────┐        │
  │  │  Edge Network (100+ PoPs globally)                           │        │
  │  │  • Static assets: CDN-served (login page, fonts)             │        │
  │  │  • Dynamic routes: Serverless Functions (Node.js runtime)    │        │
  │  │  • proxy.ts: Edge Function (lightweight, runs at CDN node)   │        │
  │  └─────────────────────────────────────────────────────────────┘        │
  │                                                                         │
  │  Environment variables (set in Vercel project settings):                │
  │  NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,               │
  │  NEXT_PUBLIC_ENABLE_PHONE_OTP                                           │
  │                                                                         │
  │  Domain: club-app.vercel.app (or custom domain)                         │
  └───────────────────────────────────┬─────────────────────────────────────┘
                                      │ HTTPS + JWT cookie
                                      ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  SUPABASE (managed cloud — ixibkiujxiecahvopgwu.supabase.co)           │
  │                                                                         │
  │  ┌──────────────────┐   ┌─────────────────────────────────────────┐    │
  │  │  Auth (GoTrue)    │   │  PostgreSQL 15                           │    │
  │  │  • JWT issuance   │   │  • 10 tables                            │    │
  │  │  • Session mgmt   │   │  • RLS on all tables                    │    │
  │  │  • Email auth     │   │  • Closure table + trigger              │    │
  │  └──────────────────┘   │  • SECURITY DEFINER functions           │    │
  │                          │  • 10 migration files applied           │    │
  │  ┌──────────────────┐   └─────────────────────────────────────────┘    │
  │  │  Storage          │                                                   │
  │  │  (reserved)       │   Auth URL Config must include Vercel domain      │
  │  └──────────────────┘   (Supabase → Auth → URL Configuration)           │
  └─────────────────────────────────────────────────────────────────────────┘

  Mobile User (India)
  ┌─────────────────────┐
  │  Chrome / Safari    │
  │  on Android / iOS   │ ──── HTTPS ────▶  Vercel Edge ──▶  Supabase
  │  (PWA installable)  │
  └─────────────────────┘

  FUTURE:
  ┌─────────────────────┐      ┌──────────────────┐     ┌──────────────────┐
  │  Supabase            │      │  Vercel Cron     │     │  SMS Provider    │
  │  Edge Function       │ ──▶  │  (scheduled      │     │  (Twilio/MSG91)  │
  │  (background notif.) │      │   daily scan)    │     │  for Phone OTP   │
  └─────────────────────┘      └──────────────────┘     └──────────────────┘
```

---

## 11. Launch Readiness Score

### Scoring Rubric

| Category | Max Score | Score | Notes |
|----------|-----------|-------|-------|
| **Core functionality** | 25 | 21 | Home, Members, Logging, Intake, Notifications, Admin done. Follow-up auto-gen + DMO form missing. |
| **Security** | 20 | 17 | RLS correct, SECURITY DEFINER patterns correct, no secrets in code. auth_id linking not done for real users (-3). |
| **Data integrity** | 15 | 11 | Schema solid, closure table correct, migrations ordered. visit_date ↔ first_day mismatch (-3). Supabase types not generated (-1). |
| **Auth & access control** | 15 | 13 | Email+password working. Role-based gates correct. No password reset flow (-2). |
| **Infrastructure readiness** | 10 | 5 | Build is green. Vercel not deployed yet. 3 migrations pending. (-5) |
| **Mobile UX** | 10 | 8 | Mobile-first layout, safe-area padding, bottom nav, touch targets good. No PWA manifest yet (-2). |
| **Code quality** | 5 | 4 | Strict TS, no console.log noise, clean patterns. No tests (-1). |

### **Total: 79 / 100**

### Interpretation

> **79 — "Conditionally Launch-Ready"**
>
> The application is architecturally sound and functionally complete for its v1 scope. Four launch blockers must be resolved before going live with real users (see §7). Once those are done, this is a solid and well-structured first launch.

### The Four Blockers (must fix before deploying real users)

| Priority | Action | Effort |
|----------|--------|--------|
| 🔴 1 | Fix `visit_date` ↔ `first_day` column mismatch in member_intake | 15 minutes |
| 🔴 2 | Run 3 pending SQL migrations in Supabase SQL Editor | 10 minutes |
| 🔴 3 | Deploy to Vercel + set env vars | 30 minutes (needs `npx vercel login`) |
| 🔴 4 | Link Ruby Ankur's `auth_id` in Supabase after creating auth account | 5 minutes |

### Post-Launch Quick Wins (Week 1–2)

| Action | Value |
|--------|-------|
| Add PWA manifest + icons | App installable on home screen |
| Add password reset flow | Users can self-serve if they forget |
| Move `generateNotifications()` to Vercel Cron | Alerts arrive without opening Alerts tab |
| Run `supabase gen types typescript` | Type-safe DB queries |

### Genuine Strengths Worth Noting

- **Rules Engine design** is excellent — every business parameter is configurable without a deploy. This is production-grade thinking.
- **Hierarchy closure table + RLS** is the right solution for multi-level org visibility at this scale. Sideline isolation is correctly enforced at the DB layer, not the application layer.
- **SECURITY DEFINER `create_member()` RPC** to solve the RLS timing race is the correct architectural move — not a workaround.
- **Modular monolith with stub modules** is the right call for v1. The scaffolding exists for all 12 architectural modules; they can be filled in without structural changes.
- **Design system token architecture** (CSS custom properties → Tailwind `@theme`) is clean and will survive a design refresh.

---

*End of Technical Audit · Ruby Ankur Wellness Club App · June 2026*
*Document generated by Principal Architect analysis — no code was modified during this audit.*
