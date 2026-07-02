-- FantaCalcio — Migration "Più allenatori per squadra"
-- Permette a più account (fantaallenatori) di condividere la stessa squadra.
-- Esegui nel SQL Editor di Supabase. Idempotente.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Rimuovi il vincolo "una squadra = un solo manager".
--    Era un indice unique parziale su fanta_profiles(team_ref); va tolto,
--    altrimenti il secondo allenatore non può agganciarsi alla squadra.
-- ─────────────────────────────────────────────────────────────────────────────
drop index if exists fanta_profiles_team_uniq;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Capienza per squadra: quanti allenatori può avere.
--    Default 1 → tutte le squadre restano "singole" come prima.
--    L'admin porta a 2 le squadre condivise dall'app (Gestione → squadra → Posti).
-- ─────────────────────────────────────────────────────────────────────────────
alter table fanta_teams
  add column if not exists max_managers integer not null default 1;

-- Sanity: almeno 1 posto
alter table fanta_teams
  drop constraint if exists fanta_teams_max_managers_chk;
alter table fanta_teams
  add constraint fanta_teams_max_managers_chk check (max_managers >= 1);

-- Utile per contare gli allenatori di una squadra
create index if not exists fanta_profiles_team_ref_idx
  on fanta_profiles (team_ref) where team_ref is not null;
