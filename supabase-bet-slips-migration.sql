-- FantaCalcio — schedine multiple e chiusura automatica
-- Una schedina per manager e giornata, con una selezione per ogni incontro.
-- La puntata viene scalata una sola volta e la schedina paga 2x soltanto se
-- tutti i pronostici sono corretti. Idempotente.

alter table public.fanta_bet_rounds
  add column if not exists closes_at timestamptz;

create table if not exists public.fanta_bet_slips (
  id         uuid primary key default gen_random_uuid(),
  round_id   uuid not null references public.fanta_bet_rounds(id) on delete cascade,
  user_id    text not null,
  stake      integer not null check (stake > 0),
  status     text not null default 'pending' check (status in ('pending', 'won', 'lost')),
  payout     integer not null default 0 check (payout >= 0),
  created_at timestamptz not null default now(),
  unique (round_id, user_id)
);

create table if not exists public.fanta_bet_slip_picks (
  id         uuid primary key default gen_random_uuid(),
  slip_id    uuid not null references public.fanta_bet_slips(id) on delete cascade,
  match_id   uuid not null references public.fanta_bet_matches(id) on delete cascade,
  pick       text not null check (pick in ('1', 'X', '2')),
  created_at timestamptz not null default now(),
  unique (slip_id, match_id)
);

create index if not exists idx_fanta_bet_slips_round on public.fanta_bet_slips(round_id);
create index if not exists idx_fanta_bet_slip_picks_match on public.fanta_bet_slip_picks(match_id);

alter table public.fanta_bet_slips enable row level security;
alter table public.fanta_bet_slip_picks enable row level security;
revoke all on table public.fanta_bet_slips from anon, authenticated;
revoke all on table public.fanta_bet_slip_picks from anon, authenticated;
grant all on table public.fanta_bet_slips to service_role;
grant all on table public.fanta_bet_slip_picks to service_role;

-- Per le giornate reali già presenti, la chiusura è 15 minuti prima del primo calcio d'inizio.
update public.fanta_bet_rounds r
set closes_at = source.closes_at
from (
  select round_id, min(kickoff) - interval '15 minutes' as closes_at
  from public.fanta_bet_matches
  where kickoff is not null
  group by round_id
) source
where r.id = source.round_id
  and r.closes_at is null;

-- Le giornate Fantacalcio seguono la prima partita di Serie A della stessa giornata.
update public.fanta_bet_rounds fantasy
set closes_at = source.closes_at
from (
  select r.day, min(m.kickoff) - interval '15 minutes' as closes_at
  from public.fanta_bet_rounds r
  join public.fanta_bet_matches m on m.round_id = r.id
  where m.kickoff is not null
  group by r.day
) source
where fantasy.day = source.day
  and fantasy.closes_at is null;

-- Inserisce schedina, selezioni e addebito crediti in un'unica transazione.
create or replace function public.place_fanta_bet_slip(
  p_round_id uuid,
  p_user_id text,
  p_account_key text,
  p_stake integer,
  p_picks jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_round public.fanta_bet_rounds%rowtype;
  v_match_count integer;
  v_valid_pick_count integer;
  v_balance integer;
  v_slip_id uuid;
begin
  if coalesce(trim(p_user_id), '') = '' or coalesce(trim(p_account_key), '') = '' then
    raise exception 'Utente non valido';
  end if;
  if p_stake is null or p_stake <= 0 then
    raise exception 'Puntata non valida';
  end if;
  if jsonb_typeof(p_picks) <> 'array' then
    raise exception 'Selezioni non valide';
  end if;

  select * into v_round
  from public.fanta_bet_rounds
  where id = p_round_id
  for update;

  if not found then raise exception 'Giornata non trovata'; end if;
  if v_round.status <> 'open' then raise exception 'Schedine chiuse per questa giornata'; end if;
  if v_round.closes_at is null then raise exception 'Scadenza della schedina non disponibile'; end if;
  if now() >= v_round.closes_at then raise exception 'Tempo scaduto: schedine chiuse'; end if;

  select count(*) into v_match_count
  from public.fanta_bet_matches
  where round_id = p_round_id;
  if v_match_count = 0 or jsonb_array_length(p_picks) <> v_match_count then
    raise exception 'Completa tutti i pronostici della schedina';
  end if;

  select count(*) into v_valid_pick_count
  from (
    select distinct x.match_id
    from jsonb_to_recordset(p_picks) as x(match_id uuid, pick text)
    join public.fanta_bet_matches m on m.id = x.match_id and m.round_id = p_round_id
    where x.pick in ('1', 'X', '2')
  ) valid_picks;
  if v_valid_pick_count <> v_match_count then
    raise exception 'La schedina contiene selezioni mancanti o non valide';
  end if;

  insert into public.fanta_credits (user_id, balance)
  values (p_account_key, 500)
  on conflict (user_id) do nothing;

  select balance into v_balance
  from public.fanta_credits
  where user_id = p_account_key
  for update;
  if v_balance < p_stake then raise exception 'Crediti insufficienti'; end if;

  insert into public.fanta_bet_slips (round_id, user_id, stake)
  values (p_round_id, p_user_id, p_stake)
  returning id into v_slip_id;

  insert into public.fanta_bet_slip_picks (slip_id, match_id, pick)
  select v_slip_id, x.match_id, x.pick
  from jsonb_to_recordset(p_picks) as x(match_id uuid, pick text);

  update public.fanta_credits
  set balance = balance - p_stake, updated_at = now()
  where user_id = p_account_key;

  return v_slip_id;
end;
$$;

revoke execute on function public.place_fanta_bet_slip(uuid, text, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.place_fanta_bet_slip(uuid, text, text, integer, jsonb) to service_role;
