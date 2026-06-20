-- FantaCalcio — Migration "Squadre + Rose + Loghi"
-- Esegui nel SQL Editor di Supabase. Idempotente.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Squadre della lega (nome/id sincronizzati dalla classifica;
--    il logo lo carica l'admin)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists fanta_teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,        -- nome squadra (dalla classifica)
  team_id     text,                        -- id fantacalcio.it, se disponibile
  logo_url    text,                        -- caricato dall'admin
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Rosa per squadra (inserita dall'admin)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists fanta_roster (
  id          uuid primary key default gen_random_uuid(),
  team_ref    uuid not null references fanta_teams(id) on delete cascade,
  player_name text not null,
  role        text check (role in ('P', 'D', 'C', 'A')),
  created_at  timestamptz not null default now()
);

create index if not exists fanta_roster_team_idx on fanta_roster (team_ref);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Collega il manager alla sua squadra (una squadra = un solo manager)
-- ─────────────────────────────────────────────────────────────────────────────
alter table fanta_profiles
  add column if not exists team_ref uuid references fanta_teams(id);

-- i NULL non confliggono: una squadra può essere reclamata da un solo profilo
create unique index if not exists fanta_profiles_team_uniq
  on fanta_profiles (team_ref) where team_ref is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Trigger updated_at su fanta_teams (riusa set_updated_at già esistente)
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists teams_updated_at on fanta_teams;
create trigger teams_updated_at
  before update on fanta_teams
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Row Level Security (il service role bypassa; best practice)
-- ─────────────────────────────────────────────────────────────────────────────
alter table fanta_teams  enable row level security;
alter table fanta_roster enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) Storage: bucket pubblico per i loghi delle squadre
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;
