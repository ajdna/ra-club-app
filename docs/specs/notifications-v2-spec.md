# Spec — Notifications v2

> Builds on shipped notif-prefs. Four independently shippable sub-features, each its own branch/flag/rollback. Model `sonnet` build, `opus` review (RLS + fan-out). Recommended order: 2B → 2A → 2C → 2D.

---

## 2B — Instant + priority + honor on/off (fix the gap) · `feat/notif-instant-priority` · no flag (safe default)
**Why first:** smallest, fixes a real gap (messages/broadcasts ignore the on/off toggle).
- `/api/push/notify` (messages, broadcasts, home-visit) currently calls `sendPushToUser` directly — **add an `isEnabled(userId, type)` check** per recipient (`message_received` / `broadcast_received`) before sending. Default-true, so users who never set a pref are unaffected.
- **Priority delivery:** pass `urgency: "high"` (web-push header) + a short `TTL` for these event pushes so the push service delivers immediately, not batched. Add an `urgency` option to `sendPushToUser`/`sendPushToUsers`; default `normal`, set `high` for messages/broadcasts/home-visit.
- These are already instant (DB webhook on insert) — this just guarantees priority + respects prefs.
- **Rollback:** revert (pure code, no schema).

## 2A — Sound / vibration toggle · `feat/notif-sound` · part of prefs
- Add a single per-user **"Sound & vibration"** toggle in Personalization (one row `type='sound'` in `notification_prefs`, default ON).
- `sendPushToUser` looks up the recipient's `sound` pref; when OFF, include `silent: true` in the push payload. The **service worker** sets `showNotification({ silent })` and omits the `vibrate` pattern.
- Honest limit: web push can only **silence** — it can't pick a custom sound (OS-controlled). So the toggle = "make my notifications silent / not."
- **Rollback:** revert; pref row harmless.

## 2C — Morning/evening club reminders (members) · `feat/club-reminders` · flag `ff_club_reminders`
- Owner sets **club-wide times** in Admin → `rule_config.club_timings = {"morning":"06:00","evening":"18:00"}`.
- Two new digest types `morning_club` / `evening_club` in Personalization (members toggle on/off; **time is the club's, not per-user**).
- Audience: **all active users, any role** (owner/nco/jco/supervisor/coach/member) — everyone attends the club. Filter `status='active'` only, no role filter.
- Two stages (owner-configurable lead, default 15 min): **pre** "{period} club {HH:MM} baje shuru hoga — taiyaar ho jao" at `clubTime − lead`; **start** "{period} club shuru ho gaya — jaldi join karo" at `clubTime`. Each stage de-duped separately per day (internal `_pre`/`_start` markers); single user toggle controls both.
- **Rollback:** flag off; drop the two pref types; delete config key.

## 2D — Coach qualification levels + hierarchy-scoped groups + reminders · `feat/coach-reminders` · flag `ff_coach_reminders`
**Qualification taxonomy (editable list):**
- `rule_config.qualification_levels` — ordered list, default `["WCO","Qualified coach","Supervisor","Active Supervisor","JCO","NCO"]`. Owner can **add / remove / rename** levels in Admin (like `role_mappings`).
- `users.qualification text null` — exactly **one** level per coach, picked from that list; set/changed in Admin → Users. Reversible: drop column.
- Changing a coach's level auto-moves them between groups (a group = everyone of that level).

**Hierarchy-scoped groups (the key part):**
- A "group" is *derived, not stored*: people of level X that the current user can see. Owner/NCO/JCO each see **only their own downline** within a level, because the audience query is filtered through `can_see` / the closure table. So "send to my JCOs" = my downline ∧ qualification=JCO — auto-scoped, no group maintenance.

**Send reminder (Admin → "Send reminder"):**
- Audience = multi-select of role × status × qualification, intersected with the sender's visible tree. Hit all coaches, only active supervisors, only WCO, or several at once.
- Category: meeting / training / urgent / custom. **Send now** → `sendPushToUsers` urgency:high + in-app rows. **Schedule** → `scheduled_reminders` table (audience jsonb, category, title, body, send_at, created_by, sent_at), fired by the `*/15` dispatcher (send_at ≤ now & sent_at null → resolve audience → send → stamp).
- **Authorization:** owner + leaders (nco/jco/supervisor) for their own downline; RLS on `scheduled_reminders`.
- **Rollback:** flag off; drop table + column + config key.

## 2E — Click-to-chat / call deep links (free) · `feat/contact-deeplinks` · no flag
- On member/coach profile + contact rows: **Call**, **WhatsApp**, **Telegram** buttons.
  - Call → `tel:<phone>` · WhatsApp → `https://wa.me/<whatsapp_phone>?text=<prefill>` · Telegram → `https://t.me/<telegram_handle>`.
- Add `users.telegram_handle text null` (optional, set in Profile). WhatsApp uses existing `whatsapp_phone`; call uses `phone`.
- Pure links — opens the native app pre-filled; person taps send/call. Zero cost, no API. (Calling can only ever be a deep link — no app can place WhatsApp/Telegram calls programmatically.)
- **Rollback:** revert; column harmless.

## 2F — Telegram bot for free broadcast · `feat/telegram-bot` · flag `ff_telegram` · build LAST
- Free bot lets the app auto-send broadcasts/reminders to opted-in users (a second channel beside web push).
- Setup: BotFather → `TELEGRAM_BOT_TOKEN` env. Users tap **Connect Telegram** (deep link to bot) → webhook `/api/telegram/webhook` captures their `chat_id` → store `users.telegram_chat_id`.
- A Telegram sender helper mirrors `sendPushToUsers` (calls Telegram `sendMessage`), used by reminders/broadcasts for opted-in users.
- Medium effort (bot + webhook + opt-in). Flag-gated; build after 2A–2E prove out.
- **Rollback:** flag off; drop column; bot idle.

---

## Schema changes (all reversible)
| Change | Sub-feature |
|---|---|
| `notification_prefs` new types: `sound`, `morning_club`, `evening_club` | 2A, 2C |
| `rule_config.club_timings` json | 2C |
| `rule_config.qualification_levels` json (editable level list) | 2D |
| `users.qualification text` (one level/coach) | 2D |
| `scheduled_reminders` table + RLS | 2D |
| `users.telegram_handle text` | 2E |
| `users.telegram_chat_id text` | 2F |

## Build order
2B (priority + pref gap) → 2A (sound) → 2C (club reminders) → 2D (levels + groups + reminders) → 2E (deep links) → 2F (Telegram bot, last). Each: branch → `sonnet` build → verify → `opus` review → merge → flip flag → pilot.

## Cross-cutting
- The `*/15` GitHub Actions dispatcher gains two more jobs (club reminders, scheduled coach reminders) — no new infra/cost.
- Flags read via service client (already fixed) so they work in the dispatcher.
- Each sub-feature: branch → build (`sonnet`) → verify → review (`opus`) → merge → flip flag for pilot.

## Open data task (2D)
After shipping, you'll set `users.qualification` per coach (WCO/qualified/trainee/…) so those audiences resolve. Until set, target by role × status works immediately.
