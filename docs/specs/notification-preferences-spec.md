# Spec — Notification personalization (per-user on/off + custom time)

> Phase 2 feature. Branch `feat/notif-prefs` · flag `ff_notif_prefs` · model `sonnet`, review `opus` (touches cron + push fan-out).
> Also bundles the **safe-area PWA fix** (already applied: `viewportFit:"cover"` + AppBar top inset) — ship with this or separately.

## Goal
Each person controls, in a **Personalization** section (Profile), which notifications they receive and — for the scheduled digests — at what time.

## Notification types — two classes
**Event-driven (instant) → on/off only** (a time makes no sense):
- `message_received`, `broadcast_received`, `approval_request`, `new_downline_member`

**Scheduled digests → on/off + custom time:**
- `daily_followup_summary` (coaches) — default 07:00
- `weight_log_reminder` (members) — default 07:00
- `evening_summary` — default 20:00

## Data model
New table `notification_prefs` (reversible — drop table to roll back):
```
user_id      uuid  references users(id) on delete cascade
type         text  -- one of the keys above
enabled      boolean not null default true
send_time    time  null   -- any HH:MM the user picks; null for event types
last_sent_on date  null   -- dedupe: a digest fires at most once per calendar day
updated_at   timestamptz default now()
primary key (user_id, type)
```
Absence of a row = defaults (enabled, default time). RLS: a user reads/writes only their own rows.

## UI — Profile → Personalization
- A "Notifications" card listing each type with a toggle. Digest types also show a **native time picker** (`<input type="time">`) — on iPhone/Android this renders the OS wheel with AM/PM per the device locale; on desktop a HH:MM field. Any minute is selectable.
- Saves via a `setNotificationPref(type, enabled, sendTime?)` server action (writes own row only).

## Respecting prefs
- **Event push** (`notify()` + the chat `push-notify` path): before sending, check `notification_prefs` for that user+type; skip if disabled. (Move the chat/broadcast push through a pref check too.)
- **Digest delivery (custom per-minute times):** a `/api/cron/dispatch` endpoint, pinged **every 15 min by a free GitHub Actions scheduled workflow** (repo is public → no cost; avoids Vercel Hobby's once-daily cron limit). Each run, for every digest pref that is `enabled`, where current IST time ≥ `send_time` and `last_sent_on` < today and the user has matching content (e.g. tasks due today): send the push, set `last_sent_on = today`. Result: users pick any HH:MM; the digest arrives within ~15 min, once per day. (If the project moves to Vercel **Pro**, swap the GitHub Action for a Vercel `*/15` cron — same endpoint.)

## Flag / rollback
- `ff_notif_prefs` (default OFF): when OFF, current fixed-time behavior; when ON, prefs + dispatcher honored.
- Rollback: flag off, drop table, revert cron to fixed times.

## Files
| File | Change |
|---|---|
| migration `*_notification_prefs.sql` | NEW table + RLS |
| `src/modules/notifications/prefs.ts` | NEW: read/write prefs + `isEnabled(userId,type)` + `dueAtSlot()` |
| `src/lib/notify.ts` | check pref before push |
| `src/app/api/push/notify` + chat path | check pref before push |
| `src/app/api/cron/dispatch` | NEW digest dispatcher (per-user time + `last_sent_on` dedupe), gated by flag |
| `.github/workflows/notif-dispatch.yml` | NEW free scheduled workflow (`*/15`) → pings dispatch with `CRON_SECRET` |
| `src/app/(app)/profile/*` | Personalization → Notifications card + `setNotificationPref` action |

## Resolved (owner: per-minute custom times)
- Users pick **any time** via the native time picker (AM/PM per device). Delivered within ~15 min by the **free GitHub Actions scheduler** → no cost, works on Vercel Hobby.
- Pre-req: `CRON_SECRET` (already used by existing crons) guards `/api/cron/dispatch`; the workflow stores it as a GitHub Actions repo secret. (If we later move to Vercel Pro, swap to a `*/15` Vercel cron — same endpoint.)
- Caveat: GitHub Actions scheduled runs can drift a few minutes under load — acceptable for digest reminders.

## Acceptance
- [ ] Each user sets on/off per type; digest types set a time; saved per-user.
- [ ] Disabled type → no push for that user.
- [ ] Digest arrives at the user's chosen slot (±cron granularity).
- [ ] `ff_notif_prefs` OFF = today's behavior; verify gate green.
