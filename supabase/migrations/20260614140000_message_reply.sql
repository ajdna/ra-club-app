-- Add reply_to_message_id to chat_messages for quote/reply feature
alter table chat_messages
  add column if not exists reply_to_message_id uuid references chat_messages(id) on delete set null;

create index if not exists chat_messages_reply_to_idx on chat_messages(reply_to_message_id);
