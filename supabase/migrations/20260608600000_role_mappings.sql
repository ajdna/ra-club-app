-- ─────────────────────────────────────────────────────────────────────────────
-- Role Mappings — configurable display-name → system-role table
--
-- Allows the club owner to define any label (e.g. "Supervisor-Coach",
-- "Star Member", "Senior Coach") and map it to a system role, controlling:
--   • which system role it maps to
--   • whether people with this label get a members row (health track)
--   • whether they get follow-up tasks
--
-- The Excel import reads this table for role resolution — no code change
-- needed when new roles are added.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists role_mappings (
  id               uuid primary key default gen_random_uuid(),
  display_name     text not null,          -- label used in Excel / UI
  system_role      user_role not null,     -- maps to existing DB enum
  gets_members_row boolean not null default false,  -- health track
  gets_followup    boolean not null default false,  -- follow-up tasks
  sort_order       smallint not null default 99,
  created_at       timestamptz not null default now(),
  constraint role_mappings_display_name_unique unique (display_name)
);

-- RLS — only club_owner can manage, everyone can read
alter table role_mappings enable row level security;

create policy role_mappings_select on role_mappings
  for select using (true);

create policy role_mappings_insert on role_mappings
  for insert with check (app_user_role() = 'club_owner');

create policy role_mappings_update on role_mappings
  for update using (app_user_role() = 'club_owner');

create policy role_mappings_delete on role_mappings
  for delete using (app_user_role() = 'club_owner');

-- ── Seed default mappings ─────────────────────────────────────────────────────
insert into role_mappings
  (display_name, system_role, gets_members_row, gets_followup, sort_order)
values
  ('Member',           'member',     true,  true,  1),
  ('Supervisor-Coach', 'supervisor', true,  true,  2),
  ('Supervisor',       'supervisor', true,  true,  3),
  ('Coach',            'coach',      true,  true,  4),
  ('JCO',              'jco',        false, false, 5),
  ('NCO',              'nco',        false, false, 6)
on conflict (display_name) do nothing;

-- ── Update bulk_import_user to use role_mappings for members/followup logic ──
-- The app-layer (TypeScript) reads role_mappings; the SQL function just needs
-- to know whether to create a members row — we pass that as a boolean now.
drop function if exists bulk_import_user(text, uuid, user_role, text, text, membership_type, date, numeric, numeric);

create or replace function bulk_import_user(
  p_name            text,
  p_upline_id       uuid,
  p_role            user_role       default 'member',
  p_gets_members_row boolean        default false,
  p_phone           text            default null,
  p_email           text            default null,
  p_membership      membership_type default 'basic',
  p_join_date       date            default current_date,
  p_ideal_weight    numeric         default null,
  p_cur_weight      numeric         default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if app_user_role() <> 'club_owner' then
    raise exception 'Only the club owner can bulk-import users';
  end if;

  if p_role = 'club_owner' then
    raise exception 'Cannot bulk-import club_owner role';
  end if;

  if not exists (
    select 1 from users where id = p_upline_id and status = 'active'
  ) then
    raise exception 'Upline not found or not active: %', p_upline_id;
  end if;

  if p_phone is not null and btrim(p_phone) <> '' and exists (
    select 1 from users where phone = btrim(p_phone)
  ) then
    raise exception 'Phone already registered: %', p_phone;
  end if;

  if p_email is not null and btrim(p_email) <> '' and exists (
    select 1 from users where email = lower(btrim(p_email))
  ) then
    raise exception 'Email already registered: %', p_email;
  end if;

  insert into users (name, phone, email, role, parent_id, status)
  values (
    btrim(p_name),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(lower(btrim(coalesce(p_email, ''))), ''),
    p_role,
    p_upline_id,
    'active'
  )
  returning id into v_id;

  -- Create members row based on the mapping's gets_members_row flag
  if p_gets_members_row then
    insert into members (
      user_id, coach_id, membership_type, join_date,
      ideal_weight, current_weight
    )
    values (
      v_id, p_upline_id, p_membership, p_join_date,
      p_ideal_weight, p_cur_weight
    );
  end if;

  return v_id;
end;
$$;

grant execute on function bulk_import_user(
  text, uuid, user_role, boolean, text, text, membership_type, date, numeric, numeric
) to authenticated;
