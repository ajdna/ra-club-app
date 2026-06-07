# Ruby Ankur Wellness — Club App

Club management platform for Ruby Ankur Wellness (organization **2A**, club code
**RA**). This is the **Level 1A scaffold**: a clean, runnable Next.js + Supabase
foundation. No features are built yet — see the Build Guide for the step-by-step
sequence (this is "Step 1 — Project scaffold").

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4, warm-earth design tokens from the prototypes
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime)

The source docs (`Business Brief`, `Technical Architecture`, `Build Guide`) and
the HTML prototypes live in the **parent folder** (`..`).

---

## 1. Prerequisites

- **Node.js 18+** (you have v26). On this machine Node is installed at
  `C:\Program Files\nodejs` but is **not on your PATH**, so a bare `node` /
  `npm` command won't be found. Two options:
  - **Easiest:** add `C:\Program Files\nodejs` to your Windows PATH
    (Start → "Edit the system environment variables" → Path → New), then open a
    **new** terminal.
  - **Or** prefix commands for the current PowerShell session only:
    ```powershell
    $env:Path = "C:\Program Files\nodejs;" + $env:Path
    ```

All commands below are run from inside this `club-app` folder.

## 2. Run it locally

Dependencies are already installed. Just start the dev server:

```powershell
npm run dev
```

Open **http://localhost:3000**. You should see the branded scaffold page with a
module map and a Supabase status indicator (amber until you add keys in step 3).

Other scripts:

```powershell
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## 3. Set up Supabase

The app runs without Supabase, but auth/data features need it. One-time setup:

1. Go to **https://supabase.com** → sign in → **New project**.
   - Pick a name (e.g. `ruby-ankur`), set a database password (save it), choose
     a region close to your users (e.g. **Mumbai / South Asia**).
   - Wait ~2 minutes for it to provision.
2. In the project, open **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Paste them into **`.env.local`** in this folder (it's git-ignored):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```
4. Stop the dev server (Ctrl+C) and run `npm run dev` again. The Supabase status
   dot on the home page should turn green.

> Phone/OTP login (Build Guide Step 3): later, enable it under
> **Authentication → Sign In / Providers → Phone** and connect an SMS provider.
> The `service_role` key (Settings → API) is **server-only** — never commit it or
> expose it to the browser; it's used for migrations/seed scripts.

## 4. Project structure

```
club-app/
├─ .env.local              # your Supabase keys (git-ignored)
├─ .env.example            # template for the above
└─ src/
   ├─ app/                 # App Router (layout, home page, global styles)
   │  ├─ layout.tsx        # Fraunces + Manrope fonts, metadata
   │  ├─ page.tsx          # scaffold landing / module map
   │  └─ globals.css       # warm-earth design tokens + Tailwind
   ├─ proxy.ts             # Next 16 "Proxy" (was Middleware) — refreshes auth
   ├─ lib/
   │  ├─ supabase/         # browser + server clients, session refresh
   │  └─ types.ts          # core domain types (User, Member, closure table…)
   └─ modules/             # one folder per architecture module — see its README
      ├─ identity/  hierarchy/  members/   health-score/
      ├─ dmo/       followup/   treasury/  recognition/
      ├─ marathon/  comms/      rules-engine/  notifications/
```

`src/modules/README.md` maps each module to the architecture and the 14 "killer
features." Modules are empty placeholders (`export {};`) for now — they get
filled in as you work through the Build Guide.

## 5. Next steps (Build Guide)

This scaffold is **Step 1**. Continue with:

- **Step 2 — Database schema:** users + `parent_id`, members, the **closure
  table** (downline / sideline isolation), follow-up tasks, DMO entries, and the
  `rule_config` table for the Rules Engine.
- **Step 3 — Login:** phone + OTP via Supabase Auth, role + tree position,
  server-side visibility enforcement.
- **Steps 4–6:** core screens (Morning Command Center, Members), Admin Console,
  notifications.
- **Step 7:** test with sample data and deploy to Vercel.

## Notes on this stack version

- **Next.js 16** renamed `middleware.ts` → **`proxy.ts`** (same functionality);
  that's why auth-session refresh lives in `src/proxy.ts`.
- **Tailwind v4** is configured via CSS (`@theme` in `globals.css`), not a
  `tailwind.config.js`. Brand colors are exposed as utilities like `bg-terra`,
  `text-sage-d`, `border-line`.
