-- ─────────────────────────────────────────────────────────────────────────────
-- Ruby Ankur Wellness — seed data
-- A small org tree so you can see the closure table + visibility rules working.
-- Insert order matters: parents before children (the closure trigger reads the
-- parent's ancestors). auth_id is left null here; the auth step links real
-- Supabase auth users to these rows.
--
--   Club Owner (1)
--    └─ NCO (2)
--        ├─ JCO (3)
--        │   └─ Coach (4)
--        │       ├─ Member: Anjali (5)
--        │       └─ Member: Vikram (6)
--        └─ Coach B (7)        ← sibling branch (sideline)
--            └─ Member: Meena (8)
--
--   Coach (4) sees {4,5,6} only — NOT Meena (8): sideline isolation.
--   NCO (2) sees the whole subtree. Club Owner sees everything.
-- ─────────────────────────────────────────────────────────────────────────────

insert into users (id, name, phone, role, parent_id, ambassador_tier) values
  ('00000000-0000-0000-0000-000000000001','Ruby Ankur',  '+910000000001','club_owner', null,                                   'emerald'),
  ('00000000-0000-0000-0000-000000000002','Priya (NCO)', '+910000000002','nco',  '00000000-0000-0000-0000-000000000001','gold'),
  ('00000000-0000-0000-0000-000000000003','Rahul (JCO)', '+910000000003','jco',  '00000000-0000-0000-0000-000000000002','silver'),
  ('00000000-0000-0000-0000-000000000004','Sana (Coach)','+910000000004','coach','00000000-0000-0000-0000-000000000003','ambassador'),
  ('00000000-0000-0000-0000-000000000005','Anjali',      '+910000000005','member','00000000-0000-0000-0000-000000000004', null),
  ('00000000-0000-0000-0000-000000000006','Vikram',      '+910000000006','member','00000000-0000-0000-0000-000000000004', null),
  ('00000000-0000-0000-0000-000000000007','Imran (Coach B)','+910000000007','coach','00000000-0000-0000-0000-000000000002','ambassador'),
  ('00000000-0000-0000-0000-000000000008','Meena',       '+910000000008','member','00000000-0000-0000-0000-000000000007', null);

-- Member detail rows (health track)
insert into members (user_id, coach_id, membership_type, stage, current_weight, ideal_weight) values
  ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000004','elite', 2, 78.5, 65),
  ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000004','basic', 1, 92.0, 80),
  ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000007','basic', 1, 70.0, 60);

-- A few follow-up tasks for Anjali (cycle 1) under Coach Sana
insert into follow_up_tasks (member_id, coach_id, day_number, cycle, activity, due_date, status) values
  ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000004', 1, 1, 'home_visit', current_date,            'done'),
  ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000004', 2, 1, 'call',       current_date + 1,        'pending'),
  ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000004', 7, 1, 'reminder',   current_date + 6,        'pending');

-- One DMO entry for Coach Sana (total is auto-computed)
insert into dmo_entries
  (coach_id, entry_date, present_in_club, video_on_interaction, video_on_meet, status_posts, calls_made, new_guests, contact_list, second_shake)
values
  ('00000000-0000-0000-0000-000000000004', current_date, 1, 1, 1, 3, 4, 2, 1, 1);

-- ── Rules Engine config (the configurable parameters) ────────────────────────
insert into rule_config (key, value, updated_by) values
  ('pricing',
    '{"basic":8400,"elite":12070,"currency":"INR","max_payments":2,"upgrade_window_days":10}'::jsonb,
    '00000000-0000-0000-0000-000000000001'),
  ('dmo_weights',
    '{"present_in_club":1,"video_on_interaction":1,"video_on_meet":1,"status_posts_max":5,"calls_max":5,"new_guests":"unlimited","contact_list":1,"second_shake":1}'::jsonb,
    '00000000-0000-0000-0000-000000000001'),
  ('ambassador_tiers',
    '{"ambassador":[2,4],"silver":[5,6],"gold":[7,9],"platinum":[10,19],"elite_platinum":[20,29],"ruby":[30,39],"topaz":[40,49],"emerald":[50,null]}'::jsonb,
    '00000000-0000-0000-0000-000000000001'),
  ('followup_cadence',
    '{"cycles":3,"cycle_days":30,"home_visit_days":[1,8,15,25],"reminder_days":[7,14,24]}'::jsonb,
    '00000000-0000-0000-0000-000000000001'),
  ('notifications',
    '{"drop_off_inactive_days":5,"renewal_nudge_days":[20,25,28,30],"templates":{"milestone":"Shabaash {name}! {milestone} 🎉","recharge_due":"{name}, recharge {days} din mein due hai — let''s keep the momentum!","drop_off":"{name} ko {days} din se miss kar rahe hain. Ek warm check-in karein?"}}'::jsonb,
    '00000000-0000-0000-0000-000000000001'),
  ('ui_labels',
    '{"home_title":"Aaj ka Plan","members_title":"Mere Members","alerts_title":"Alerts & Updates"}'::jsonb,
    '00000000-0000-0000-0000-000000000001');
