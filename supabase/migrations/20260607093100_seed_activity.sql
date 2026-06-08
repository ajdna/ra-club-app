-- ─────────────────────────────────────────────────────────────────────────────
-- Optional demo activity so the Members screens + health filters show variety.
-- Safe to run after the core seed and the attendance/weight migration.
--   Anjali (…0005): due-today task  -> Yellow (Watch)
--   Vikram (…0006): overdue task    -> Red (Action)
--   Meena  (…0008): no pending task -> Green (On track)
-- ─────────────────────────────────────────────────────────────────────────────

-- Extra follow-up tasks (coach Sana …0004 for her two members)
insert into follow_up_tasks (member_id, coach_id, day_number, cycle, activity, due_date, status) values
  ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000004', 3, 1, 'call',       current_date,     'pending'),
  ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000004', 8, 1, 'home_visit', current_date - 2, 'pending');

-- Weight history (latest also reflected in members.current_weight)
insert into weight_logs (member_id, weight, logged_at, logged_by) values
  ('00000000-0000-0000-0000-000000000005', 81.0, now() - interval '21 days', '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000005', 79.8, now() - interval '14 days', '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000005', 78.5, now() - interval '7 days',  '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000006', 93.5, now() - interval '10 days', '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000006', 92.0, now() - interval '3 days',  '00000000-0000-0000-0000-000000000004');

-- Attendance (Anjali present a few recent days)
insert into attendance (member_id, date, present, marked_by) values
  ('00000000-0000-0000-0000-000000000005', current_date - 1, true, '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000005', current_date - 2, true, '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000005', current_date - 3, true, '00000000-0000-0000-0000-000000000004')
on conflict (member_id, date) do nothing;
