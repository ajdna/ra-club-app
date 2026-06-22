-- Username (login handle) + WhatsApp number on users.
alter table users add column if not exists username text;
alter table users add column if not exists whatsapp_phone text;
create unique index if not exists users_username_lower_key on users (lower(username));

-- Self-registration with username + whatsapp. Username defaults to email when blank.
create or replace function register_user_v2(
  p_name text, p_username text, p_email text, p_phone text, p_whatsapp text,
  p_role user_role, p_parent_id uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_username text; v_email text;
begin
  if p_role not in ('member','coach') then
    raise exception 'Invalid role for self-registration';
  end if;
  if p_parent_id is not null and not exists (
    select 1 from users where id = p_parent_id and status = 'active'
  ) then
    raise exception 'Selected upline not found or not active';
  end if;

  v_email := lower(btrim(p_email));
  if exists (select 1 from users where email = v_email) then
    raise exception 'Email already registered in the club system';
  end if;

  v_username := lower(nullif(btrim(p_username), ''));
  if v_username is not null and exists (select 1 from users where lower(username) = v_username) then
    raise exception 'Username already taken';
  end if;

  if nullif(btrim(p_phone), '') is not null and exists (
    select 1 from users where phone = btrim(p_phone)
  ) then
    raise exception 'Phone already registered';
  end if;

  insert into users (name, username, email, phone, whatsapp_phone, role, parent_id, status, auth_id)
  values (
    btrim(p_name),
    coalesce(v_username, v_email),
    v_email,
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_whatsapp), ''),
    p_role,
    p_parent_id,
    'pending',
    auth.uid()
  )
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function register_user_v2(text, text, text, text, text, user_role, uuid) to authenticated;

-- Resolve a login identifier (email OR username) to the account email (pre-auth).
create or replace function get_login_email(p_identifier text) returns text
language sql security definer set search_path = public stable as $$
  select email from users
  where lower(email) = lower(btrim(p_identifier))
     or lower(username) = lower(btrim(p_identifier))
  limit 1;
$$;
grant execute on function get_login_email(text) to anon, authenticated;
