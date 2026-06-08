-- ─────────────────────────────────────────────────────────────────────────────
-- bulk_upsert_user — insert / update / skip logic for Excel import
--
-- Match strategy (in order):
--   1. phone  (if provided and non-empty)
--   2. name   (case-insensitive, exact trim)
--
-- Returns JSONB:
--   { "id": "<uuid>", "action": "inserted" | "updated" | "skipped",
--     "date_changed": true | false }
--
-- "date_changed" tells the app layer whether to regenerate follow-up tasks.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function bulk_upsert_user(
  p_name             text,
  p_upline_id        uuid,
  p_role             user_role       default 'member',
  p_gets_members_row boolean         default false,
  p_phone            text            default null,
  p_email            text            default null,
  p_membership       membership_type default 'basic',
  p_join_date        date            default current_date,
  p_ideal_weight     numeric         default null,
  p_cur_weight       numeric         default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id          uuid;
  v_phone       text := nullif(btrim(coalesce(p_phone, '')), '');
  v_email       text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_name        text := btrim(p_name);
  v_changed     boolean := false;
  v_date_changed boolean := false;
  v_existing    record;
  v_member      record;
begin
  -- ── Auth check ──────────────────────────────────────────────────────────────
  if app_user_role() <> 'club_owner' then
    raise exception 'Only the club owner can bulk-import users';
  end if;
  if p_role = 'club_owner' then
    raise exception 'Cannot bulk-import club_owner role';
  end if;
  if not exists (select 1 from users where id = p_upline_id and status = 'active') then
    raise exception 'Upline not found or not active: %', p_upline_id;
  end if;

  -- ── Try to find existing user ───────────────────────────────────────────────
  if v_phone is not null then
    select * into v_existing from users where phone = v_phone limit 1;
  end if;
  if v_existing is null then
    select * into v_existing from users
    where lower(btrim(name)) = lower(v_name)
    limit 1;
  end if;

  -- ── INSERT ──────────────────────────────────────────────────────────────────
  if v_existing is null then
    insert into users (name, phone, email, role, parent_id, status)
    values (v_name, v_phone, v_email, p_role, p_upline_id, 'active')
    returning id into v_id;

    if p_gets_members_row then
      insert into members (user_id, coach_id, membership_type, join_date, ideal_weight, current_weight)
      values (v_id, p_upline_id, p_membership, p_join_date, p_ideal_weight, p_cur_weight);
    end if;

    return jsonb_build_object('id', v_id, 'action', 'inserted', 'date_changed', true);
  end if;

  -- ── Existing user — detect changes ─────────────────────────────────────────
  v_id := v_existing.id;

  -- Check users-table fields
  if v_existing.name        is distinct from v_name        then v_changed := true; end if;
  if v_existing.role        is distinct from p_role        then v_changed := true; end if;
  if v_existing.parent_id   is distinct from p_upline_id   then v_changed := true; end if;
  if v_existing.email       is distinct from v_email       then v_changed := true; end if;
  if v_phone is not null and v_existing.phone is distinct from v_phone then v_changed := true; end if;

  -- Check members-table fields (only if role gets a members row)
  if p_gets_members_row then
    select * into v_member from members where user_id = v_id;

    if v_member is null then
      -- Members row didn't exist — treat as changed so we create it
      v_changed := true;
      v_date_changed := true;
    else
      if v_member.coach_id        is distinct from p_upline_id   then v_changed := true; end if;
      if v_member.membership_type is distinct from p_membership  then v_changed := true; end if;
      if v_member.ideal_weight    is distinct from p_ideal_weight then v_changed := true; end if;
      if v_member.current_weight  is distinct from p_cur_weight  then v_changed := true; end if;
      if v_member.join_date       is distinct from p_join_date   then
        v_changed := true;
        v_date_changed := true;  -- triggers follow-up task regeneration in app
      end if;
    end if;
  end if;

  -- ── SKIP — nothing changed ──────────────────────────────────────────────────
  if not v_changed then
    return jsonb_build_object('id', v_id, 'action', 'skipped', 'date_changed', false);
  end if;

  -- ── UPDATE ──────────────────────────────────────────────────────────────────
  update users set
    name      = v_name,
    role      = p_role,
    parent_id = p_upline_id,
    email     = coalesce(v_email, email),
    phone     = coalesce(v_phone, phone)
  where id = v_id;

  if p_gets_members_row then
    if v_member is null then
      insert into members (user_id, coach_id, membership_type, join_date, ideal_weight, current_weight)
      values (v_id, p_upline_id, p_membership, p_join_date, p_ideal_weight, p_cur_weight);
    else
      update members set
        coach_id        = p_upline_id,
        membership_type = p_membership,
        join_date       = p_join_date,
        ideal_weight    = p_ideal_weight,
        current_weight  = coalesce(p_cur_weight, current_weight)
      where user_id = v_id;
    end if;
  end if;

  -- Also update hierarchy_closure if parent changed
  if v_existing.parent_id is distinct from p_upline_id then
    -- Remove old closure entries (except self-reference)
    delete from hierarchy_closure
    where descendant_id = v_id and ancestor_id <> v_id;

    -- Insert new closure entries
    insert into hierarchy_closure (ancestor_id, descendant_id, depth)
    select hc.ancestor_id, v_id, hc.depth + 1
    from hierarchy_closure hc
    where hc.descendant_id = p_upline_id
    union all
    select v_id, v_id, 0;
  end if;

  return jsonb_build_object('id', v_id, 'action', 'updated', 'date_changed', v_date_changed);
end;
$$;

grant execute on function bulk_upsert_user(
  text, uuid, user_role, boolean, text, text, membership_type, date, numeric, numeric
) to authenticated;
