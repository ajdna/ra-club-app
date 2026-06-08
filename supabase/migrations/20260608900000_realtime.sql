-- Enable Supabase Realtime for chat_messages so the client can subscribe
-- to INSERT events and receive new messages instantly without polling.
-- RLS still applies to realtime -- users only receive rows they can read.

alter publication supabase_realtime add table chat_messages;
