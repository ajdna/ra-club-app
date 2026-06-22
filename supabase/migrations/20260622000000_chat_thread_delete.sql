-- Initiator-only thread delete.
-- Lets the thread creator (coach_id) delete a broadcast/direct/group thread
-- completely. FK cascade on chat_messages, chat_reads, chat_group_members and
-- message_reactions removes it from every participant's inbox.
drop policy if exists chat_threads_delete on chat_threads;
create policy chat_threads_delete on chat_threads
  for delete using (coach_id = app_user_id());
