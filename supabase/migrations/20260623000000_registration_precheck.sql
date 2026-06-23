-- Pre-flight check so the client can validate email / username / phone
-- BEFORE creating a Supabase auth user. This prevents orphaned auth users
-- (signup succeeds but the users-row insert fails) and lets the UI show a
-- clear reason. Returns NULL when registration can proceed, otherwise a
-- human-readable reason (Hinglish-friendly).
create or replace function public.check_registration_available(
  p_email text,
  p_username text,
  p_phone text
) returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_email text;
  v_username text;
  v_phone text;
begin
  v_email := lower(btrim(p_email));
  if v_email = '' then
    return 'Email daalein';
  end if;
  if exists (select 1 from users where email = v_email) then
    return 'Email already registered in the club system';
  end if;

  v_username := lower(nullif(btrim(p_username), ''));
  if v_username is not null and exists (
    select 1 from users where lower(username) = v_username
  ) then
    return 'Username already taken';
  end if;

  v_phone := nullif(btrim(p_phone), '');
  if v_phone is not null and exists (
    select 1 from users where phone = v_phone
  ) then
    return 'Phone already registered';
  end if;

  return null;
end;
$$;

grant execute on function public.check_registration_available(text, text, text)
  to anon, authenticated;
