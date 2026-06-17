-- FantaCalcio — Supabase Migration
-- Esegui questo script nell'SQL Editor di Supabase Dashboard

-- Profilo utente (dati inseriti durante l'onboarding)
create table if not exists fanta_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     text unique not null,   -- Clerk user ID (o "demo-user")
  first_name  text not null,
  last_name   text not null,
  team_name   text not null,
  logo        text not null default '⚽',
  budget      integer not null default 500,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Rosa e formazione
create table if not exists fanta_squads (
  id              uuid primary key default gen_random_uuid(),
  user_id         text unique not null references fanta_profiles(user_id) on delete cascade,
  formation       text not null default '4-3-3',
  starters        integer[] not null default '{}',
  captain_id      integer,
  vice_captain_id integer,
  roster_ids      integer[] not null default '{}',
  updated_at      timestamptz not null default now()
);

-- Aggiorna updated_at automaticamente
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on fanta_profiles
  for each row execute function set_updated_at();

create trigger squads_updated_at
  before update on fanta_squads
  for each row execute function set_updated_at();

-- Row Level Security (opzionale ma raccomandato)
-- Se usi il service role key sul server, RLS non blocca le query.
-- Abilitalo comunque come best practice.
alter table fanta_profiles enable row level security;
alter table fanta_squads    enable row level security;

-- Policy: il service role bypassa RLS automaticamente
-- Se in futuro aggiungi auth Supabase nativa, aggiungi qui le policy.
