-- ─────────────────────────────────────────────────────────────────────────────
-- Ruby Ankur Wellness — attendance check-ins + weight history
-- Backs the Member Detail "Mark Present" and "Log Weight" actions.
-- Read/write follow the same closure-table visibility as the rest of the app.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Attendance (daily club check-in) ─────────────────────────────────────────
create table attendance (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(user_id) on delete cascade,
  date       date not null default current_date,
  present    boolean not null default true,
  marked_by  uuid references users(id),
  created_at timestamptz not null default now(),
  unique (member_id, date)
);
create index attendance_member_idx on attendance(member_id);

alter table attendance enable row level security;
create policy attendance_select_downline on attendance
  for select using ( can_see(member_id) );
create policy attendance_insert_downline on attendance
  for insert with check ( can_see(member_id) );
create policy attendance_update_downline on attendance
  for update using ( can_see(member_id) ) with check ( can_see(member_id) );

-- ── Weight log (history; members.current_weight holds the latest) ────────────
create table weight_logs (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(user_id) on delete cascade,
  weight     numeric not null,
  logged_at  timestamptz not null default now(),
  logged_by  uuid references users(id)
);
create index weight_logs_member_idx on weight_logs(member_id, logged_at desc);

alter table weight_logs enable row level security;
create policy weight_logs_select_downline on weight_logs
  for select using ( can_see(member_id) );
create policy weight_logs_insert_downline on weight_logs
  for insert with check ( can_see(member_id) );
