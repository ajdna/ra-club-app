-- ─────────────────────────────────────────────────────────────────────────────
-- create_member(): add a member under the calling user (their coach).
--
-- Why a SECURITY DEFINER function instead of a plain insert:
-- a new user's hierarchy_closure rows are populated by an AFTER INSERT trigger,
-- so an `insert ... returning` from the client trips the RLS SELECT/WITH CHECK
-- before the closure exists ("new row violates row-level security policy").
-- This function runs as owner (bypassing RLS), but still enforces that the
-- caller is a signed-in, linked user and forces parent_id/coach_id = caller.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function create_member(
  p_name       text,
  p_phone      text,
  p_membership membership_type,
  p_stage      int
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid;
  v_id     uuid;
begin
  v_caller := app_user_id();
  if v_caller is null then
    raise exception 'Not signed in or account not linked';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Name is required';
  end if;

  if p_stage is null or p_stage < 0 or p_stage > 6 then
    p_stage := 0;
  end if;

  insert into users (name, phone, role, parent_id)
  values (btrim(p_name), nullif(btrim(p_phone), ''), 'member', v_caller)
  returning id into v_id;

  insert into members (user_id, coach_id, membership_type, stage)
  values (v_id, v_caller, p_membership, p_stage);

  return v_id;
end;
$$;

grant execute on function create_member(text, text, membership_type, int) to authenticated;
