-- Single-player career persistence.
-- Access is intentionally limited to the server-side Supabase service role:
-- Clerk identities are stored as text and authorization happens in Server Actions.

create table if not exists public.fanta_careers (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  owner_name text not null,
  owner_logo text not null default '',
  status text not null default 'active',
  state jsonb not null default '{}'::jsonb,
  current_season integer not null default 1,
  goat_points integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fanta_careers_user_id_not_blank
    check (btrim(user_id) <> ''),
  constraint fanta_careers_owner_name_not_blank
    check (btrim(owner_name) <> ''),
  constraint fanta_careers_status_valid
    check (status in ('active', 'retired')),
  constraint fanta_careers_state_is_object
    check (jsonb_typeof(state) = 'object'),
  constraint fanta_careers_current_season_valid
    check (current_season >= 1),
  constraint fanta_careers_goat_points_valid
    check (goat_points >= 0),
  constraint fanta_careers_version_valid
    check (version >= 1)
);

create table if not exists public.fanta_career_seasons (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null
    references public.fanta_careers(id) on delete cascade,
  user_id text not null,
  season_no integer not null,
  age integer not null,
  club_name text not null,
  summary jsonb not null default '{}'::jsonb,
  goat_points integer not null default 0,
  created_at timestamptz not null default now(),
  constraint fanta_career_seasons_career_season_unique
    unique (career_id, season_no),
  constraint fanta_career_seasons_user_id_not_blank
    check (btrim(user_id) <> ''),
  constraint fanta_career_seasons_season_no_valid
    check (season_no >= 1),
  constraint fanta_career_seasons_age_valid
    check (age between 14 and 60),
  constraint fanta_career_seasons_club_name_not_blank
    check (btrim(club_name) <> ''),
  constraint fanta_career_seasons_summary_is_object
    check (jsonb_typeof(summary) = 'object'),
  constraint fanta_career_seasons_goat_points_valid
    check (goat_points >= 0)
);

create index if not exists fanta_careers_status_updated_idx
  on public.fanta_careers (status, updated_at desc);

create index if not exists fanta_career_seasons_user_season_idx
  on public.fanta_career_seasons (user_id, season_no desc);

create index if not exists fanta_career_seasons_career_created_idx
  on public.fanta_career_seasons (career_id, created_at desc);

alter table public.fanta_careers enable row level security;
alter table public.fanta_career_seasons enable row level security;

-- There are deliberately no public RLS policies. The browser must never query
-- career state directly; authenticated Clerk requests go through Server Actions.
revoke all privileges on table public.fanta_careers
  from anon, authenticated;
revoke all privileges on table public.fanta_career_seasons
  from anon, authenticated;

grant select, insert, update, delete on table public.fanta_careers
  to service_role;
grant select, insert, update, delete on table public.fanta_career_seasons
  to service_role;

-- A season and its aggregate career state must advance together. Calling this
-- function is one Postgres transaction, so an archive failure also rolls back
-- the state update (and vice versa).
create or replace function public.save_fanta_career_season(
  p_career_id uuid,
  p_user_id text,
  p_expected_version integer,
  p_status text,
  p_state jsonb,
  p_current_season integer,
  p_goat_points integer,
  p_season_no integer,
  p_age integer,
  p_club_name text,
  p_summary jsonb,
  p_season_goat_points integer,
  p_updated_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_rows integer;
begin
  update public.fanta_careers
  set status = p_status,
      state = p_state,
      current_season = p_current_season,
      goat_points = p_goat_points,
      version = p_expected_version + 1,
      updated_at = p_updated_at
  where id = p_career_id
    and user_id = p_user_id
    and version = p_expected_version;

  get diagnostics updated_rows = row_count;
  if updated_rows = 0 then
    return false;
  end if;

  insert into public.fanta_career_seasons (
    career_id,
    user_id,
    season_no,
    age,
    club_name,
    summary,
    goat_points
  ) values (
    p_career_id,
    p_user_id,
    p_season_no,
    p_age,
    p_club_name,
    p_summary,
    p_season_goat_points
  )
  on conflict (career_id, season_no) do update
  set user_id = excluded.user_id,
      age = excluded.age,
      club_name = excluded.club_name,
      summary = excluded.summary,
      goat_points = excluded.goat_points;

  return true;
end;
$$;

revoke all on function public.save_fanta_career_season(
  uuid, text, integer, text, jsonb, integer, integer,
  integer, integer, text, jsonb, integer, timestamptz
) from public, anon, authenticated;

grant execute on function public.save_fanta_career_season(
  uuid, text, integer, text, jsonb, integer, integer,
  integer, integer, text, jsonb, integer, timestamptz
) to service_role;
