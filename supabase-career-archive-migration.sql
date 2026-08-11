-- Multi-career archive.
-- Keeps the complete JSON state (including national rankings and career arcs)
-- and every fanta_career_seasons row when a player starts again.

begin;

-- The original schema allowed exactly one row for each Clerk user. Multiple
-- completed careers are now allowed, while a partial index keeps at most one
-- active career per user.
alter table public.fanta_careers
  drop constraint if exists fanta_careers_user_id_key;

alter table public.fanta_careers
  drop constraint if exists fanta_careers_status_valid;

alter table public.fanta_careers
  add constraint fanta_careers_status_valid
  check (status in ('active', 'retired', 'archived'));

create unique index if not exists fanta_careers_one_active_per_user_idx
  on public.fanta_careers (user_id)
  where status = 'active';

create index if not exists fanta_careers_user_status_updated_idx
  on public.fanta_careers (user_id, status, updated_at desc);

-- Career data remains server-only. Clerk authorization is checked by Server
-- Actions before the service-role client reaches these tables.
alter table public.fanta_careers enable row level security;
alter table public.fanta_career_seasons enable row level security;

revoke all privileges on table public.fanta_careers
  from anon, authenticated;
revoke all privileges on table public.fanta_career_seasons
  from anon, authenticated;

grant select, insert, update, delete on table public.fanta_careers
  to service_role;
grant select, insert, update, delete on table public.fanta_career_seasons
  to service_role;

commit;
