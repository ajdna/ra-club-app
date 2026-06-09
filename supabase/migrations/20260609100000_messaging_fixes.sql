-- ─────────────────────────────────────────────────────────────────────────────
-- Messaging fixes
--
-- Fix 1: users RLS — members couldn't read their coach's name in chat
--        because can_see() only checks downline (descendants).
--        Add a policy so users can also read their upline (ancestors).
--
-- Fix 2: chat_messages REPLICA IDENTITY FULL — required for Supabase Realtime
--        postgres_changes with a filter clause (thread_id=eq.xxx).
--        Without FULL, the WAL doesn't carry old column values and Supabase
--        silently drops filtered events, so the chat never auto-refreshes.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Fix 1: allow reading upline (ancestors) and yourself ─────────────────────
-- The existing users_select_downline policy already allows reading descendants.
-- Postgres ORs multiple SELECT policies, so adding this gives full visibility
-- for anyone in the same hierarchy chain (both directions).

create policy users_select_self on users
  for select using (
    id = app_user_id()
  );

create policy users_select_upline on users
  for select using (
    exists (
      select 1 from hierarchy_closure hc
      where hc.descendant_id = app_user_id()
        and hc.ancestor_id   = users.id
        and hc.depth > 0
    )
  );

-- ── Fix 2: full replica identity for realtime filtered subscriptions ──────────
-- Required for postgres_changes with filter: thread_id=eq.<uuid>
-- Without this, events arrive at the server but are dropped before the client
-- because Supabase can't evaluate the filter without the full row image.

alter table chat_messages replica identity full;
