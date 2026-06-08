-- ─────────────────────────────────────────────────────────────────────────────
-- Member intake — the "1st Home Visit Format" (page 1 of the intake PDF).
-- One row per member; captured at the first home visit, editable later.
-- Columns match src/modules/members/intake.ts (INTAKE_FIELDS).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists member_intake (
  member_id        uuid primary key references members(user_id) on delete cascade,
  visit_date       date,
  age              int,
  height_cm        numeric,
  start_weight     numeric,
  ideal_weight     numeric,
  family_members   text,
  health_challenge text,
  purpose          text,
  energy           text,
  digestion        text,
  sleep            text,
  wake_up_time     text,
  sleeping_time    text,
  breakfast_time   text,
  mid_meal_1       text,
  lunch_time       text,
  mid_meal_2       text,
  dinner_time      text,
  exercise         text,
  water_intake     text,
  fruit_salad      text,
  tea              text,
  non_veg          text,
  notes            text,
  recorded_by      uuid references users(id),
  updated_at       timestamptz not null default now()
);

alter table member_intake enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'member_intake' and policyname = 'member_intake_select_downline') then
    create policy member_intake_select_downline on member_intake
      for select using ( can_see(member_id) );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'member_intake' and policyname = 'member_intake_insert_downline') then
    create policy member_intake_insert_downline on member_intake
      for insert with check ( can_see(member_id) );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'member_intake' and policyname = 'member_intake_update_downline') then
    create policy member_intake_update_downline on member_intake
      for update using ( can_see(member_id) ) with check ( can_see(member_id) );
  end if;
end $$;
