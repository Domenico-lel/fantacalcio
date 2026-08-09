-- Nome visualizzato della squadra: separato dal nome tecnico importato dalla classifica.
-- Il nome tecnico (fanta_teams.name) continua a essere la chiave della sincronizzazione.

alter table public.fanta_teams
  add column if not exists display_name text;

-- Conserva le personalizzazioni già fatte in passato sui profili manager.
update public.fanta_teams as team
set display_name = legacy.team_name
from (
  select distinct on (team_ref)
    team_ref,
    btrim(team_name) as team_name
  from public.fanta_profiles
  where team_ref is not null
    and btrim(coalesce(team_name, '')) <> ''
  order by team_ref, updated_at desc nulls last, created_at desc
) as legacy
where team.id = legacy.team_ref
  and coalesce(btrim(team.display_name), '') = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fanta_teams_display_name_valid'
      and conrelid = 'public.fanta_teams'::regclass
  ) then
    alter table public.fanta_teams
      add constraint fanta_teams_display_name_valid
      check (
        display_name is null
        or char_length(btrim(display_name)) between 1 and 60
      );
  end if;
end $$;
