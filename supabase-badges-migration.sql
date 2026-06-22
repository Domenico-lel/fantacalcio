-- Aggiunge i badge assegnabili dall'admin ai profili manager.
-- Eseguire una sola volta in Supabase → SQL Editor.

alter table public.fanta_profiles
  add column if not exists badges text[] not null default '{}';
