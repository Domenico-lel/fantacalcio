# FantaCalcio

App mobile per gestire il fantacalcio creativo con amici. Notizie calcio, transfer rumors, classifica lega in tempo reale, bacheca social e pronostici.

**Status**: Standalone repo, fully functional with Clerk auth + Supabase persistence.

## Cosa fa

- **Notizie** (`/news`) — Feed RSS da Corriere dello Sport e Tuttosport, cache 5 min.
- **Mercato** (`/players`) — Transfer rumors da Transfermarkt (top 5 leghe europee: Serie A, Premier League, La Liga, Bundesliga, Ligue 1). Clicca card → scheda con dati trasferimento, link profilo TM.
- **Classifica** (`/standings`) — Classifica reale lega amici da Leghe FC, scraping HTML cache 10 min.
- **Calendario** (`/calendar`) — Giornate Serie A (attualmente mock, da aggiornare con API).
- **Bacheca Social** (`/bacheca`) — Feed di post della lega dove gli utenti possono interagire, commentare e usare i tag.
- **Pronostici** (`/pronostici`) — Sezione dedicata ai pronostici delle partite.
- **Squadre** — Gestione avanzata delle squadre degli utenti e dei relativi dati.
- **Onboarding** — 3 step: nome/cognome → nome squadra → logo emoji.
- **Profilo** — Accessibile dalla barra header, mostra dati utente + avatar.

## Stack tecnico

| Livello | Tecnologia |
|---|---|
| Framework | Next.js 15.3.3 (App Router) |
| Autenticazione | Clerk `@clerk/nextjs` v6 |
| Database | Supabase `@supabase/supabase-js` v2 |
| Stile | Tailwind CSS v3, mobile-first 375px |
| Linguaggio | TypeScript strict |
| Runtime | Node 24, pnpm 10.33.2 |

## Avvio in sviluppo

```bash
# Dalla root repo fantacalcio
npm install
npm run dev -- --port 3004
# → http://localhost:3004
```

## Variabili d'ambiente

Crea `.env.local` (vedi `.env.example` per il template):

```env
# Clerk — ottieni le chiavi da https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/news
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Supabase — ottieni le chiavi da https://app.supabase.com
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> **Demo mode**: se `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` non è presente, l'app gira con utente locale e localStorage (nessuna autenticazione richiesta).

## Setup database Supabase

Esegui i file SQL di migrazione nell'SQL Editor del tuo progetto Supabase. I file includono la creazione di tabelle per profili, social, pronostici, team e tag.

- `supabase-migration.sql` — Creazione base (`fanta_profiles`).
- `supabase-teams-migration.sql` — Tabelle per la gestione squadre.
- `supabase-social-migration.sql` — Creazione bacheca e post.
- `supabase-social-fix.sql` — Correzioni aggiuntive alla bacheca.
- `supabase-post-tags-migration.sql` — Sistema di tag per i post della bacheca.
- `supabase-pronostici-migration.sql` — Tabelle per il sistema dei pronostici.

RLS abilitato. Service role key bypassa RLS automaticamente.

## Persistenza dati

Dual-layer strategy:

1. **localStorage** — scrittura immediata, disponibile offline, usato per il paint iniziale.
2. **Supabase** — sync cross-device in background, sovrascrive localStorage all'avvio se i dati cloud sono più recenti.

## API routes

- `GET /api/health` — verifica Supabase + Clerk.
- `GET /api/news` — RSS Corriere dello Sport + Tuttosport, cache 5 min.
- `GET /api/transfers` — scraping Transfermarkt top 5 leghe, cache 5 min (in-memory per dev).
- `GET /api/standings` — scraping Leghe FC, cache 10 min.

## Configurazione Clerk (importante per utenti italiani)

Nel Clerk Dashboard → **Configure → User & Authentication → Email, Phone, Username**:
disabilita **"Phone number"** come metodo di login per evitare problemi con i numeri italiani.

## Verifica connessione

```bash
curl http://localhost:3004/api/health
# → {"status":"ok","supabase":"connected","clerk":true}
```

## Struttura file (principali)

```
fantacalcio/
├── .env.example
├── supabase-*.sql                 # File di migrazione database
├── src/
│   ├── middleware.ts              # Clerk auth (protegge tutto tranne /, /sign-in, /sign-up)
│   ├── app/
│   │   ├── layout.tsx             # ClerkProvider + ClerkUserBridge
│   │   ├── page.tsx               # Landing page
│   │   ├── actions.ts             # Server Actions (profilo, ecc)
│   │   ├── *-actions.ts           # Server Actions per bacheca, pronostici, team
│   │   ├── onboarding/page.tsx
│   │   ├── sign-in/ e sign-up/
│   │   ├── api/                   # Endpoint di appoggio (health, news, transfers, standings)
│   │   └── (app)/                 # Schermate protette con bottom nav
│   │       ├── bacheca/           # Social feed
│   │       ├── calendar/          # Calendario
│   │       ├── news/              # Notizie RSS
│   │       ├── players/           # Transfer rumors
│   │       ├── pronostici/        # Sezione pronostici
│   │       └── standings/         # Classifica lega
│   ├── components/                # Componenti UI e layout
│   └── lib/                       # Utility, context, tipi DB, Supabase client
```

## Note di sviluppo

- **Trasferimenti lenti in dev**: primo caricamento fetch 44 richieste a TM (~20-30s). Dalla cache in-memory (5 min TTL) risposta istantanea.
- **HTML Transfermarkt instabile**: regex scraping possono rompersi se TM cambia struttura.
- **Lega Leghe FC**: URL classifica configurato in `src/app/api/standings/route.ts`.
- **Calendario mock**: attualmente non aggiornato in tempo reale — in lista TODO.
