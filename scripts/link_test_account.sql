-- ─────────────────────────────────────────────────────────────────────────────
-- LINK A SUPABASE AUTH USER TO THE `users` TABLE  (test-account setup)
--
-- WHY THIS EXISTS
--   getCurrentUser() returns "unlinked" when a signed-in auth user has no
--   matching users.auth_id row → the app shows the "Almost there" screen and
--   every logged-in E2E test fails. The auto-link trigger only fires when a
--   users row already matches by email/phone, so a freshly-created test auth
--   user (e.g. e2e-bot) never gets linked. This script creates the row.
--
-- HOW TO RUN
--   1. In Supabase Dashboard → SQL Editor → New query.
--   2. Edit the two values under "CONFIG" below (email + desired role).
--   3. Run. Safe to re-run — it is idempotent (ON CONFLICT do nothing/update).
--
--   This is TEST DATA only. Never run it against production club data.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── CONFIG ───────────────────────────────────────────────────────────────────
-- The auth user to link (the email you used in Authentication → Users → Add user).
-- Must match the TEST_EMAIL in your .env.test.
do $$
declare
  v_email text := 'e2e-bot@rubyankur.test';   -- ← change if your test email differs
  v_role  user_role := 'member';              -- ← 'member' | 'coach' | 'club_owner' | ...
begin
  -- Resolve the auth uid + name from auth.users (so you don't have to copy a uuid).
  -- Fails loudly if the auth user doesn't exist yet.
  if not exists (select 1 from auth.users au where au.email = v_email) then
    raise exception 'Auth user "%" not found. Create it first in Authentication → Users → Add user.', v_email;
  end if;

  -- Insert the users row if missing. The trg_add_to_closure trigger auto-builds
  -- the hierarchy self-link (depth 0). Attach under an existing club_owner so the
  -- account appears in member lists; if no owner exists yet it goes top-level.
  insert into public.users (auth_id, name, email, role, status, parent_id)
  select
    au.id,
    coalesce(nullif(split_part(au.email, '@', 1), ''), 'E2E Test Bot'),
    au.email,
    v_role,
    'active',
    (select u.id from public.users u where u.role = 'club_owner' limit 1)
  from auth.users au
  where au.email = v_email
  on conflict (email) do update
    set auth_id = excluded.auth_id,   -- back-fill the link if the row pre-existed
        status = 'active',
        role   = excluded.role;

  raise notice 'Linked %. Re-run your E2E suite.', v_email;
end $$;

-- ── VERIFY ───────────────────────────────────────────────────────────────────
-- Should return exactly one row with status='active':
--   select u.id, u.email, u.role, u.status, u.auth_id
--   from public.users u
--   join auth.users au on au.id = u.auth_id
--   where au.email = 'e2e-bot@rubyankur.test';
