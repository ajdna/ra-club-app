-- ─────────────────────────────────────────────────────────────────────────────
-- WhatsApp-parity features:
--   1. DELETE policy on chat_messages (delete own message)
--   2. pinned_message_id on chat_threads
--   3. last_seen_at on users
--   4. Group chat: relax type check + chat_group_members table
--   5. Update can_see_thread() and RLS for group threads
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Allow users to delete their own messages
create policy chat_messages_delete on chat_messages
  for delete using (sender_id = app_user_id());

-- 2. Pinned message per thread
alter table chat_threads
  add column if not exists pinned_message_id uuid
    references chat_messages(id) on delete set null;

-- Policy: thread participants can update pin
create policy chat_threads_update on chat_threads
  for update using (
    coach_id = app_user_id()
    or member_id = app_user_id()
  );

-- 3. Last seen timestamp
alter table users
  add column if not exists last_seen_at timestamptz;

-- Allow users to update their own last_seen_at
create policy users_update_own on users
  for update using (id = app_user_id())
  with check (id = app_user_id());

-- 4a. Relax the type check to include 'group'
alter table chat_threads
  drop constraint if exists chat_threads_type_check;
alter table chat_threads
  add constraint chat_threads_type_check
    check (type in ('direct', 'broadcast', 'group'));

-- 4b. Group members table (many-to-many for group threads)
create table if not exists chat_group_members (
  thread_id uuid not null references chat_threads(id) on delete cascade,
  user_id   uuid not null references users(id)        on delete cascade,
  added_by  uuid          references users(id),
  joined_at timestamptz   not null default now(),
  primary key (thread_id, user_id)
);

alter table chat_group_members enable row level security;

create policy cgm_select on chat_group_members
  for select using (
    user_id = app_user_id()
    or added_by = app_user_id()
    or exists (
      select 1 from chat_threads ct
      where ct.id = thread_id and ct.coach_id = app_user_id()
    )
  );

create policy cgm_insert on chat_group_members
  for insert with check (added_by = app_user_id());

create policy cgm_delete on chat_group_members
  for delete using (
    user_id = app_user_id()
    or added_by = app_user_id()
    or exists (
      select 1 from chat_threads ct
      where ct.id = thread_id and ct.coach_id = app_user_id()
    )
  );

-- 5. Update can_see_thread() to include group threads
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
        or (
          ct.type = 'group'
          and exists (
            select 1 from chat_group_members cgm
            where cgm.thread_id = ct.id
              and cgm.user_id   = app_user_id()
          )
        )
      )
  )
$$;

-- Update thread SELECT policy to include group threads
drop policy if exists chat_threads_select on chat_threads;
create policy chat_threads_select on chat_threads for select using (
  coach_id  = app_user_id()
  or member_id = app_user_id()
  or (type = 'broadcast' and exists (
      select 1 from members
      where user_id = app_user_id() and coach_id = chat_threads.coach_id
  ))
  or (type = 'group' and exists (
      select 1 from chat_group_members cgm
      where cgm.thread_id = chat_threads.id and cgm.user_id = app_user_id()
  ))
);

-- Allow thread owner to update (needed for pin)
-- (already created above, adding group creator too)
drop policy if exists chat_threads_update on chat_threads;
create policy chat_threads_update on chat_threads
  for update using (can_see_thread(id));
