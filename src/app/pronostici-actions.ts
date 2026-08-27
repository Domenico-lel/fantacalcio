"use server";

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";
import { getCurrentViewer, type Viewer } from "@/app/social-actions";
import {
  STARTING_CREDITS,
  FIXED_WIN_MULTIPLIER,
  calculateFixedPayout,
  type ExtMatch,
} from "@/lib/bet-constants";
import { fetchCompetitionMatches, fetchMatchResult } from "@/lib/football-data";
import {
  ensureAllPredictionDrafts,
  ensureAllPredictionDraftsIfStale,
  type AllPredictionDraftsResult,
} from "@/lib/all-prediction-drafts";

type Pick = "1" | "X" | "2";
type AdminClient = ReturnType<typeof createAdminClient>;

// ─── Tipi esposti al client ─────────────────────────────────────────────────

export interface MyBet {
  pick: Pick;
  stake: number;
  status: "pending" | "won" | "lost";
  payout: number;
}

// Dettaglio di una singola giocata, visibile solo all'admin (per gestirla/cancellarla)
export interface AdminBet {
  betId: string;
  userId: string;
  name: string;
  logo: string;
  pick: Pick;
  stake: number;
  status: "pending" | "won" | "lost";
  payout: number;
}

export interface BetMatch {
  id: string;
  homeName: string;
  awayName: string;
  homeLogo: string;
  awayLogo: string;
  competition: string | null; // valorizzato per le partite reali
  kickoff: string | null;     // data/ora ISO della partita reale
  external: boolean;          // true = partita reale (non squadre della lega)
  result: Pick | null;
  myBet: MyBet | null;
  betCount: number;
  bets?: AdminBet[]; // popolato solo per l'admin
}

export interface BetRound {
  id: string;
  day: number;
  title: string | null;
  status: "draft" | "open" | "closed" | "settled";
  createdAt: string;
  matches: BetMatch[];
}

export interface CreditRow {
  userId: string;
  name: string;
  logo: string;
  balance: number;
  mine: boolean;
}

export interface BetCenter {
  viewer: Viewer | null;
  balance: number;
  rounds: BetRound[];
  leaderboard: CreditRow[];
  serverNow: number; // ora del server (ms epoch) per calcolare lo scarto d'orologio del client
}

// ─── Helper crediti ──────────────────────────────────────────────────────────

// La "cassa crediti" di un manager è la sua squadra: i comproprietari di una
// squadra condivisa (doppio) condividono lo stesso saldo. Chi non ha una squadra
// fa cassa a sé (fallback all'user_id, usato anche dagli aggiustamenti admin).
async function creditAccountKey(db: AdminClient, userId: string): Promise<string> {
  const { data } = await db.from("fanta_profiles").select("team_ref").eq("user_id", userId).maybeSingle();
  return data?.team_ref || userId;
}

async function getBalanceByKey(db: AdminClient, key: string): Promise<number> {
  const { data } = await db.from("fanta_credits").select("balance").eq("user_id", key).maybeSingle();
  if (data) return data.balance;
  await db.from("fanta_credits").insert({ user_id: key, balance: STARTING_CREDITS });
  return STARTING_CREDITS;
}

async function getBalance(db: AdminClient, userId: string): Promise<number> {
  return getBalanceByKey(db, await creditAccountKey(db, userId));
}

async function addBalance(db: AdminClient, userId: string, delta: number): Promise<void> {
  if (!delta) return;
  const key = await creditAccountKey(db, userId);
  const bal = await getBalanceByKey(db, key);
  await db
    .from("fanta_credits")
    .update({ balance: Math.max(0, bal + delta), updated_at: new Date().toISOString() })
    .eq("user_id", key);
}

// ─── Lettura: centro scommesse ───────────────────────────────────────────────

export async function fetchBetCenter(): Promise<BetCenter> {
  const empty: BetCenter = { viewer: null, balance: 0, rounds: [], leaderboard: [], serverNow: Date.now() };
  if (!isSupabaseConfigured()) return empty;

  const viewer = await getCurrentViewer();
  if (!viewer) return empty;

  // Il cron resta la fonte principale. Questo controllo rende però la bozza
  // disponibile anche al primo accesso admin dopo una nuova giornata.
  if (viewer.isAdmin) {
    await ensureAllPredictionDraftsIfStale().catch((error) => {
      console.error("[prediction-drafts] Controllo all'apertura fallito", error);
    });
  }

  const db = createAdminClient();

  // saldo del viewer (i manager hanno crediti; l'admin no)
  const balance = viewer.isAdmin ? 0 : await getBalance(db, viewer.userId);

  // loghi squadre
  const { data: teams } = await db.from("fanta_teams").select("id, name, logo_url");
  const logoByTeam = new Map<string, string>();
  for (const t of teams ?? []) if (t.logo_url) logoByTeam.set(t.id, t.logo_url);

  // profili (nomi/loghi manager) + crediti
  const { data: profiles } = await db
    .from("fanta_profiles")
    .select("user_id, first_name, team_name, team_ref, logo");
  const { data: credits } = await db.from("fanta_credits").select("user_id, balance");

  const nameByUser = new Map<string, string>();
  const logoByUser = new Map<string, string>();
  for (const p of profiles ?? []) {
    nameByUser.set(p.user_id, p.team_name || p.first_name || "Manager");
    logoByUser.set(p.user_id, (p.team_ref && logoByTeam.get(p.team_ref)) || p.logo || "⚽");
  }

  // giornate + scontri
  const { data: rounds } = await db
    .from("fanta_bet_rounds")
    .select("*")
    .order("day", { ascending: false })
    .order("created_at", { ascending: false });

  const { data: matches } = await db
    .from("fanta_bet_matches")
    .select("*")
    .order("created_at", { ascending: true });

  const matchIds = (matches ?? []).map((m) => m.id);
  const allBets = matchIds.length
    ? (await db
        .from("fanta_bets")
        .select("id, match_id, user_id, pick, stake, status, payout")
        .in("match_id", matchIds)).data
    : [];

  const myBetByMatch = new Map<string, MyBet>();
  const countByMatch = new Map<string, number>();
  const adminBetsByMatch = new Map<string, AdminBet[]>();
  for (const b of allBets ?? []) {
    countByMatch.set(b.match_id, (countByMatch.get(b.match_id) ?? 0) + 1);
    if (b.user_id === viewer.userId) {
      myBetByMatch.set(b.match_id, { pick: b.pick, stake: b.stake, status: b.status, payout: b.payout });
    }
    if (viewer.isAdmin) {
      const list = adminBetsByMatch.get(b.match_id) ?? [];
      list.push({
        betId: b.id,
        userId: b.user_id,
        name: nameByUser.get(b.user_id) ?? "Manager",
        logo: logoByUser.get(b.user_id) ?? "⚽",
        pick: b.pick,
        stake: b.stake,
        status: b.status,
        payout: b.payout,
      });
      adminBetsByMatch.set(b.match_id, list);
    }
  }

  const matchesByRound = new Map<string, BetMatch[]>();
  for (const m of matches ?? []) {
    const list = matchesByRound.get(m.round_id) ?? [];
    list.push({
      id: m.id,
      homeName: m.home_name,
      awayName: m.away_name,
      homeLogo: m.home_logo || (m.home_team && logoByTeam.get(m.home_team)) || "⚽",
      awayLogo: m.away_logo || (m.away_team && logoByTeam.get(m.away_team)) || "⚽",
      competition: m.competition ?? null,
      kickoff: m.kickoff ?? null,
      external: !!(m.ext_event_id || m.competition),
      result: m.result,
      myBet: myBetByMatch.get(m.id) ?? null,
      betCount: countByMatch.get(m.id) ?? 0,
      bets: viewer.isAdmin ? (adminBetsByMatch.get(m.id) ?? []) : undefined,
    });
    matchesByRound.set(m.round_id, list);
  }

  const roundList: BetRound[] = (rounds ?? [])
    .filter((round) => viewer.isAdmin || round.status !== "draft")
    .map((r) => ({
      id: r.id,
      day: r.day,
      title: r.title,
      status: r.status,
      createdAt: r.created_at,
      matches: matchesByRound.get(r.id) ?? [],
    }));

  // classifica crediti — una riga per squadra assegnata (l'admin non è in gara).
  // I comproprietari di una squadra condivisa (doppio) condividono la stessa
  // cassa: il saldo è per team_ref, quindi la squadra appare una sola volta.
  const balByAccount = new Map<string, number>();
  for (const c of credits ?? []) balByAccount.set(c.user_id, c.balance);

  // squadra del viewer, per evidenziare la propria riga anche da comproprietario
  const viewerTeam = (profiles ?? []).find((p) => p.user_id === viewer.userId)?.team_ref ?? null;

  const rowByTeam = new Map<string, CreditRow>();
  for (const p of profiles ?? []) {
    if (!p.team_ref) continue;
    const existing = rowByTeam.get(p.team_ref);
    if (existing) {
      if (viewerTeam && p.team_ref === viewerTeam) existing.mine = true;
      if ((!existing.name || existing.name === "Manager") && p.team_name) existing.name = p.team_name;
      continue;
    }
    rowByTeam.set(p.team_ref, {
      userId: p.team_ref, // la cassa è la squadra
      name: p.team_name || p.first_name || "Manager",
      logo: logoByTeam.get(p.team_ref) || p.logo || "⚽",
      balance: balByAccount.get(p.team_ref) ?? STARTING_CREDITS,
      mine: !!viewerTeam && p.team_ref === viewerTeam,
    });
  }
  const leaderboard: CreditRow[] = Array.from(rowByTeam.values()).sort((a, b) => b.balance - a.balance);

  return { viewer, balance, rounds: roundList, leaderboard, serverNow: Date.now() };
}

// ─── Scommessa (manager) ─────────────────────────────────────────────────────

export async function placeBet(matchId: string, pick: Pick, stake: number): Promise<{ error: string | null; balance?: number }> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { error: "Non autenticato" };
  if (viewer.isAdmin) return { error: "L'admin non può scommettere" };
  if (!viewer.hasProfile) return { error: "Completa prima il tuo profilo squadra" };
  if (!["1", "X", "2"].includes(pick)) return { error: "Esito non valido" };
  if (!Number.isInteger(stake) || stake <= 0) return { error: "Puntata non valida" };

  const db = createAdminClient();

  const { data: match } = await db.from("fanta_bet_matches").select("*").eq("id", matchId).maybeSingle();
  if (!match) return { error: "Scontro non trovato" };
  if (match.result) return { error: "Scontro già concluso" };

  const { data: round } = await db.from("fanta_bet_rounds").select("status").eq("id", match.round_id).maybeSingle();
  if (round?.status !== "open") return { error: "Scommesse chiuse per questa giornata" };

  // niente giocate dopo il calcio d'inizio della partita reale
  if (match.kickoff && new Date(match.kickoff).getTime() <= Date.now()) {
    return { error: "Partita già iniziata: scommesse chiuse" };
  }

  // una giocata già piazzata non si può più modificare
  const { data: existing } = await db
    .from("fanta_bets")
    .select("id")
    .eq("match_id", matchId)
    .eq("user_id", viewer.userId)
    .maybeSingle();
  if (existing) return { error: "Hai già piazzato la giocata, non puoi modificarla" };

  const balance = await getBalance(db, viewer.userId);
  if (balance < stake) return { error: `Crediti insufficienti (hai ${balance})` };

  await addBalance(db, viewer.userId, -stake); // scala dalla cassa condivisa della squadra
  const { error } = await db.from("fanta_bets").insert({
    match_id: matchId,
    user_id: viewer.userId,
    pick,
    stake,
    odd: FIXED_WIN_MULTIPLIER,
  });
  if (error) {
    console.error("[pronostici] Salvataggio giocata fallito", error);
    // Se il salvataggio fallisce, ripristina subito la puntata scalata.
    await addBalance(db, viewer.userId, stake);
    return { error: "Non è stato possibile registrare la giocata. Riprova." };
  }

  return { error: null, balance: balance - stake };
}

// ─── Settlement (admin) ──────────────────────────────────────────────────────

type MatchRow = {
  id: string;
  home_team: string | null;
  away_team: string | null;
  result: Pick | null;
};

async function reverseMatch(db: AdminClient, match: MatchRow): Promise<void> {
  if (!match.result) return;
  // annulla payout scommesse
  const { data: bets } = await db.from("fanta_bets").select("*").eq("match_id", match.id);
  for (const b of bets ?? []) {
    if (b.status === "won" && b.payout) await addBalance(db, b.user_id, -b.payout);
    await db.from("fanta_bets").update({ status: "pending", payout: 0 }).eq("id", b.id);
  }
}

async function settleMatch(db: AdminClient, matchId: string, result: Pick): Promise<void> {
  const { data: bets } = await db.from("fanta_bets").select("*").eq("match_id", matchId);
  for (const b of bets ?? []) {
    if (b.status !== "pending" && b.status !== "won" && b.status !== "lost") continue;
    if (b.pick === result) {
      const payout = calculateFixedPayout(b.stake);
      await addBalance(db, b.user_id, payout);
      await db.from("fanta_bets").update({ status: "won", payout }).eq("id", b.id);
    } else {
      await db.from("fanta_bets").update({ status: "lost", payout: 0 }).eq("id", b.id);
    }
  }
}

export async function setMatchResult(matchId: string, result: Pick | null): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  if (result !== null && !["1", "X", "2"].includes(result)) return { error: "Esito non valido" };

  const db = createAdminClient();
  const { data: match } = await db.from("fanta_bet_matches").select("*").eq("id", matchId).maybeSingle();
  if (!match) return { error: "Scontro non trovato" };

  // se già concluso, prima annulla il vecchio settlement
  if (match.settled_at || match.result) {
    await reverseMatch(db, match);
  }

  if (result === null) {
    await db.from("fanta_bet_matches").update({ result: null, settled_at: null }).eq("id", matchId);
    await refreshRoundStatus(db, match.round_id);
    return { error: null };
  }

  await settleMatch(db, matchId, result);

  await db.from("fanta_bet_matches").update({ result, settled_at: new Date().toISOString() }).eq("id", matchId);
  await refreshRoundStatus(db, match.round_id);
  return { error: null };
}

async function refreshRoundStatus(db: AdminClient, roundId: string): Promise<void> {
  const { data: ms } = await db.from("fanta_bet_matches").select("result").eq("round_id", roundId);
  const list = ms ?? [];
  const allSettled = list.length > 0 && list.every((m) => m.result);
  const { data: round } = await db.from("fanta_bet_rounds").select("status").eq("id", roundId).maybeSingle();
  if (!round) return;
  if (allSettled && round.status !== "settled") {
    await db.from("fanta_bet_rounds").update({ status: "settled" }).eq("id", roundId);
  } else if (!allSettled && round.status === "settled") {
    await db.from("fanta_bet_rounds").update({ status: "closed" }).eq("id", roundId);
  }
}

// ─── Gestione giornate / scontri (admin) ─────────────────────────────────────

export async function createBetRound(day: number, title: string): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  if (!Number.isFinite(day) || day <= 0) return { error: "Giornata non valida" };
  const db = createAdminClient();
  const { error } = await db.from("fanta_bet_rounds").insert({ day, title: title.trim() || null, status: "draft" });
  return { error: error?.message ?? null };
}

export async function preparePredictionDraftNow(): Promise<AllPredictionDraftsResult> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) {
    const error = "Solo l'admin può preparare le bozze";
    return {
      fantasy: {
        day: null, roundId: null, matches: 0, created: false,
        skipped: true, checkedAt: null, error,
      },
      serieA: {
        day: null, roundId: null, matches: 0,
        created: false, skipped: true, error,
      },
      checkedAt: null,
    };
  }
  return ensureAllPredictionDrafts();
}

export async function setRoundStatus(roundId: string, status: "open" | "closed"): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  const db = createAdminClient();
  const { error } = await db.from("fanta_bet_rounds").update({ status }).eq("id", roundId);
  return { error: error?.message ?? null };
}

export async function deleteBetRound(roundId: string): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  const db = createAdminClient();
  // annulla eventuali settlement (payout + bonus) e rimborsa le puntate prima di cancellare
  const { data: matches } = await db.from("fanta_bet_matches").select("*").eq("round_id", roundId);
  for (const m of matches ?? []) {
    if (m.settled_at || m.result) await reverseMatch(db, m);
  }
  const ids = (matches ?? []).map((m) => m.id);
  if (ids.length) {
    const { data: bets } = await db.from("fanta_bets").select("user_id, stake, status").in("match_id", ids);
    for (const b of bets ?? []) if (b.status === "pending") await addBalance(db, b.user_id, b.stake);
  }
  const { error } = await db.from("fanta_bet_rounds").delete().eq("id", roundId);
  return { error: error?.message ?? null };
}

export async function addBetMatch(input: {
  roundId: string;
  homeTeamId: string;
  awayTeamId: string;
}): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  if (input.homeTeamId === input.awayTeamId) return { error: "Scegli due squadre diverse" };
  const db = createAdminClient();
  const { data: teams } = await db.from("fanta_teams").select("id, name").in("id", [input.homeTeamId, input.awayTeamId]);
  const nameById = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const homeName = nameById.get(input.homeTeamId);
  const awayName = nameById.get(input.awayTeamId);
  if (!homeName || !awayName) return { error: "Squadra non trovata" };

  const { error } = await db.from("fanta_bet_matches").insert({
    round_id: input.roundId,
    home_team: input.homeTeamId,
    away_team: input.awayTeamId,
    home_name: homeName,
    away_name: awayName,
    odd_1: FIXED_WIN_MULTIPLIER,
    odd_x: FIXED_WIN_MULTIPLIER,
    odd_2: FIXED_WIN_MULTIPLIER,
  });
  await refreshRoundStatus(db, input.roundId);
  return { error: error?.message ?? null };
}

// ─── Partite reali (football-data.org) ───────────────────────────────────────

// Cerca le partite di una competizione (per giornata o le prossime in programma).
export async function fetchFootballMatches(
  code: string,
  matchday?: number
): Promise<{ matches: ExtMatch[]; error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { matches: [], error: "Solo l'admin" };
  const res = await fetchCompetitionMatches(code, matchday);
  return res;
}

// Aggiunge alla giornata uno scontro su una partita reale (da provider o manuale).
export async function addExternalBetMatch(input: {
  roundId: string;
  homeName: string;
  awayName: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  competition?: string | null;
  eventId?: string | null;
  kickoff?: string | null;
}): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  const home = input.homeName.trim();
  const away = input.awayName.trim();
  if (!home || !away) return { error: "Inserisci entrambe le squadre" };
  const db = createAdminClient();
  const { error } = await db.from("fanta_bet_matches").insert({
    round_id: input.roundId,
    home_name: home,
    away_name: away,
    home_logo: input.homeLogo?.trim() || null,
    away_logo: input.awayLogo?.trim() || null,
    competition: input.competition?.trim() || null,
    ext_event_id: input.eventId?.trim() || null,
    kickoff: input.kickoff || null,
    odd_1: FIXED_WIN_MULTIPLIER,
    odd_x: FIXED_WIN_MULTIPLIER,
    odd_2: FIXED_WIN_MULTIPLIER,
  });
  if (error) {
    if (/home_logo|away_logo|competition|ext_event_id|kickoff|column|schema cache/i.test(error.message)) {
      return { error: "Colonne mancanti: esegui supabase-bet-external-migration.sql su Supabase." };
    }
    return { error: error.message };
  }
  await refreshRoundStatus(db, input.roundId);
  return { error: null };
}

// Aggiorna i risultati delle partite reali della giornata dal provider e salda le giocate.
export async function syncRoundResults(roundId: string): Promise<{ settled: number; error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { settled: 0, error: "Solo l'admin" };

  const db = createAdminClient();
  const { data: matches } = await db.from("fanta_bet_matches").select("*").eq("round_id", roundId);
  const pending = (matches ?? []).filter((m) => m.ext_event_id && !m.result);
  if (pending.length === 0) return { settled: 0, error: "Nessuna partita reale da aggiornare." };

  let settled = 0;
  let lastErr: string | null = null;
  for (const m of pending) {
    const r = await fetchMatchResult(m.ext_event_id as string);
    if (r.error) { lastErr = r.error; continue; }
    if (!r.finished || !r.result) continue;
    await settleMatch(db, m.id, r.result);
    await db.from("fanta_bet_matches").update({ result: r.result, settled_at: new Date().toISOString() }).eq("id", m.id);
    settled++;
  }
  await refreshRoundStatus(db, roundId);
  if (settled === 0) {
    return {
      settled: 0,
      error: lastErr ?? "football-data.org non ha ancora pubblicato i risultati finali. Puoi impostare il vincitore a mano con i tasti 1 / X / 2.",
    };
  }
  return { settled, error: null };
}

export async function deleteBetMatch(matchId: string): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  const db = createAdminClient();
  const { data: match } = await db.from("fanta_bet_matches").select("*").eq("id", matchId).maybeSingle();
  if (!match) return { error: "Scontro non trovato" };
  if (match.settled_at || match.result) await reverseMatch(db, match);
  // rimborsa le puntate pending
  const { data: bets } = await db.from("fanta_bets").select("user_id, stake, status").eq("match_id", matchId);
  for (const b of bets ?? []) if (b.status === "pending") await addBalance(db, b.user_id, b.stake);
  const roundId = match.round_id;
  const { error } = await db.from("fanta_bet_matches").delete().eq("id", matchId);
  await refreshRoundStatus(db, roundId);
  return { error: error?.message ?? null };
}

export async function adjustCredits(userId: string, delta: number): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  if (!Number.isInteger(delta) || delta === 0) return { error: "Valore non valido" };
  const db = createAdminClient();
  await addBalance(db, userId, delta);
  return { error: null };
}

// Cancella una singola giocata (es. piazzata per errore), stornando i crediti coinvolti.
export async function adminDeleteBet(betId: string): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  const db = createAdminClient();
  const { data: bet } = await db
    .from("fanta_bets")
    .select("user_id, stake, status, payout")
    .eq("id", betId)
    .maybeSingle();
  if (!bet) return { error: "Giocata non trovata" };
  // rimborsa la puntata se ancora in gioco; storna la vincita se era già stata pagata
  if (bet.status === "pending") await addBalance(db, bet.user_id, bet.stake);
  else if (bet.status === "won" && bet.payout) await addBalance(db, bet.user_id, -bet.payout);
  const { error } = await db.from("fanta_bets").delete().eq("id", betId);
  return { error: error?.message ?? null };
}
