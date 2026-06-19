# Testing & Deployment Workflow

Goal: every change is automatically checked, the safe stuff is auto-fixed, broken
code is blocked before it ships, and green code flows to GitHub and Vercel with no
babysitting.

## What "in sync" means here

- **Local** `main` == **GitHub** `origin/main` == **Vercel** production deployment.
- Vercel is wired to auto-deploy `main`, so once code lands on GitHub `main`, it
  deploys on its own. The job of this workflow is to make sure only *good* code
  reaches `main`.

## The gate (smoke test)

One command checks everything:

```bash
npm run verify        # = typecheck + lint + production build
```

- **typecheck** (`tsc --noEmit`) — catches the type errors that caused the earlier
  Vercel ERROR deployments.
- **lint** (`eslint`) — fails on errors; warnings are allowed through.
- **build** (`next build`) — catches anything that breaks the production bundle.

If `verify` passes, the app type-checks, lints clean, and builds across **all**
feature files at once.

**Note on lint severity.** The React 19 compiler rule
`react-hooks/set-state-in-effect` is set to **warn** (see `eslint.config.mjs`),
because several components deliberately set state in an effect to read browser
APIs / the DOM on mount — moving that into a lazy state initializer would run
during SSR and cause hydration mismatches. Those show as warnings (visible, not
blocking). Genuine issues (`no-explicit-any`, `no-html-link-for-pages`,
`react-hooks/purity`, etc.) remain hard errors.

## How a change flows (seamless path)

```
edit code
   │
   ▼
git commit  ──►  pre-commit hook: eslint --fix on staged files, auto-restage
   │
   ▼
git push    ──►  pre-push hook: npm run verify
   │                 ├─ fails ► push BLOCKED, errors shown, nothing leaves your machine
   │                 └─ passes ► push proceeds
   ▼
GitHub      ──►  Actions CI re-runs verify (source of truth)
   │
   ▼
Vercel      ──►  auto-deploys main on green build
```

Auto-corrected automatically: formatting and auto-fixable lint.
Surfaced for a human (not silently deployed): type errors, build failures, logic
bugs. This is deliberate — auto-rewriting logic and deploying it unreviewed ships
confident wrong answers.

## One-time setup

1. **Add the scripts to `package.json`** (the `"scripts"` block):

   ```json
   "typecheck": "tsc --noEmit",
   "lint": "eslint",
   "lint:fix": "eslint --fix",
   "verify": "npm run typecheck && npm run lint && npm run build",
   ```

   (`lint` already exists — keep one copy.)

2. **Activate the git hooks** (point git at the committed hooks dir):

   ```bash
   git config core.hooksPath .githooks
   ```

   On Windows the hooks run via Git Bash automatically — no extra step.

3. **GitHub Actions** — `.github/workflows/ci.yml` is already in the repo; it turns
   on the moment it lands on GitHub. Nothing to enable.

4. **Vercel** — already auto-deploys `main`. Optional hardening: in Vercel →
   Project → Settings → Git, require the CI check to pass before deploying.

That's it. From then on the loop runs itself.

## Adding a new feature (the routine)

1. Build the feature.
2. `git commit` — formatting/lint auto-fixed.
3. `git push` — gate runs; if it fails, fix what it reports and push again.
4. Green push → GitHub → Vercel deploys. Local, GitHub, and Vercel stay in sync.

No manual deploy step. No "did I break prod?" — broken code can't get past the push.

## Automated feature tests (Playwright)

Browser tests that actually open the app and click through it — the layer that
proves features *work*, not just that the code builds.

First-time install (run once, on your machine):

```bash
npm install
npx playwright install
```

Run them:

```bash
npm run test:e2e        # headless, all tests
npm run test:e2e:ui     # opens a visual runner you can watch click through the app
```

Two groups:

- **`e2e/public.spec.ts`** — no login needed (login screen renders, register and
  reset-password pages load). These run automatically in CI on every push.
- **`e2e/authed.spec.ts`** — logged-in flows (redirect when logged out, log in,
  members page, messages page). These are **skipped** until you provide a test
  account, so they never touch real club data.

To switch on the logged-in tests, copy `.env.test.example` to `.env.test` and fill
in a **dedicated test account** (create one in Supabase → Authentication → Users):

```
TEST_EMAIL=test@example.com
TEST_PASSWORD=your-test-password
```

Then `npm run test:e2e` runs the full set. To run the logged-in tests in CI too,
add `TEST_EMAIL` and `TEST_PASSWORD` as GitHub repository secrets and reference them
in the `e2e` job. To point tests at the live site instead of a local server:
`BASE_URL=https://your-app.vercel.app npm run test:e2e`.

## Per-feature QA checklist (manual smoke pass)

The automated gate proves the app **builds**. This list is the human pass to prove
each feature **works** — run it on local (`npm run dev`) and again on the Vercel URL
after deploy. Tick both columns.

| Area | Check | Local | Vercel |
|------|-------|:-----:|:------:|
| Auth | Login (email+password) succeeds; bad creds rejected | ☐ | ☐ |
| Auth | Register → lands on Pending; password reset + update flows | ☐ | ☐ |
| Members | List loads; search filters; open a member detail | ☐ | ☐ |
| Members | Mark present (idempotent per day); log weight updates chart | ☐ | ☐ |
| Members | Intake form saves; member report renders | ☐ | ☐ |
| Members | Stage complete advances stage | ☐ | ☐ |
| Add | Add new member with required fields | ☐ | ☐ |
| Follow-up | Due-today + overdue lists correct; Clear All works | ☐ | ☐ |
| Follow-up | Mark done modal; home-visit actions | ☐ | ☐ |
| Messages | Thread list; open chat; send/receive (realtime) | ☐ | ☐ |
| Messages | Broadcast; new group; reactions; replies | ☐ | ☐ |
| My progress | Personal stats/weight render for a member account | ☐ | ☐ |
| Profile | Edit profile saves | ☐ | ☐ |
| Alerts | Feed loads | ☐ | ☐ |
| Calendar | Renders current period | ☐ | ☐ |
| Admin | Console, analytics, users, roles load | ☐ | ☐ |
| Admin | Bulk import (xlsx); role mappings | ☐ | ☐ |
| Push | Subscribe permission; test push delivers | ☐ | ☐ |
| PWA | Installable; service worker active; offline shell | ☐ | ☐ |
| Cron | morning / evening / chat-clear / keepalive routes respond 200 | ☐ | ☐ |
| Android | `npm run cap:sync` builds; app launches (local only) | ☐ | — |

Tip: the four cron routes can be smoke-tested directly, e.g.
`curl -s -o /dev/null -w "%{http_code}" https://<your-vercel-url>/api/keepalive`.

## Honest limits

- This is a **smoke gate**, not full test coverage. It catches compile/build
  breakage (the common case), not logic regressions. Layer in Playwright E2E later
  for the critical flows when you want that guarantee.
- "Without any intervention" applies to the *plumbing* (fixing format, blocking bad
  deploys, shipping good ones). Genuine bugs still need a human (or an explicit
  ask to me) — by design.
