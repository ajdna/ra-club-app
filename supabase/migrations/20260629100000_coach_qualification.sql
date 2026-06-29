-- Coach qualification levels (2D). One level per coach, chosen from an
-- owner-editable list stored in rule_config.qualification_levels. Groups are
-- derived (qualification ∩ viewer's downline via hierarchy_closure), not stored.
alter table users add column if not exists qualification text;

insert into rule_config (key, value)
values ('qualification_levels',
  '["WCO","Qualified coach","Supervisor","Active Supervisor","JCO","NCO"]'::jsonb)
on conflict (key) do nothing;
