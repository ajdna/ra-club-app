-- ─────────────────────────────────────────────────────────────────────────────
-- Ruby Ankur Wellness — Row Level Security
-- Read access defers to the closure table (downline visible, sideline isolated,
-- own data visible). Writes are deliberately conservative for the scaffold and
-- get tightened during the auth step. The service_role key (and SQL Editor)
-- bypasses RLS, so seeding still works.
-- ─────────────────────────────────────────────────────────────────────────────

alter table users            enable row level security;
alter table hierarchy_closure enable row level security;
alter table members          enable row level security;
alter table follow_up_tasks  enable row level security;
alter table dmo_entries      enable row level security;
alter table rule_config      enable row level security;

-- ── USERS ────────────────────────────────────────────────────────────────────
-- See any user in your subtree (self included, via the (self,self,0) row).
create policy users_select_downline on users
  for select using ( can_see(id) );

-- Add a new node under someone you can already see (enables "Add Member").
create policy users_insert_downline on users
  for insert with check ( parent_id is not null and can_see(parent_id) );

-- Update users within your subtree (e.g. edit a member's profile).
create policy users_update_downline on users
  for update using ( can_see(id) ) with check ( can_see(id) );

-- ── HIERARCHY_CLOSURE ────────────────────────────────────────────────────────
-- You may read closure rows about your own subtree.
create policy closure_select_downline on hierarchy_closure
  for select using ( ancestor_id = app_user_id() );

-- ── MEMBERS ──────────────────────────────────────────────────────────────────
create policy members_select_downline on members
  for select using ( can_see(user_id) );

-- A coach (or upline) may upsert members within their downline.
create policy members_write_downline on members
  for insert with check ( can_see(user_id) or can_see(coach_id) );
create policy members_update_downline on members
  for update using ( can_see(user_id) ) with check ( can_see(user_id) );

-- ── FOLLOW_UP_TASKS ──────────────────────────────────────────────────────────
create policy followup_select_downline on follow_up_tasks
  for select using ( can_see(member_id) );
create policy followup_write_downline on follow_up_tasks
  for insert with check ( can_see(member_id) );
create policy followup_update_downline on follow_up_tasks
  for update using ( can_see(member_id) ) with check ( can_see(member_id) );

-- ── DMO_ENTRIES ──────────────────────────────────────────────────────────────
-- Visible up the tree (upline observes); writable only by the coach themselves.
create policy dmo_select_downline on dmo_entries
  for select using ( can_see(coach_id) );
create policy dmo_write_self on dmo_entries
  for insert with check ( coach_id = app_user_id() );
create policy dmo_update_self on dmo_entries
  for update using ( coach_id = app_user_id() ) with check ( coach_id = app_user_id() );

-- ── RULE_CONFIG ──────────────────────────────────────────────────────────────
-- Everyone signed in can read config (pricing, labels, etc. are needed app-wide).
create policy ruleconfig_select_all on rule_config
  for select using ( auth.uid() is not null );
-- Only the Club Owner can change config (the Admin Console).
create policy ruleconfig_write_owner on rule_config
  for all
  using ( app_user_role() = 'club_owner' )
  with check ( app_user_role() = 'club_owner' );
