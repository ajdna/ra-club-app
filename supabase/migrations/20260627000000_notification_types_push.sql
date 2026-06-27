-- New notification_type values for the cross-platform push triggers:
-- approval requests, new downline members, and (for completeness) message /
-- broadcast feed rows. ADD VALUE IF NOT EXISTS is idempotent.
alter type notification_type add value if not exists 'message_received';
alter type notification_type add value if not exists 'broadcast_received';
alter type notification_type add value if not exists 'approval_request';
alter type notification_type add value if not exists 'new_downline_member';
