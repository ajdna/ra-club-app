-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-link Supabase auth users to existing `users` rows on first login.
--
-- When a team member signs in (or confirms their email / phone), the trigger
-- finds the matching `users` row by email OR phone and writes their auth.uid()
-- into users.auth_id — so getCurrentUser() returns their profile instead of
-- the "unlinked account" error.
--
-- IMPORTANT: Run this in Supabase SQL Editor (not supabase db push) because
-- it creates a trigger on the Supabase-managed `auth.users` table, which
-- requires superuser access only available in the SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Match by email first, then phone. Only link if auth_id is still null
  -- (prevents overwriting an existing link). Matches at most one row.
  update public.users
  set
    auth_id = new.id,
    -- Back-fill email onto the users row if it was missing (coaches are
    -- often added by name+phone only; this keeps the row current).
    email = coalesce(email, new.email)
  where id = (
    select id from public.users
    where auth_id is null
      and (
        (new.email is not null and email = new.email)
        or
        (new.phone is not null and phone = new.phone)
      )
    limit 1
  );

  return new;
end;
$$;

-- Fires on INSERT (new sign-up) and on UPDATE (email/phone confirmed).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_auth_user();
