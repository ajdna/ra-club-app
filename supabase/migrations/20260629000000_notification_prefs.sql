-- Per-user notification preferences: on/off per type, plus a custom send_time
-- for the scheduled digests. Absence of a row = defaults (enabled). The
-- dispatcher (service client) reads all rows + updates last_sent_on; users
-- manage only their own rows via RLS.
create table if not exists notification_prefs (
  user_id      uuid not null references users(id) on delete cascade,
  type         text not null,
  enabled      boolean not null default true,
  send_time    time null,
  last_sent_on date null,
  updated_at   timestamptz not null default now(),
  primary key (user_id, type)
);

alter table notification_prefs enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='notification_prefs' and policyname='notif_prefs_select') then
    execute 'create policy notif_prefs_select on notification_prefs for select using (user_id = app_user_id())';
  end if;
  if not exists (select 1 from pg_policies where tablename='notification_prefs' and policyname='notif_prefs_write') then
    execute 'create policy notif_prefs_write on notification_prefs for all using (user_id = app_user_id()) with check (user_id = app_user_id())';
  end if;
end $$;
