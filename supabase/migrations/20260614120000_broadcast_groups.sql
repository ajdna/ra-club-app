-- ── Broadcast Groups (saved named lists for targeted broadcasts) ─────────────
-- filter_type: 'all' | 'by_role' | 'by_stage' | 'low_attendance'
-- filter_value: role string / stage number / null

create table if not exists broadcast_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references users(id) on delete cascade,
  filter_type text not null default 'all',
  filter_value text,
  created_at  timestamptz not null default now()
);

-- RLS: only the creator can see and manage their groups
alter table broadcast_groups enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'broadcast_groups' and policyname = 'broadcast_groups_own'
  ) then
    execute 'create policy broadcast_groups_own on broadcast_groups
      using ( created_by = app_user_id() )
      with check ( created_by = app_user_id() )';
  end if;
end $$;
