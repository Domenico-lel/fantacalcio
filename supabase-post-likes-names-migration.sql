-- FantaCalcio — Migration "Chi mette like ai post"
-- Salva nome e logo di chi mette like (denormalizzati, come già per post e
-- commenti) così la bacheca può mostrare l'elenco di chi ha messo like a un post.
-- Da eseguire nel SQL Editor di Supabase. Idempotente.

alter table fanta_post_likes add column if not exists user_name text;
alter table fanta_post_likes add column if not exists user_logo text;
