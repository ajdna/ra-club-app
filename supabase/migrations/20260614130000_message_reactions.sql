-- Message reactions (emoji responses to chat messages)
create table if not exists message_reactions (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references chat_messages(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

alter table message_reactions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'message_reactions' and policyname = 'reactions_read'
  ) then
    execute 'create policy reactions_read on message_reactions for select using (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'message_reactions' and policyname = 'reactions_write'
  ) then
    execute 'create policy reactions_write on message_reactions
      for all using ( user_id = app_user_id() )
      with check ( user_id = app_user_id() )';
  end if;
end $$;
