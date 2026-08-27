-- FantaCalcio — interruttore di rilascio indipendente per la Carriera.
-- Default prudente: la modalità resta visibile solo all'admin finché non viene
-- aperta esplicitamente dal pannello Gestione.

insert into public.fanta_settings (key, value, updated_at)
values ('career_open', 'false', now())
on conflict (key) do nothing;
