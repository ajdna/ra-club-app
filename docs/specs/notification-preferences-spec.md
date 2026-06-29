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
user_id     uuid  references users(id) on delete cascade
type        text  -- one of the keys above
enabled     boolean not null default true
send_time   time  null   -- only for digest types; null for event types
updated_at  timestamptz default now()
primary key (user_id, type)
```
Absence of a row = defaults (enabled, default time). RLS: a user reads/writes only their own rows.

## UI — Profile → Personalization
- A "Notifications" card listing each type with a toggle; digest types also show a time picker.
- Saves via a `setNotificationPref(type, enabled, sendTime?)` server action (writes own row only).

## Respecting prefs
- **Event push** (`notify()` + the chat `push-notify` path): before sending, check `notification_prefs` for that user+type; skip if disabled. (Move the chat/broadcast push through a pref check too.)
- **Digest crons (the custom-time part):** replace the single 7 AM run with a **dispatcher cron that runs every 30 min** (`*/30 * * * *`). Each run sends a digest to users whose `send_time` (rounded to the half hour) == the current IST slot AND who have that digest enabled AND have matching content (e.g. tasks due today). 30-min granularity = custom times without per-user scheduling infra.

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
| `src/app/api/cron/dispatch` | NEW every-30-min digest dispatcher (replaces fixed morning/evening sends, gated by flag) |
| `vercel.json` | add `*/30 * * * *` dispatch cron |
| `src/app/(app)/profile/*` | Personalization → Notifications card + `setNotificationPref` action |

## The one decision for you
Custom-time granularity vs cost:
- **(a) Every 30 min (recommended)** — users pick any :00/:30 slot; ~48 cron hits/day. Best UX, still cheap.
- **(b) Hourly** — top-of-hour only; ~24 hits/day. Leaner.
- **(c) Fixed presets** (Morning/Afternoon/Evening) — 3 runs/day; cheapest, least flexible.

(Vercel Hobby has cron limits; if we're on Hobby, (b)/(c) may be safer. I'll confirm the plan's cron allowance before building.)

## Acceptance
- [ ] Each user sets on/off per type; digest types set a time; saved per-user.
- [ ] Disabled type → no push for that user.
- [ ] Digest arrives at the user's chosen slot (±cron granularity).
- [ ] `ff_notif_prefs` OFF = today's behavior; verify gate green.
