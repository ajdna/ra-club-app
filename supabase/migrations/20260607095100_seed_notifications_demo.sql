-- ─────────────────────────────────────────────────────────────────────────────
-- Demo conditions so the notification triggers fire for Coach Sana's members:
--   Anjali (…0005): current weight == ideal  -> Milestone (ideal reached)
--   Vikram (…0006): joined 27 days ago, recharge_count 0, no recent activity
--                   -> Recharge due (cycle day 27) + Drop-off (inactive)
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- Anjali hits her ideal weight
update members
  set current_weight = ideal_weight
  where user_id = '00000000-0000-0000-0000-000000000005';

-- Vikram is mid-cycle and has gone quiet
update members
  set join_date = current_date - 27,
      recharge_count = 0
  where user_id = '00000000-0000-0000-0000-000000000006';

delete from attendance   where member_id = '00000000-0000-0000-0000-000000000006';
delete from weight_logs  where member_id = '00000000-0000-0000-0000-000000000006';
