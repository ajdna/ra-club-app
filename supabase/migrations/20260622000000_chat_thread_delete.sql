-- Thread delete policy.
-- The initiator (coach_id) can delete their own thread; a club_owner can delete
-- any thread whose initiator is within their downline (their team) via can_see().
-- FK cascade on chat_messages / chat_reads / chat_group_members / message_reactions
-- removes it from every participant's inbox.
drop policy if exists chat_threads_delete on chat_threads;
create policy chat_threads_delete on chat_threads
  for delete using (
    coach_id = app_user_id()
    or (app_user_role() = 'club_owner' and can_see(coach_id))
  );
