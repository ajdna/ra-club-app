-- Daily club session details (Zoom link changes every day). Keyed by date+period
-- so the owner can set morning the evening before, evening same day. The club
-- reminder notification deep-links to an in-app /club/<period> page that shows
-- these details + a Join button. RLS: any signed-in user reads; leaders write.
create table if not exists club_sessions (
  session_date date not null,
  period       text not null check (period in ('morning','evening')),
  details      text,
  link         text,
  updated_by   uuid references users(id),
  updated_at   timestamptz not null default now(),
  primary key (session_date, period)
);

alter table club_sessions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='club_sessions' and policyname='club_sessions_read') then
    execute 'create policy club_sessions_read on club_sessions for select using (auth.uid() is not null)';
  end if;
  if not exists (select 1 from pg_policies where tablename='club_sessions' and policyname='club_sessions_write') then
    execute 'create policy club_sessions_write on club_sessions for all using (app_user_role() in (''club_owner'',''nco'',''jco'',''supervisor'')) with check (app_user_role() in (''club_owner'',''nco'',''jco'',''supervisor''))';
  end if;
end $$;
