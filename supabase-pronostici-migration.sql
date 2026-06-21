-- FantaCalcio — Migration "Pronostici & crediti"
-- Sistema di scommesse interne alla lega: l'admin crea le giornate e gli
-- scontri (squadra vs squadra) con quote fisse 1/X/2; i manager puntano i
-- propri crediti. Vincita = puntata × quota (quota congelata alla giocata).
-- Bonus partecipazione alla giornata: +10 se vinci, +4 se pareggi, 0 se perdi.
-- Da eseguire nel SQL Editor di Supabase. Idempotente.

-- Saldo crediti per manager (parte da 500)
create table if not exists fanta_credits (
  user_id    text primary key,
  balance    integer not null default 500,
  updated_at timestamptz not null default now()
);

-- Giornate di pronostici
create table if not exists fanta_bet_rounds (
  id         uuid primary key default gen_random_uuid(),
  day        integer not null,
  title      text,
  status     text not null default 'open',   -- 'open' | 'closed' | 'settled'
  created_at timestamptz not null default now()
);

-- Scontri della giornata
create table if not exists fanta_bet_matches (
  id         uuid primary key default gen_random_uuid(),
  round_id   uuid not null references fanta_bet_rounds(id) on delete cascade,
  home_team  uuid references fanta_teams(id) on delete set null,
  away_team  uuid references fanta_teams(id) on delete set null,
  home_name  text not null,
  away_name  text not null,
  odd_1      numeric not null default 2,
  odd_x      numeric not null default 3,
  odd_2      numeric not null default 2,
  result     text,                            -- '1' | 'X' | '2' | null
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

-- Scommesse (una per scontro per utente)
create table if not exists fanta_bets (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references fanta_bet_matches(id) on delete cascade,
  user_id    text not null,
  pick       text not null,                   -- '1' | 'X' | '2'
  stake      integer not null,
  odd        numeric not null,                -- quota congelata
  status     text not null default 'pending', -- 'pending' | 'won' | 'lost'
  payout     integer not null default 0,
  created_at timestamptz not null default now(),
  unique (match_id, user_id)
);

create index if not exists idx_fanta_bets_match on fanta_bets(match_id);
create index if not exists idx_fanta_bet_matches_round on fanta_bet_matches(round_id);
