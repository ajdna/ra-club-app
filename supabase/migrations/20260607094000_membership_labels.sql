-- ─────────────────────────────────────────────────────────────────────────────
-- Default display names for membership tiers (editable in Admin Console →
-- Membership names). Underlying enum keys stay basic/elite/privilege.
-- ─────────────────────────────────────────────────────────────────────────────

insert into rule_config (key, value, updated_by) values
  ('membership_labels',
   '{"basic":"Basic","elite":"Elite","privilege":"Privilege"}'::jsonb,
   '00000000-0000-0000-0000-000000000001')
on conflict (key) do nothing;
