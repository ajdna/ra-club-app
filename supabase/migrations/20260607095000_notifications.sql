-- ─────────────────────────────────────────────────────────────────────────────
-- Ruby Ankur Wellness — in-app notifications
-- Each row is addressed to a recipient user (the coach/owner who should act).
-- Generated on-demand by the signed-in user for members in their tree, so the
-- "insert own" RLS policy fits. A future background job (service role) can also
-- insert for other recipients.
-- ─────────────────────────────────────────────────────────────────────────────

create type notification_type as enum
  ('milestone','recharge_due','drop_off','info');

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade, -- recipient
  type       notification_type not null default 'info',
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, created_at desc);
create index notifications_unread_idx on notifications(user_id) where read_at is null;

alter table notifications enable row level security;

create policy notifications_select_own on notifications
  for select using ( user_id = app_user_id() );
create policy notifications_insert_own on notifications
  for insert with check ( user_id = app_user_id() );
create policy notifications_update_own on notifications
  for update using ( user_id = app_user_id() ) with check ( user_id = app_user_id() );
