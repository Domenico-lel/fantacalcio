-- FantaCalcio — Migration "Bacheca social" (scoop + commenti + like + cedibili)
-- Esegui questo script nell'SQL Editor di Supabase Dashboard.
-- È idempotente: puoi rieseguirlo senza problemi.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Admin della lega (account dedicato, NON una squadra della competizione).
--    L'admin è identificato dalla sua email Clerk presente in questa tabella.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists fanta_admins (
  email        text primary key,             -- email dell'account admin (Clerk)
  display_name text not null default 'Admin Lega',
  avatar       text not null default '📣',
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Post / scoop (li pubblica solo l'admin — controllo lato server).
--    author_id = Clerk user id di chi pubblica; nome/avatar denormalizzati
--    così il post è autosufficiente. Nessuna FK verso le squadre.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists fanta_posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    text not null,
  author_name  text not null default 'Admin Lega',
  author_logo  text not null default '📣',
  body         text not null default '',
  image_url    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- un post deve avere almeno testo o immagine
  constraint fanta_posts_not_empty
    check (length(coalesce(body, '')) > 0 or image_url is not null)
);

create index if not exists fanta_posts_created_idx
  on fanta_posts (created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Like ai post (uno per utente per post)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists fanta_post_likes (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references fanta_posts(id) on delete cascade,
  user_id     text not null,
  created_at  timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists fanta_post_likes_post_idx
  on fanta_post_likes (post_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Commenti ai post (li può scrivere ogni utente loggato, admin incluso)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists fanta_post_comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references fanta_posts(id) on delete cascade,
  user_id      text not null,
  author_name  text not null,
  author_logo  text not null default '⚽',
  body         text not null,
  created_at   timestamptz not null default now()
);

create index if not exists fanta_post_comments_post_idx
  on fanta_post_comments (post_id, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Bacheca cedibili (ogni manager mette in vetrina i propri giocatori)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists fanta_transfer_listings (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null references fanta_profiles(user_id) on delete cascade,
  owner_name   text not null,
  owner_logo   text not null default '⚽',
  player_name  text not null,
  note         text,
  status       text not null default 'available'
               check (status in ('available', 'closed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists fanta_transfer_listings_idx
  on fanta_transfer_listings (status, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) Trigger updated_at (riusa la funzione set_updated_at già esistente)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_updated_at on fanta_posts;
create trigger posts_updated_at
  before update on fanta_posts
  for each row execute function set_updated_at();

drop trigger if exists listings_updated_at on fanta_transfer_listings;
create trigger listings_updated_at
  before update on fanta_transfer_listings
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) Row Level Security (il service role usato dal server bypassa RLS;
--    la abilitiamo comunque come best practice)
-- ─────────────────────────────────────────────────────────────────────────────
alter table fanta_admins            enable row level security;
alter table fanta_posts             enable row level security;
alter table fanta_post_likes        enable row level security;
alter table fanta_post_comments     enable row level security;
alter table fanta_transfer_listings enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8) Storage: bucket pubblico per le immagini dei post
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;
