-- ─────────────────────────────────────────────────────────────────────────────
-- DB improvements — Part of the production-readiness hardening.
-- Run this in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Allow users to delete their own OLD read notifications ────────────────
-- Required so generateNotifications() can auto-clean read rows > 30 days.
create policy notifications_delete_own on notifications
  for delete using (
    user_id = app_user_id()
    and read_at is not null
  );

-- ── 2. Partial index for the most common follow_up_tasks query ───────────────
-- The home screen and members list both filter: status='pending' + due_date.
-- A partial index on pending rows only is much smaller and faster to scan.
create index if not exists follow_up_tasks_pending_idx
  on follow_up_tasks (member_id, due_date)
  where status = 'pending';

-- ── 3. Partial index on weight_logs for recent lookups ───────────────────────
-- Member detail fetches last 6 weights; this index makes that O(log n).
-- (The existing compound index already covers this, but explicit is clearer.)
-- No-op if already covered — left here for documentation.
