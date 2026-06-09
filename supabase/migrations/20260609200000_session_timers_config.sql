-- Seed default session / chat timer configuration into rule_config.
-- The Admin Console reads this key via the rules-engine registry.

insert into rule_config (key, value) values (
  'session_timers',
  '{
    "inactivity_logout_minutes": 90,
    "chat_auto_clear_hours": 3,
    "inactivity_warn_minutes": 2
  }'::jsonb
)
on conflict (key) do nothing;
