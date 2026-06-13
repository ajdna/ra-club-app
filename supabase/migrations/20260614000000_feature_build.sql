-- ─────────────────────────────────────────────────────────────────────────────
-- Feature Build: completion notes, broadcast targets, member self-service RLS,
--                analytics helpers, search index
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. completion_note on follow_up_tasks ─────────────────────────────────────
alter table follow_up_tasks
  add column if not exists completion_note text;

-- ── 2. broadcast_target on notifications ─────────────────────────────────────
-- Allows broadcasts to be scoped to 'all' | 'coaches' | 'members'
alter table notifications
  add column if not exists broadcast_target text default 'all';

-- ── 3. Member can see their OWN attendance and weight logs ────────────────────
-- Existing policies only allow coaches/upline via can_see().
-- Members need to see their own rows to power /my-progress.
create policy if not exists attendance_select_self on attendance
  for select using ( member_id = app_user_id() );

create policy if not exists weight_logs_select_self on weight_logs
  for select using ( member_id = app_user_id() );

-- Member can insert their own weight log
create policy if not exists weight_logs_insert_self on weight_logs
  for insert with check ( member_id = app_user_id() );

-- Member can insert their own attendance
create policy if not exists attendance_insert_self on attendance
  for insert with check ( member_id = app_user_id() );

-- Member can update their own attendance
create policy if not exists attendance_update_self on attendance
  for update using ( member_id = app_user_id() )
  with check ( member_id = app_user_id() );

-- ── 4. Member can read their own follow_up_tasks ──────────────────────────────
-- Needed for /my-progress to show upcoming tasks
create policy if not exists follow_up_tasks_select_self on follow_up_tasks
  for select using ( member_id = app_user_id() );

-- ── 5. Member can read their own members row ──────────────────────────────────
create policy if not exists members_select_self on members
  for select using ( user_id = app_user_id() );

-- ── 6. Full-text search index on users (name + phone) ────────────────────────
create index if not exists users_name_search_idx
  on users using gin (to_tsvector('simple', coalesce(name, '')));

-- ── 7. Analytics helper: active member count by stage ────────────────────────
-- Used by /admin/analytics — pure SELECT, no new tables needed.
-- Materialized view would be overkill; the page uses direct aggregates.

-- ── 8. notifications: allow members to read own notifications ─────────────────
-- (policy may already exist; wrapped in DO block to avoid error)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'notifications' and policyname = 'notifications_select_own'
  ) then
    execute 'create policy notifications_select_own on notifications
      for select using ( user_id = app_user_id() )';
  end if;
end $$;
