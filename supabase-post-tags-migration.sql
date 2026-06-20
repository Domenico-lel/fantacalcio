-- FantaCalcio — Migration "Tag dei post"
-- Aggiunge il tag ai post della bacheca (scoop/ufficiale/mercato/sondaggio
-- per l'admin; NULL per i post degli utenti normali).
-- Da eseguire nel SQL Editor di Supabase. Idempotente.

alter table fanta_posts add column if not exists tag text;
