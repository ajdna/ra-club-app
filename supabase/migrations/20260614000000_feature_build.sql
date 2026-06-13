-- ─────────────────────────────────────────────────────────────────────────────
-- Feature Build: completion notes, broadcast targets, member self-service RLS,
--                analytics helpers, search index
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. completion_note on follow_up_tasks ─────────────────────────────────────
alter table follow_up_tasks
  add column if not exists completion_note text;

-- ── 2. broadcast_target on notifications ─────────────────────────────────────
alter table notifications
  add column if not exists broadcast_target text default 'all';

-- ── 3. Member self-service RLS policies ──────────────────────────────────────
-- PostgreSQL does not support CREATE POLICY IF NOT EXISTS, so use DO blocks.

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'attendance' and policyname = 'attendance_select_self'
  ) then
    execute 'create policy attendance_select_self on attendance
      for select using ( member_id = app_user_id() )';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'weight_logs' and policyname = 'weight_logs_select_self'
  ) then
    execute 'create policy weight_logs_select_self on weight_logs
      for select using ( member_id = app_user_id() )';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'weight_logs' and policyname = 'weight_logs_insert_self'
  ) then
    execute 'create policy weight_logs_insert_self on weight_logs
      for insert with check ( member_id = app_user_id() )';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'attendance' and policyname = 'attendance_insert_self'
  ) then
    execute 'create policy attendance_insert_self on attendance
      for insert with check ( member_id = app_user_id() )';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'attendance' and policyname = 'attendance_update_self'
  ) then
    execute 'create policy attendance_update_self on attendance
      for update using ( member_id = app_user_id() )
      with check ( member_id = app_user_id() )';
  end if;
end $$;

-- ── 4. Member can read their own follow_up_tasks ──────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'follow_up_tasks' and policyname = 'follow_up_tasks_select_self'
  ) then
    execute 'create policy follow_up_tasks_select_self on follow_up_tasks
      for select using ( member_id = app_user_id() )';
  end if;
end $$;

-- ── 5. Member can read their own members row ──────────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'members' and policyname = 'members_select_self'
  ) then
    execute 'create policy members_select_self on members
      for select using ( user_id = app_user_id() )';
  end if;
end $$;

-- ── 6. Member can read own notifications ──────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications_select_own'
  ) then
    execute 'create policy notifications_select_own on notifications
      for select using ( user_id = app_user_id() )';
  end if;
end $$;

-- ── 7. Full-text search index on users.name ───────────────────────────────────
create index if not exists users_name_search_idx
  on users using gin (to_tsvector('simple', coalesce(name, '')));
