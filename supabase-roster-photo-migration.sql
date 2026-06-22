-- Aggiunge la foto del giocatore alla rosa (per la tendina con immagini).
-- Eseguire una sola volta in Supabase → SQL Editor.

alter table public.fanta_roster
  add column if not exists photo_url text;
