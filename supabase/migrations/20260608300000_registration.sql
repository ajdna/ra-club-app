-- ─────────────────────────────────────────────────────────────────────────────
-- Self-registration + approval flow + role/profile management
--
-- 1. Extend users.status to include 'pending' and 'rejected'.
-- 2. get_coaches_for_registration() — public (anon) — for the sign-up form.
-- 3. register_user()    — called after supabase.auth.signUp(); creates a
--                         'pending' users row linked to the new auth UID.
-- 4. approve_user()     — club_owner only; sets status = 'active'.
-- 5. reject_user()      — club_owner only; sets status = 'rejected'.
-- 6. update_user_role() — club_owner only; changes role + optionally upline.
-- 7. update_user_details() — self OR upline can edit personal fields.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Extend status constraint ───────────────────────────────────────────────
alter table users drop constraint if exists users_status_check;
alter table users add constraint users_status_check
  check (status in ('active', 'inactive', 'pending', 'rejected'));

-- ── 2. get_coaches_for_registration() — public, granted to anon ───────────────
-- Returns the list of active coaches/operators the registrant can choose as
-- their upline. Granted to anon so it works on the unauthenticated register page.
create or replace function get_coaches_for_registration()
returns table(id uuid, name text, role user_role)
language sql
security definer
set search_path = public
as $$
  select id, name, role
  from   users
  where  status = 'active'
    and  role in ('club_owner','nco','jco','coach')
  order  by role, name;
$$;

grant execute on function get_coaches_for_registration()
  to anon, authenticated;

-- ── 3. register_user() — creates a 'pending' row, links to current auth uid ──
-- Flow: client calls supabase.auth.signUp() → then calls this function (now
-- authenticated). The function inserts a users row with status='pending' and
-- auth_id = auth.uid() so the hierarchy can be built at approval time.
create or replace function register_user(
  p_name      text,
  p_email     text,
  p_phone     text,
  p_role      user_role,   -- only 'member' or 'coach' allowed
  p_parent_id uuid         -- chosen upline (must be active)
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Only member or coach roles can self-register.
  if p_role not in ('member','coach') then
    raise exception 'Invalid role for self-registration';
  end if;

  -- Chosen upline must exist and be active.
  if p_parent_id is not null then
    if not exists (
      select 1 from users where id = p_parent_id and status = 'active'
    ) then
      raise exception 'Selected upline not found or not active';
    end if;
  end if;

  -- Prevent duplicate email.
  if exists (
    select 1 from users where email = lower(btrim(p_email))
  ) then
    raise exception 'Email already registered in the club system';
  end if;

  -- Insert pending row. parent_id is stored but the hierarchy_closure trigger
  -- fires immediately — that is intentional so the upline can see the pending
  -- user in their admin view. RLS only exposes active users for regular queries,
  -- and the closure table is used for can_see() which is also status-unaware —
  -- this means the pending user IS visible in admin views (desired).
  insert into users (name, email, phone, role, parent_id, status, auth_id)
  values (
    btrim(p_name),
    lower(btrim(p_email)),
    nullif(btrim(p_phone), ''),
    p_role,
    p_parent_id,
    'pending',
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function register_user(text, text, user_role, text, uuid)
  to authenticated;

-- ── 4. approve_user() — club_owner only ──────────────────────────────────────
create or replace function approve_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if app_user_role() <> 'club_owner' then
    raise exception 'Only the club owner can approve registrations';
  end if;

  update users
  set    status = 'active'
  where  id = p_user_id and status = 'pending';

  if not found then
    raise exception 'User not found or not in pending state';
  end if;
end;
$$;

grant execute on function approve_user(uuid) to authenticated;

-- ── 5. reject_user() — club_owner only ───────────────────────────────────────
create or replace function reject_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if app_user_role() <> 'club_owner' then
    raise exception 'Only the club owner can reject registrations';
  end if;

  update users
  set    status = 'rejected'
  where  id = p_user_id and status = 'pending';

  if not found then
    raise exception 'User not found or not in pending state';
  end if;
end;
$$;

grant execute on function reject_user(uuid) to authenticated;

-- ── 6. update_user_role() — club_owner only ───────────────────────────────────
-- Allows the club owner to change any user's role (member→coach→jco→nco) and
-- optionally re-assign their upline. Also handles membership type change.
create or replace function update_user_role(
  p_user_id       uuid,
  p_new_role      user_role,
  p_new_parent_id uuid         default null,
  p_membership    membership_type default null,
  p_status        text         default null   -- 'active'|'inactive' to suspend/restore
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if app_user_role() <> 'club_owner' then
    raise exception 'Only the club owner can change roles';
  end if;

  -- Update user row.
  update users
  set role      = p_new_role,
      parent_id = coalesce(p_new_parent_id, parent_id),
      status    = coalesce(p_status, status)
  where id = p_user_id;

  -- If this user has a members row and a new membership was provided, update it.
  if p_membership is not null then
    update members
    set    membership_type = p_membership
    where  user_id = p_user_id;
  end if;
end;
$$;

grant execute on function update_user_role(uuid, user_role, uuid, membership_type, text)
  to authenticated;

-- ── 7. update_user_details() — self or upline ─────────────────────────────────
-- Personal fields (name, phone, address) can be edited by the user themselves
-- or by anyone in their upline hierarchy. The club owner can edit anyone.
create or replace function update_user_details(
  p_user_id uuid,
  p_name    text  default null,
  p_phone   text  default null,
  p_address text  default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := app_user_id();
begin
  -- Must be self, upline, or club_owner.
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  if v_me <> p_user_id
    and app_user_role() <> 'club_owner'
    and not can_see(p_user_id) then
    raise exception 'Not authorised to edit this user';
  end if;

  update users
  set name    = coalesce(p_name, name),
      phone   = coalesce(nullif(btrim(coalesce(p_phone,'')), ''), phone),
      address = coalesce(p_address, address)
  where id = p_user_id;
end;
$$;

grant execute on function update_user_details(uuid, text, text, text)
  to authenticated;

-- ── Pending-users index — speeds up the admin pending list ───────────────────
create index if not exists users_pending_idx
  on users (created_at desc) where status = 'pending';
