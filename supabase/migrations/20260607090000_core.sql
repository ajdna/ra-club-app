-- ─────────────────────────────────────────────────────────────────────────────
-- Ruby Ankur Wellness — core schema (Build Guide Step 2)
-- Enums, core tables, the hierarchy closure table + maintenance trigger, and
-- SECURITY DEFINER helper functions used by RLS.
-- Aligned with club-app/src/lib/types.ts and the Technical Architecture data model.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ── Enums ────────────────────────────────────────────────────────────────────
create type user_role as enum
  ('upline','club_owner','nco','jco','coach','member','privilege','guest');
create type membership_type as enum ('basic','elite','privilege');
create type followup_activity as enum ('call','home_visit','reminder');
create type followup_status as enum ('pending','done','skipped');

-- ── Users (the org tree nodes) ───────────────────────────────────────────────
create table users (
  id              uuid primary key default gen_random_uuid(),
  auth_id         uuid unique,                 -- links to Supabase auth.users.id
  name            text not null,
  phone           text unique,
  email           text unique,
  role            user_role not null,
  parent_id       uuid references users(id),   -- upline
  ambassador_tier text,
  status          text not null default 'active',
  address         text,
  locale          text,
  timezone        text,
  created_at      timestamptz not null default now()
);
create index users_parent_id_idx on users(parent_id);
create index users_auth_id_idx on users(auth_id);

-- ── Hierarchy closure table (downline + sideline isolation) ──────────────────
-- One row per (ancestor, descendant) pair, including self (depth 0).
create table hierarchy_closure (
  ancestor_id   uuid not null references users(id) on delete cascade,
  descendant_id uuid not null references users(id) on delete cascade,
  depth         int  not null,
  primary key (ancestor_id, descendant_id)
);
create index hierarchy_closure_ancestor_idx   on hierarchy_closure(ancestor_id);
create index hierarchy_closure_descendant_idx on hierarchy_closure(descendant_id);

-- When a user is inserted: link self (depth 0), then connect every ancestor of
-- the parent to the new node at depth+1.
create or replace function add_to_closure() returns trigger as $$
begin
  insert into hierarchy_closure (ancestor_id, descendant_id, depth)
  values (new.id, new.id, 0);

  if new.parent_id is not null then
    insert into hierarchy_closure (ancestor_id, descendant_id, depth)
    select c.ancestor_id, new.id, c.depth + 1
    from hierarchy_closure c
    where c.descendant_id = new.parent_id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_add_to_closure
after insert on users
for each row execute function add_to_closure();

-- ── Members (health track) ───────────────────────────────────────────────────
create table members (
  user_id         uuid primary key references users(id) on delete cascade,
  coach_id        uuid not null references users(id),
  membership_type membership_type not null,
  stage           smallint not null default 0 check (stage between 0 and 6),
  join_date       date not null default current_date,
  recharge_count  int  not null default 0,
  ideal_weight    numeric,
  current_weight  numeric,
  program_config  jsonb not null default '{}'::jsonb
);
create index members_coach_id_idx on members(coach_id);

-- ── 90-day follow-up tasks ───────────────────────────────────────────────────
create table follow_up_tasks (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references members(user_id) on delete cascade,
  coach_id     uuid not null references users(id),
  day_number   int  not null check (day_number between 1 and 90),
  cycle        smallint not null check (cycle between 1 and 3),
  activity     followup_activity not null,
  due_date     date not null,
  status       followup_status not null default 'pending',
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index follow_up_tasks_member_idx on follow_up_tasks(member_id);
create index follow_up_tasks_coach_due_idx on follow_up_tasks(coach_id, due_date);

-- ── DMO entries (coach self-motivation scorecard) ────────────────────────────
create table dmo_entries (
  id                   uuid primary key default gen_random_uuid(),
  coach_id             uuid not null references users(id) on delete cascade,
  entry_date           date not null default current_date,
  present_in_club      int not null default 0,
  video_on_interaction int not null default 0,
  video_on_meet        int not null default 0,
  status_posts         int not null default 0,
  calls_made           int not null default 0,
  new_guests           int not null default 0,
  contact_list         int not null default 0,
  second_shake         int not null default 0,
  total int generated always as (
    present_in_club + video_on_interaction + video_on_meet + status_posts
    + calls_made + new_guests + contact_list + second_shake
  ) stored,
  created_at           timestamptz not null default now(),
  unique (coach_id, entry_date)
);

-- ── Rule config (the configurability core / Rules Engine) ────────────────────
create table rule_config (
  id         uuid primary key default gen_random_uuid(),
  key        text unique not null,
  value      jsonb not null,
  updated_by uuid references users(id),
  updated_at timestamptz not null default now()
);

-- ── Helper functions for RLS (SECURITY DEFINER => bypass RLS internally,
--    which prevents recursive policy evaluation) ──────────────────────────────
create or replace function app_user_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select id from public.users where auth_id = auth.uid()
$$;

create or replace function app_user_role() returns user_role
  language sql stable security definer set search_path = public as $$
  select role from public.users where auth_id = auth.uid()
$$;

-- True if the current user may see `target` (target is in their subtree).
create or replace function can_see(target uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.hierarchy_closure c
    where c.ancestor_id = public.app_user_id()
      and c.descendant_id = target
  )
$$;
