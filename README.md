# FantaCalcio

App mobile per gestire il fantacalcio creativo con amici. Notizie calcio, transfer rumors, classifica lega in tempo reale.

**Status**: Standalone repo, fully functional with Clerk auth + Supabase persistence.

## Cosa fa

- **Notizie** (`/news`) — Feed RSS da Corriere dello Sport e Tuttosport, cache 5 min
- **Mercato** (`/players`) — Transfer rumors da Transfermarkt (top 5 leghe europee: Serie A, Premier League, La Liga, Bundesliga, Ligue 1). Clicca card → scheda con dati trasferimento, link profilo TM
- **Classifica** (`/standings`) — Classifica reale lega amici da Leghe FC, scraping HTML cache 10 min
- **Calendario** (`/calendar`) — Giornate Serie A (attualmente mock, da aggiornare con API)
- **Onboarding** — 3 step: nome/cognome → nome squadra → logo emoji
- **Profilo** — Accessibile dalla barra header, mostra dati utente + avatar

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

Esegui il file `supabase-migration.sql` nell'SQL Editor del tuo progetto Supabase. Crea:

- `fanta_profiles` — dati utente (nome, cognome, nome squadra, logo emoji)

RLS abilitato. Service role key bypassa RLS automaticamente.

## Persistenza dati

Dual-layer strategy:

1. **localStorage** — scrittura immediata, disponibile offline, usato per il paint iniziale
2. **Supabase** — sync cross-device in background, sovrascrive localStorage all'avvio se i dati cloud sono più recenti

## API routes

- `GET /api/health` — verifica Supabase + Clerk
- `GET /api/news` — RSS Corriere dello Sport + Tuttosport, cache 5 min
- `GET /api/transfers` — scraping Transfermarkt top 5 leghe, cache 5 min (in-memory per dev)
- `GET /api/standings` — scraping Leghe FC fantacazzo-nella-bocca, cache 10 min

## Configurazione Clerk (importante per utenti italiani)

Nel Clerk Dashboard → **Configure → User & Authentication → Email, Phone, Username**:
disabilita **"Phone number"** come metodo di login per evitare problemi con i numeri italiani.

## Verifica connessione

```bash
curl http://localhost:3004/api/health
# → {"status":"ok","supabase":"connected","clerk":true}
```

## Struttura file

```
fantacalcio/
├── .env.example
├── supabase-migration.sql
├── src/
│   ├── middleware.ts              # Clerk auth (protegge tutto tranne /, /sign-in, /sign-up)
│   ├── app/
│   │   ├── layout.tsx             # ClerkProvider + ClerkUserBridge
│   │   ├── page.tsx               # Landing page
│   │   ├── actions.ts             # Server Actions Supabase (profilo)
│   │   ├── onboarding/page.tsx
│   │   ├── sign-in/ e sign-up/
│   │   ├── api/
│   │   │   ├── health/route.ts
│   │   │   ├── news/route.ts      # RSS feed
│   │   │   ├── transfers/route.ts # Transfermarkt scraping
│   │   │   └── standings/route.ts # Leghe FC scraping
│   │   └── (app)/                 # Schermate protette con bottom nav
│   │       ├── news/page.tsx
│   │       ├── players/page.tsx   # Transfer rumors + bottom sheet
│   │       ├── standings/page.tsx
│   │       └── calendar/page.tsx
│   ├── components/
│   │   ├── ClerkUserBridge.tsx    # Propaga user.id Clerk in AppUserContext
│   │   └── ProfileDrawer.tsx      # Profilo utente drawer
│   └── lib/
│       ├── app-user-context.tsx   # AppUserContext + useAppUser() + DemoUserProvider
│       ├── store.ts               # localStorage state management
│       ├── supabase-server.ts     # createAdminClient() (server-only)
│       └── database.types.ts      # TypeScript types Supabase
```

## Note di sviluppo

- **Trasferimenti lenti in dev**: primo caricamento fetch 44 richieste a TM (~20-30s). Dalla cache in-memory (5 min TTL) risposta istantanea.
- **HTML Transfermarkt instabile**: regex scraping possono rompersi se TM cambia struttura. Se transfer card non carica dati, controlla `src/app/api/transfers/route.ts`.
- **Lega Leghe FC**: URL classifica hardcoded `https://leghe.fantacalcio.it/fantacazzo-nella-bocca/classifica`. Cambiare se necessario in `src/app/api/standings/route.ts`.
- **Calendario mock**: attualmente non aggiornato in tempo reale — in lista TODO da aggiornare.
