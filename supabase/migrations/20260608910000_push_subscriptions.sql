-- Push notification subscriptions
-- Each row = one browser/device that has granted notification permission.
-- A single user can have multiple rows (phone + laptop, etc.)

create table push_subscriptions (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid not null references users(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz default now(),
  unique (user_id, endpoint)
);

alter table push_subscriptions enable row level security;

-- Users can only read/write their own subscriptions
create policy "own subscriptions" on push_subscriptions
  for all
  using  (user_id = (select id from users where auth_id = auth.uid()))
  with check (user_id = (select id from users where auth_id = auth.uid()));
