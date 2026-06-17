# FantaCalcio

App mobile per gestire la tua squadra del fantacalcio, costruita come app standalone all'interno del monorepo [open-design](https://github.com/nexu-io/open-design).

## Cosa fa

- **Squadra** — schiera i tuoi 11 titolari sul campo con 8 formazioni disponibili (4-3-3, 4-4-2, 3-5-2, ecc.), scegli capitano e vice, scambia giocatori con un tap
- **Mercato giocatori** — 68 giocatori Serie A con filtri per ruolo (P/D/C/A), ricerca per nome, ordinamento per media/valore/gol, scheda dettaglio con statistiche
- **Classifica** — vedi la classifica della tua lega con medaglie per i primi 3 e la tua posizione evidenziata
- **Calendario** — giornate 34–38 Serie A con tutte le partite, possibilità di seguire le tue squadre preferite
- **Onboarding** — 3 step guidati: nome → nome squadra → logo emoji

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
# Dalla root del monorepo
pnpm --filter @open-design/fantacalcio dev
# → http://localhost:3001
```

## Variabili d'ambiente

Crea `apps/fantacalcio/.env.local` (vedi `.env.example` per il template):

```env
# Clerk — ottieni le chiavi da https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/squad
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Supabase — ottieni le chiavi da https://app.supabase.com
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> **Demo mode**: se `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` non è presente, l'app gira con un utente locale e localStorage (nessuna autenticazione richiesta).

## Setup database Supabase

Esegui il file `supabase-migration.sql` nell'SQL Editor del tuo progetto Supabase. Crea:

- `fanta_profiles` — dati utente (nome, cognome, nome squadra, logo emoji, budget)
- `fanta_squads` — rosa e formazione (titolari, panchina, capitano, modulo)

RLS abilitato su entrambe le tabelle. Il service role key bypassa RLS automaticamente.

## Persistenza dati

L'app usa una strategia dual-layer:

1. **localStorage** — scrittura immediata, disponibile offline, usato per il paint iniziale della pagina
2. **Supabase** — sync cross-device in background, sovrascrive localStorage all'avvio se i dati cloud sono più recenti

## Configurazione Clerk (importante per utenti italiani)

Nel Clerk Dashboard → **Configure → User & Authentication → Email, Phone, Username**:
disabilita **"Phone number"** come metodo di login per evitare problemi con i numeri italiani.

## Verifica connessione

```bash
curl http://localhost:3001/api/health
# → {"status":"ok","supabase":"connected","clerk":true}
```

## Struttura file

```
apps/fantacalcio/
├── .env.example
├── supabase-migration.sql
├── src/
│   ├── middleware.ts              # Clerk auth (protegge tutto tranne /, /sign-in, /sign-up)
│   ├── app/
│   │   ├── layout.tsx             # ClerkProvider + ClerkUserBridge
│   │   ├── page.tsx               # Landing page
│   │   ├── actions.ts             # Server Actions Supabase
│   │   ├── onboarding/page.tsx
│   │   ├── sign-in/ e sign-up/
│   │   ├── api/health/route.ts
│   │   └── (app)/                 # Schermate protette con bottom nav
│   │       ├── squad/page.tsx
│   │       ├── players/page.tsx
│   │       ├── standings/page.tsx
│   │       └── calendar/page.tsx
│   ├── components/
│   │   ├── ClerkUserBridge.tsx    # Propaga user.id Clerk in AppUserContext
│   │   ├── PlayerSheet.tsx        # Bottom sheet dettaglio giocatore
│   │   └── FormationPicker.tsx    # Selettore modulo
│   └── lib/
│       ├── app-user-context.tsx   # AppUserContext + useAppUser() + DemoUserProvider
│       ├── mock-data.ts           # 68 giocatori, 20 squadre, classifica, calendario
│       ├── store.ts               # localStorage state management
│       ├── supabase-server.ts     # createAdminClient() (server-only)
│       └── database.types.ts     # TypeScript types Supabase
```
