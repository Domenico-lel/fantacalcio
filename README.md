# ⚽ Fanta Soccer Club

App mobile PWA per gestire il fantacalcio creativo con amici. **Installabile come app nativa** su smartphone. Notizie calcio, transfer rumors, classifica lega in tempo reale, bacheca social, pronostici e sistema badge illustrati.

**Status**: PWA fully functional. Clerk auth + Supabase persistence. Installazione mobile via browser menu.

## Cosa fa

**Navigazione infondo** (bottom nav) con 5 sezioni colorate:

- **🔵 Notizie** (`/news`) — Feed RSS da Corriere dello Sport e Tuttosport, cache 5 min.
- **🟠 Mercato** (`/players`) — Transfer rumors da Transfermarkt (top 5 leghe europee). Clicca card → scheda con dati trasferimento e link profilo TM.
- **🟣 Classifica** (`/standings`) — Classifica reale, giornata corrente e rose ufficiali della lega; i giocatori vengono sincronizzati automaticamente ogni giorno.
- **🟡 Pronostici** (`/pronostici`) — Competizioni raccolte in cartelle, bozze automatiche per Fantacalcio e Serie A e vincita fissa pari a 2× la puntata; l'admin controlla e pubblica.
- **🟢 Bacheca Social** (`/bacheca`) — Feed di post dove interagire, commentare, usare tag.

**Profilo & Badge**:
- **Profile bar** (top) — Avatar, nome squadra, badge illustrati full-color, accesso al drawer profilo.
- **Badge system** — Emblemi illustrati (es. verificato Instagram, badge personalizzati lega).
- **Drawer profilo** — Gestione squadra, avatar, badge e informazioni utente.

**Installazione PWA**:
- Click menu browser → "Installa app" o "Aggiungi a schermata home".
- App standalone con icona, launch screen personalizzato, offline support.

**Onboarding** — 3 step: nome/cognome → nome squadra → logo emoji.

## Stack tecnico

| Livello | Tecnologia |
|---|---|
| Framework | Next.js 15.3.3 (App Router) |
| Autenticazione | Clerk `@clerk/nextjs` v6 |
| Database | Supabase `@supabase/supabase-js` v2 |
| Stile | Tailwind CSS v3, mobile-first 375px |
| PWA | Web App Manifest, installazione mobile, offline support |
| Linguaggio | TypeScript strict |
| Runtime | Node 24, pnpm 10.33.2 |
| Design | Dark theme (theme-color: #0a0f1d), bottom nav con 5 icone colorate |

## Avvio in sviluppo

```bash
# Dalla root repo fantacalcio
pnpm install
pnpm dev -- --port 3004
# → http://localhost:3004
```

**HTTPS per PWA**: In dev, apri tramite `https://localhost:3004` (Accept HTTPS warning nel browser) per testare l'installazione PWA. Oppure, in Chrome, apri DevTools → More tools → Application → Manifest per verificare che il manifest sia caricato.

## Variabili d'ambiente

Crea `.env.local` (vedi `.env.example` per il template):

```env
# Clerk — ottieni le chiavi da https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/trofei
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Supabase — ottieni le chiavi da https://app.supabase.com
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Fantacalcio — account abilitato ad aprire la competizione
FANTACALCIO_LEAGUE_URL=https://leghe.fantacalcio.it/nome-lega/view/competition/123
FANTACALCIO_USERNAME=
FANTACALCIO_PASSWORD=

# Calendario e risultati Serie A
FOOTBALL_DATA_API_KEY=

# Protegge i job Vercel: rose alle 03:15 e bozze pronostici alle 03:30 UTC
CRON_SECRET=una_stringa_lunga_e_casuale
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

## Configurazione PWA

App installabile su:
- **iOS**: Apri in Safari → Condividi → "Aggiungi a schermata home"
- **Android**: Chrome menu → "Installa app" (richiede HTTPS + manifest valido)

**File di configurazione PWA**:
- `public/manifest.json` — Nome app, icone, colori, orientamento
- `src/app/layout.tsx` — Metadata, `appleWebApp`, viewport, theme-color
- `src/components/PwaInstallGuide` — Componente per promuovere installazione

**Features PWA**:
- Display `standalone` (fullscreen, nessuna barra browser)
- Start URL: `/` (dopo login → `/news`)
- Background color: `#0a0f1d` (dark theme)
- Orientamento: portrait

## Persistenza dati

Dual-layer strategy:

1. **localStorage** — scrittura immediata, disponibile offline, usato per il paint iniziale.
2. **Supabase** — sync cross-device in background, sovrascrive localStorage all'avvio se i dati cloud sono più recenti.

## API routes

- `GET /api/health` — verifica Supabase + Clerk.
- `GET /api/news` — RSS Corriere dello Sport + Tuttosport, cache 5 min.
- `GET /api/transfers` — scraping Transfermarkt top 5 leghe, cache 5 min (in-memory per dev).
- `GET /api/standings` — scraping Leghe FC, cache 10 min.
- `GET /api/cron/sync-rosters` — sincronizzazione giornaliera protetta di squadre, giocatori e scambi.
- `GET /api/cron/prepare-predictions` — prepara ogni giorno la nuova bozza Pronostici senza pubblicarla.

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
├── public/
│   ├── manifest.json              # Web App Manifest (PWA)
│   └── icon.svg                   # Icona app
├── supabase-*.sql                 # File di migrazione database
├── src/
│   ├── middleware.ts              # Clerk auth (protegge tutto tranne /, /sign-in, /sign-up)
│   ├── app/
│   │   ├── layout.tsx             # Root layout (PWA metadata, theme-color, appleWebApp)
│   │   ├── page.tsx               # Landing page (login redirect)
│   │   ├── actions.ts             # Server Actions (profilo, team, ecc)
│   │   ├── *-actions.ts           # Server Actions per bacheca, pronostici, social
│   │   ├── onboarding/page.tsx
│   │   ├── sign-in/ e sign-up/
│   │   ├── api/                   # Endpoint di appoggio (health, news, transfers, standings)
│   │   └── (app)/                 # Schermate protette con layout PWA
│   │       ├── layout.tsx         # App layout (profile bar + bottom nav + drawer profilo)
│   │       ├── bacheca/           # Social feed
│   │       ├── news/              # Notizie RSS
│   │       ├── players/           # Transfer rumors
│   │       ├── pronostici/        # Sezione pronostici (crediti, ranking)
│   │       └── standings/         # Classifica lega
│   ├── components/
│   │   ├── PwaInstallGuide        # Guide per installazione PWA mobile
│   │   ├── ProfileDrawer          # Drawer profilo + avatar + badge
│   │   ├── Badges                 # Componente badge illustrati
│   │   ├── BadgeRow               # Badge riga compatta (profile bar)
│   │   └── ...altri componenti
│   └── lib/                       # Utility, context, tipi DB, Supabase client
```

## Bottom Navigation

5 tabs alla base dello schermo, sempre visibile. Configurati in `src/app/(app)/layout.tsx`:

```typescript
const NAV_ITEMS = [
  { href: "/news",        label: "Notizie",    icon: NewsIcon,       color: "#3b8eea" },      // blu
  { href: "/players",     label: "Mercato",    icon: TransferIcon,   color: "#f0a43a" },     // arancione
  { href: "/standings",   label: "Classifica", icon: StandingsIcon,  color: "#857cf0" },     // viola
  { href: "/pronostici",  label: "Pronostici", icon: DiceIcon,       color: "#f5a623" },     // giallo
  { href: "/bacheca",     label: "Bacheca",    icon: MegaphoneIcon,  color: "#1fb083" },     // verde
];
```

Per aggiungere/modificare tab: edit `NAV_ITEMS` array e update gli icon component (o importa nuove icone SVG).

## Note di sviluppo

- **HTTPS in dev per PWA**: Se testi l'installazione mobile in localhost, devi aprire con HTTPS (`https://localhost:3004`).
- **Trasferimenti lenti al primo caricamento**: ~20-30s per 44 richieste a Transfermarkt. Dalla cache in-memory (5 min TTL) è istantaneo.
- **HTML Transfermarkt instabile**: regex scraping possono rompersi se TM cambia struttura.
- **Lega Leghe FC**: URL classifica in `src/app/api/standings/route.ts`.
- **Pronostici**: Admin escluso automaticamente dalla classifica crediti.
- **Badge system**: Gestito in `src/components/Badges`. Full-color, illustrati, con verifiche (es. Instagram).
