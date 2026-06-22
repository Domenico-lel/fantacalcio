-- Aggiunge la foto del giocatore alle inserzioni "cedibili" (per mostrarla nella lista).
-- Eseguire una sola volta in Supabase → SQL Editor.

alter table public.fanta_transfer_listings
  add column if not exists player_photo text;
