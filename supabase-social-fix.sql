-- FantaCalcio — Riparazione schema "Bacheca social"
-- Da eseguire UNA volta nel SQL Editor di Supabase.
-- Serve perché fanta_posts era stata creata da una versione precedente dello
-- script (senza author_name/author_logo e con una FK verso le squadre).
-- Idempotente: puoi rieseguirlo senza danni.

-- 1) Colonne mancanti sui post (nome/avatar denormalizzati dell'autore)
alter table fanta_posts add column if not exists author_name text not null default 'Admin Lega';
alter table fanta_posts add column if not exists author_logo text not null default '📣';

-- 2) Rimuovi la vecchia foreign key author_id -> fanta_profiles.
--    L'admin NON è una squadra, quindi non deve esistere in fanta_profiles.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'fanta_posts'::regclass and contype = 'f'
  loop
    execute format('alter table fanta_posts drop constraint %I', c);
  end loop;
end $$;

-- 3) Rimuovi il residuo is_admin su fanta_profiles
--    (gli admin ora stanno nella tabella dedicata fanta_admins)
alter table fanta_profiles drop column if exists is_admin;
