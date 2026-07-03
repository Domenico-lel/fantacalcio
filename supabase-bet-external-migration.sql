-- FantaCalcio — Migration "Pronostici su partite reali"
-- Estende gli scontri delle giornate di pronostici per supportare partite di
-- competizioni reali (Serie A, Champions, ecc.) prese da football-data.org:
-- oltre a squadra-vs-squadra della lega, l'admin può inserire una partita reale
-- con loghi, competizione, orario e id evento (per l'auto-aggiornamento risultati).
-- Da eseguire nel SQL Editor di Supabase. Idempotente.

alter table fanta_bet_matches add column if not exists home_logo    text;
alter table fanta_bet_matches add column if not exists away_logo    text;
alter table fanta_bet_matches add column if not exists competition  text;
alter table fanta_bet_matches add column if not exists ext_event_id text;   -- id partita football-data.org
alter table fanta_bet_matches add column if not exists kickoff      timestamptz;

create index if not exists idx_fanta_bet_matches_ext on fanta_bet_matches(ext_event_id);
