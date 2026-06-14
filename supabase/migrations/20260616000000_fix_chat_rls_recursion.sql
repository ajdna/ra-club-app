-- Fix infinite recursion in chat RLS policies (idempotent).
-- cgm_select must NOT reference chat_threads:
--   chat_threads_select -> chat_group_members -> cgm_select -> chat_threads = recursion.
-- chat_threads_update must NOT use can_see_thread() (which itself queries chat_threads).
-- This was already applied manually to production on 2026-06-14; safe to re-run.

drop policy if exists cgm_select on chat_group_members;
create policy cgm_select on chat_group_members
  for select using (
    user_id = app_user_id()
    or added_by = app_user_id()
  );

drop policy if exists chat_threads_update on chat_threads;
create policy chat_threads_update on chat_threads
  for update using (
    coach_id = app_user_id()
    or member_id = app_user_id()
    or (type = 'group' and exists (
      select 1 from chat_group_members cgm
      where cgm.thread_id = chat_threads.id and cgm.user_id = app_user_id()
    ))
  );
