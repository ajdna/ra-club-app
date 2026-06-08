-- ─────────────────────────────────────────────────────────────────────────────
-- Follow-up Engine + Bulk Member Import
--
-- 1. Relax follow_up_tasks constraints:
--    - day_number: 1-90 → 1-30 (relative day within any 30-day cycle)
--    - cycle: 1-3 → any positive integer (months go on forever)
-- 2. Add title column to follow_up_tasks for display.
-- 3. Add bulk_import_member() — club_owner creates a member under any coach.
-- 4. Add generate_member_followup() — inserts pre-computed tasks for a member.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 0. Extend notification_type enum with cron notification types ─────────────
alter type notification_type add value if not exists 'weight_reminder';
alter type notification_type add value if not exists 'checkin_reminder';
alter type notification_type add value if not exists 'followup_reminder';
alter type notification_type add value if not exists 'followup_overdue';
alter type notification_type add value if not exists 'dmo_reminder';

-- ── 1. Fix constraints on follow_up_tasks ────────────────────────────────────
alter table follow_up_tasks
  drop constraint if exists follow_up_tasks_day_number_check,
  drop constraint if exists follow_up_tasks_cycle_check;

alter table follow_up_tasks
  add constraint follow_up_tasks_day_number_check
    check (day_number between 1 and 30),
  add constraint follow_up_tasks_cycle_check
    check (cycle >= 1);

-- ── 2. Add title column ───────────────────────────────────────────────────────
alter table follow_up_tasks
  add column if not exists title text;

-- ── 3. bulk_import_member() — club_owner only ────────────────────────────────
-- Creates a users row + members row for a new member under the given coach.
-- Called from the Excel import server action.
-- Returns the new user's UUID.
create or replace function bulk_import_member(
  p_name         text,
  p_coach_id     uuid,
  p_phone        text            default null,
  p_email        text            default null,
  p_membership   membership_type default 'basic',
  p_join_date    date            default current_date,
  p_ideal_weight numeric         default null,
  p_cur_weight   numeric         default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Only club owner can bulk-import.
  if app_user_role() <> 'club_owner' then
    raise exception 'Only the club owner can bulk-import members';
  end if;

  -- Coach must exist and be active.
  if not exists (
    select 1 from users
    where id = p_coach_id
      and status = 'active'
      and role in ('club_owner','nco','jco','coach')
  ) then
    raise exception 'Coach not found or not active: %', p_coach_id;
  end if;

  -- Skip duplicate phone.
  if p_phone is not null and exists (
    select 1 from users where phone = btrim(p_phone)
  ) then
    raise exception 'Phone already registered: %', p_phone;
  end if;

  -- Skip duplicate email.
  if p_email is not null and exists (
    select 1 from users where email = lower(btrim(p_email))
  ) then
    raise exception 'Email already registered: %', p_email;
  end if;

  -- Insert user row (active, no auth link — they set password later).
  insert into users (name, phone, email, role, parent_id, status)
  values (
    btrim(p_name),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(lower(btrim(coalesce(p_email, ''))), ''),
    'member',
    p_coach_id,
    'active'
  )
  returning id into v_id;

  -- Insert member row.
  insert into members (
    user_id, coach_id, membership_type, join_date,
    ideal_weight, current_weight
  )
  values (
    v_id,
    p_coach_id,
    p_membership,
    p_join_date,
    p_ideal_weight,
    p_cur_weight
  );

  return v_id;
end;
$$;

grant execute on function bulk_import_member(
  text, uuid, text, text, membership_type, date, numeric, numeric
) to authenticated;

-- ── 4. Index for today's tasks lookup (cron + coach dashboard) ────────────────
create index if not exists follow_up_tasks_due_date_idx
  on follow_up_tasks (due_date, status)
  where status = 'pending';
