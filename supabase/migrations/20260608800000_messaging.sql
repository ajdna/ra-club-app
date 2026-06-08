-- ─────────────────────────────────────────────────────────────────────────────
-- In-app Messaging + Home Visit Scheduling
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. chat_threads ──────────────────────────────────────────────────────────
-- type = 'direct'    → 1:1 between coach and one member
-- type = 'broadcast' → coach → all their members (member_id is null)
create table if not exists chat_threads (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('direct','broadcast')),
  coach_id   uuid not null references users(id) on delete cascade,
  member_id  uuid references users(id) on delete cascade, -- null for broadcast
  subject    text,                                         -- broadcast title
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_threads_coach_idx  on chat_threads(coach_id);
create index if not exists chat_threads_member_idx on chat_threads(member_id);

-- unique constraint so we never duplicate a direct thread
create unique index if not exists chat_threads_direct_uniq
  on chat_threads(coach_id, member_id)
  where type = 'direct';

-- ── 2. chat_messages ─────────────────────────────────────────────────────────
create table if not exists chat_messages (
  id        uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  body      text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_thread_idx on chat_messages(thread_id, created_at);

-- Auto-bump thread.updated_at on new message
create or replace function bump_thread_updated()
returns trigger language plpgsql as $$
begin
  update chat_threads set updated_at = now() where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists chat_messages_bump_thread on chat_messages;
create trigger chat_messages_bump_thread
  after insert on chat_messages
  for each row execute function bump_thread_updated();

-- ── 3. chat_reads ────────────────────────────────────────────────────────────
-- Tracks the last time each user read a thread (for unread counts)
create table if not exists chat_reads (
  thread_id    uuid not null references chat_threads(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

-- ── 4. Home visit scheduling columns on follow_up_tasks ─────────────────────
alter table follow_up_tasks
  add column if not exists scheduled_at  timestamptz,
  add column if not exists meeting_link  text,
  add column if not exists notes         text;

-- ── 5. RLS ───────────────────────────────────────────────────────────────────
alter table chat_threads  enable row level security;
alter table chat_messages enable row level security;
alter table chat_reads    enable row level security;

-- Helper: can the current user see this thread?
create or replace function can_see_thread(p_thread_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from chat_threads ct
    where ct.id = p_thread_id
      and (
        ct.coach_id  = app_user_id()
        or ct.member_id = app_user_id()
        or (
          ct.type = 'broadcast'
          and exists (
            select 1 from members
            where user_id  = app_user_id()
              and coach_id = ct.coach_id
          )
        )
      )
  )
$$;

-- chat_threads
create policy chat_threads_select on chat_threads for select using (
  coach_id  = app_user_id()
  or member_id = app_user_id()
  or (type = 'broadcast' and exists (
      select 1 from members
      where user_id = app_user_id() and coach_id = chat_threads.coach_id
  ))
);

create policy chat_threads_insert on chat_threads for insert with check (
  coach_id = app_user_id()
);

-- chat_messages
create policy chat_messages_select on chat_messages for select using (
  can_see_thread(thread_id)
);

create policy chat_messages_insert on chat_messages for insert with check (
  can_see_thread(thread_id)
  and sender_id = app_user_id()
);

-- chat_reads
create policy chat_reads_select on chat_reads for select using (user_id = app_user_id());
create policy chat_reads_upsert on chat_reads for insert with check (user_id = app_user_id());
create policy chat_reads_update on chat_reads for update using (user_id = app_user_id());

-- ── 6. unread_message_count() RPC ───────────────────────────────────────────
create or replace function unread_message_count()
returns bigint language sql security definer stable as $$
  select count(distinct cm.thread_id)
  from chat_messages cm
  join chat_threads ct on ct.id = cm.thread_id
  left join chat_reads cr
         on cr.thread_id = cm.thread_id and cr.user_id = app_user_id()
  where (
    ct.coach_id  = app_user_id()
    or ct.member_id = app_user_id()
    or (ct.type = 'broadcast' and exists (
        select 1 from members
        where user_id = app_user_id() and coach_id = ct.coach_id
    ))
  )
  and cm.sender_id <> app_user_id()
  and (cr.last_read_at is null or cm.created_at > cr.last_read_at)
$$;

grant execute on function unread_message_count() to authenticated;
grant execute on function can_see_thread(uuid) to authenticated;
