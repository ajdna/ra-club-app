# Ops Runbook — Ruby Nutrition Center app

> Where everything lives, how it's wired, and how to fix/rotate/roll back. Read with `HANDOFF.md` (current state) and `PROJECT_EXECUTION_PLAN.md` (process).

## 1. The pieces (what runs where)
| Concern | Service | Notes |
|---|---|---|
| Code | GitHub `ajdna/ra-club-app` | `main` = production; feature branches = preview |
| Hosting / SSR | Vercel project `ra-club-app` | auto-deploys: push to `main` → Production; push to a branch → Preview |
| Database + Auth | Supabase project `ixibkiujxiecahvopgwu` | Postgres + RLS, Auth, migrations, `pg_cron`, `pg_net` |
| Scheduler | Supabase `pg_cron` job `club-dispatch` (`*/15`) | calls `/api/cron/dispatch`; replaced GitHub Actions cron (throttled) |
| Web push | `web-push` (VAPID) + `push_subscriptions` | desktop + installed PWA (Android/iOS 16.4+) |
| Mobile | Capacitor (Android) | Remote-URL WebView → loads the Vercel site |

## 2. Environment variables (Vercel → Settings → Env Vars)
Values are **masked after save** — to change one you overwrite + **redeploy** (env changes only take effect on a new deploy).
| Var | Used by | Rotate how |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + SSR | from Supabase → API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | server (service client, bypasses RLS) | Supabase → API; keep secret |
| `VAPID_EMAIL` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | web push | regen VAPID keypair only if compromised (invalidates subs) |
| `CRON_SECRET` | `/api/cron/*` auth | see §4 |
| `PUSH_WEBHOOK_SECRET` | `/api/push/notify` (DB webhook auth) | Supabase webhook header must match |
| `SENTRY_*` | error monitoring | optional |

## 3. Deploy & rollback
- **Deploy:** merge to `main` + push → Vercel builds Production. Gate every push with `npm run verify` (lint+build) — never `--no-verify`.
- **Roll back code:** Vercel → Deployments → a prior READY Production build → ⋯ → **Promote to Production** (instant, no rebuild). Or `git revert` + push.
- **Roll back a feature:** flip its `rule_config` flag off (no redeploy) — see §6.
- **Roll back DB:** run the `-- DOWN`/reverse of the migration; risky schema → use a Supabase branch first.
- **Tags:** each go-live tagged `v0.x.y-<feature>` for reference.

## 4. CRON_SECRET (the one that bit us)
Guards all cron endpoints. The pg_cron job AND Vercel must hold the **same** value; the header must be `Bearer <value>`.
**Rotate / fix:**
1. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Vercel → env `CRON_SECRET` → overwrite → Save → **Redeploy Production** (mandatory).
3. Supabase SQL: `select cron.unschedule('club-dispatch');` then re-`cron.schedule(...)` with header `'Authorization','Bearer <value>'`.
4. (Optional) update the GitHub Actions repo secret `CRON_SECRET` if you still use manual `workflow_dispatch`.
**Verify:** `select status_code from net._http_response order by created desc limit 1;` → want **200** (401 = mismatch or not redeployed).

## 5. Scheduler (pg_cron)
- Job: `club-dispatch`, `*/15 * * * *`, runs `select net.http_post('https://ra-club-app.vercel.app/api/cron/dispatch', headers Bearer CRON_SECRET, body {})`.
- Inspect: `select * from cron.job;` · runs: `select * from cron.job_run_details order by start_time desc;` · HTTP results: `select status_code, content, created from net._http_response order by created desc;`
- The dispatch endpoint computes IST internally and decides who is due (digests, club pre/start, etc.). pg_cron in UTC; `*/15` still lands on IST quarter-hours.

## 6. Feature flags (`rule_config`, key `ff_<name>`, boolean)
No-redeploy kill switch. Read via `isFeatureEnabled()` (service client — works in cron). Flip in Admin or SQL:
`insert into rule_config(key,value) values('ff_x','true') on conflict (key) do update set value=excluded.value;`
Live flags: `ff_followup_v2`, `ff_notif_prefs`, `ff_club_reminders` (ON); `ff_coach_reminders` (off).

## 7. Where each feature's data lives
| Feature | Tables / config |
|---|---|
| Follow-up engine | `follow_up_tasks`, `member_intake` (anchor = `visit_date`), cfg `followup_cadence` |
| Notification prefs | `notification_prefs` (on/off, send_time, last_sent_on; internal dedupe types `*_pre`/`*_start`) |
| Club reminders | weekly cfg `club_schedule`; daily details `club_sessions` (date+period); page `/club/[period]` |
| Coach levels (2D) | `users.qualification`, cfg `qualification_levels` |
| Push | `push_subscriptions`; sender `src/lib/push.server.ts`; SW `public/sw.js` |

## 8. Common gotchas (learned)
- Env change → **always redeploy**, else old value stays live.
- Flags read in cron/no-auth must use the **service client** (`rule_config` RLS is `auth.uid() is not null`).
- `supabase.rpc` must be called bound (`.bind`) or directly — detaching loses `this`.
- Per-day notification dedupe means re-testing the same stage same-day won't re-fire; reset `last_sent_on` to retest.
- GitHub Actions free cron is throttled (~hourly) — use Supabase `pg_cron` for time-sensitive jobs.
- `gen:types` reflects the **live** DB — apply migrations to cloud before regenerating.
