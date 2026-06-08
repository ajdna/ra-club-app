-- ─────────────────────────────────────────────────────────────────────────────
-- Messaging: open hierarchy-aware communication
--
-- Rules:
--   club_owner → anyone in the org
--   nco        → all descendants + upline (club_owner)
--   jco        → all descendants + upline chain
--   coach      → their members + upline chain
--   member     → direct coach only
--
-- Broadcasts are visible to all hierarchy descendants of the sender.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Fix the unique index to be order-independent ──────────────────────────
-- Two users A + B should only have ONE thread regardless of who created it.
-- We enforce this by always storing least(uuid) in coach_id at insert time
-- (the app does this) and keeping the unique constraint canonical.

drop index if exists chat_threads_direct_uniq;

create unique index chat_threads_direct_uniq
  on chat_threads (
    least(coach_id::text,   member_id::text),
    greatest(coach_id::text, member_id::text)
  )
  where type = 'direct' and member_id is not null;

-- ── 2. Thread INSERT: either participant can create the thread ────────────────
drop policy if exists chat_threads_insert on chat_threads;

create policy chat_threads_insert on chat_threads for insert with check (
  coach_id = app_user_id() or member_id = app_user_id()
);

-- ── 3. Thread SELECT: hierarchy-aware broadcasts ─────────────────────────────
drop policy if exists chat_threads_select on chat_threads;

create policy chat_threads_select on chat_threads for select using (
  coach_id  = app_user_id()
  or member_id = app_user_id()
  or (
    type = 'broadcast'
    and exists (
      select 1 from hierarchy_closure hc
      where hc.ancestor_id   = chat_threads.coach_id
        and hc.descendant_id = app_user_id()
        and hc.depth > 0
    )
  )
);

-- ── 4. can_see_thread(): same hierarchy logic ─────────────────────────────────
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
            select 1 from hierarchy_closure hc
            where hc.ancestor_id   = ct.coach_id
              and hc.descendant_id = app_user_id()
              and hc.depth > 0
          )
        )
      )
  )
$$;

-- ── 5. unread_message_count(): same hierarchy logic ───────────────────────────
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
    or (
      ct.type = 'broadcast'
      and exists (
        select 1 from hierarchy_closure hc
        where hc.ancestor_id   = ct.coach_id
          and hc.descendant_id = app_user_id()
          and hc.depth > 0
      )
    )
  )
  and cm.sender_id <> app_user_id()
  and (cr.last_read_at is null or cm.created_at > cr.last_read_at)
$$;

grant execute on function can_see_thread(uuid)       to authenticated;
grant execute on function unread_message_count()     to authenticated;
