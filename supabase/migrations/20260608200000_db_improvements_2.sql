-- ─────────────────────────────────────────────────────────────────────────────
-- DB improvements round 2 (post CTO audit)
--
-- 1. hierarchy_closure composite index  — covers the add_to_closure() trigger's
--    heap fetch on `depth` and future "find ancestors at depth N" queries.
-- 2. users.status CHECK constraint      — column exists (default 'active') but
--    had no constraint; also adds a partial index for active-user queries.
-- 3. current_weight sync trigger        — keeps members.current_weight in lock-
--    step with weight_logs; the application action no longer needs two writes.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. hierarchy_closure: composite index on (descendant_id, depth) ──────────
-- The existing primary key (ancestor_id, descendant_id) covers can_see().
-- This composite index covers the trigger query:
--   SELECT ancestor_id, depth FROM hierarchy_closure WHERE descendant_id = X
-- without a heap fetch for the `depth` column.
create index if not exists hierarchy_closure_descendant_depth_idx
  on hierarchy_closure (descendant_id, depth);

-- ── 2. users.status: enforce valid values + fast-path index ──────────────────
-- The column already exists with default 'active'.  Add the check constraint
-- and a partial index so queries like "visible active members" stay fast.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_status_check' and conrelid = 'users'::regclass
  ) then
    alter table users
      add constraint users_status_check check (status in ('active','inactive'));
  end if;
end $$;

create index if not exists users_status_active_idx
  on users (id) where status = 'active';

-- ── 3. current_weight auto-sync trigger ──────────────────────────────────────
-- Fires after every INSERT on weight_logs and keeps members.current_weight
-- up to date automatically.  The logWeight() server action can now skip its
-- second UPDATE round-trip (done in the companion code change).
create or replace function sync_current_weight()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update members
  set    current_weight = new.weight
  where  user_id = new.member_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_current_weight on weight_logs;
create trigger trg_sync_current_weight
  after insert on weight_logs
  for each row
  execute function sync_current_weight();
