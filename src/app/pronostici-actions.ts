"use server";

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";
import { getCurrentViewer, type Viewer } from "@/app/social-actions";
import {
  STARTING_CREDITS,
  FIXED_WIN_MULTIPLIER,
  calculateFixedPayout,
  calculateBetClosesAt,
  type ExtMatch,
} from "@/lib/bet-constants";
import { fetchCompetitionMatches, fetchMatchResult } from "@/lib/football-data";
import { evaluateSlipStatus } from "@/lib/bet-slip";
import {
  ensureAllPredictionDrafts,
  ensureAllPredictionDraftsIfStale,
  type AllPredictionDraftsResult,
} from "@/lib/all-prediction-drafts";

type Pick = "1" | "X" | "2";
type AdminClient = ReturnType<typeof createAdminClient>;

// ─── Tipi esposti al client ─────────────────────────────────────────────────

export interface BetSlip {
  id: string;
  stake: number;
  status: "pending" | "won" | "lost";
  payout: number;
  picks: Record<string, Pick>;
}

export interface AdminSlip extends BetSlip {
  userId: string;
  name: string;
  logo: string;
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
}

export interface BetRound {
  id: string;
  day: number;
  title: string | null;
  status: "draft" | "open" | "closed" | "settled";
  closesAt: string | null;
  createdAt: string;
  matches: BetMatch[];
  mySlip: BetSlip | null;
  slipCount: number;
  slips?: AdminSlip[];
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

  const roundIds = (rounds ?? []).map((round) => round.id);
  const allSlips = roundIds.length
    ? (await db
        .from("fanta_bet_slips")
        .select("id, round_id, user_id, stake, status, payout, created_at")
        .in("round_id", roundIds)).data
    : [];
  const slipIds = (allSlips ?? []).map((slip) => slip.id);
  const allPicks = slipIds.length
    ? (await db
        .from("fanta_bet_slip_picks")
        .select("slip_id, match_id, pick")
        .in("slip_id", slipIds)).data
    : [];

  const picksBySlip = new Map<string, Record<string, Pick>>();
  for (const pick of allPicks ?? []) {
    const picks = picksBySlip.get(pick.slip_id) ?? {};
    picks[pick.match_id] = pick.pick;
    picksBySlip.set(pick.slip_id, picks);
  }

  const mySlipByRound = new Map<string, BetSlip>();
  const adminSlipsByRound = new Map<string, AdminSlip[]>();
  const slipCountByRound = new Map<string, number>();
  for (const slip of allSlips ?? []) {
    const base: BetSlip = {
      id: slip.id,
      stake: slip.stake,
      status: slip.status,
      payout: slip.payout,
      picks: picksBySlip.get(slip.id) ?? {},
    };
    slipCountByRound.set(slip.round_id, (slipCountByRound.get(slip.round_id) ?? 0) + 1);
    if (slip.user_id === viewer.userId) mySlipByRound.set(slip.round_id, base);
    if (viewer.isAdmin) {
      const list = adminSlipsByRound.get(slip.round_id) ?? [];
      list.push({
        ...base,
        userId: slip.user_id,
        name: nameByUser.get(slip.user_id) ?? "Manager",
        logo: logoByUser.get(slip.user_id) ?? "⚽",
      });
      adminSlipsByRound.set(slip.round_id, list);
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
    });
    matchesByRound.set(m.round_id, list);
  }

  const firstKickoffByRound = new Map<string, string>();
  const firstKickoffByDay = new Map<number, string>();
  const dayByRound = new Map((rounds ?? []).map((round) => [round.id, round.day]));
  for (const match of matches ?? []) {
    if (!match.kickoff) continue;
    const currentRound = firstKickoffByRound.get(match.round_id);
    if (!currentRound || match.kickoff < currentRound) firstKickoffByRound.set(match.round_id, match.kickoff);
    const day = dayByRound.get(match.round_id);
    if (day === undefined) continue;
    const currentDay = firstKickoffByDay.get(day);
    if (!currentDay || match.kickoff < currentDay) firstKickoffByDay.set(day, match.kickoff);
  }

  const roundList: BetRound[] = (rounds ?? [])
    .filter((round) => viewer.isAdmin || round.status !== "draft")
    .map((r) => {
      const closesAt = r.closes_at ?? calculateBetClosesAt([
        firstKickoffByRound.get(r.id) ?? firstKickoffByDay.get(r.day),
      ]);
      const status = r.status === "open" && closesAt && Date.parse(closesAt) <= Date.now()
        ? "closed"
        : r.status;
      return {
        id: r.id,
        day: r.day,
        title: r.title,
        status,
        closesAt,
        createdAt: r.created_at,
        matches: matchesByRound.get(r.id) ?? [],
        mySlip: mySlipByRound.get(r.id) ?? null,
        slipCount: slipCountByRound.get(r.id) ?? 0,
        slips: viewer.isAdmin ? (adminSlipsByRound.get(r.id) ?? []) : undefined,
      };
    });

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

export async function placeBetSlip(
  roundId: string,
  picks: Array<{ matchId: string; pick: Pick }>,
  stake: number,
): Promise<{ error: string | null; balance?: number }> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { error: "Non autenticato" };
  if (viewer.isAdmin) return { error: "L'admin non può scommettere" };
  if (!viewer.hasProfile) return { error: "Completa prima il tuo profilo squadra" };
  if (!Number.isInteger(stake) || stake <= 0) return { error: "Puntata non valida" };
  if (!Array.isArray(picks) || picks.length === 0) return { error: "Completa la schedina" };
  if (picks.some((item) => !item.matchId || !["1", "X", "2"].includes(item.pick))) {
    return { error: "La schedina contiene un esito non valido" };
  }

  const db = createAdminClient();
  const balance = await getBalance(db, viewer.userId);
  if (balance < stake) return { error: `Crediti insufficienti (hai ${balance})` };
  const accountKey = await creditAccountKey(db, viewer.userId);
  const { error } = await db.rpc("place_fanta_bet_slip", {
    p_round_id: roundId,
    p_user_id: viewer.userId,
    p_account_key: accountKey,
    p_stake: stake,
    p_picks: picks.map((item) => ({ match_id: item.matchId, pick: item.pick })),
  });
  if (error) {
    console.error("[pronostici] Salvataggio schedina fallito", error);
    if (/duplicate|unique|fanta_bet_slips_round_id_user_id/i.test(error.message)) {
      return { error: "Hai già piazzato la schedina per questa giornata" };
    }
    if (/tempo scaduto|chiuse|scadenza|completa|selezioni|crediti insufficienti|giornata non trovata/i.test(error.message)) {
      return { error: error.message };
    }
    return { error: "Non è stato possibile registrare la schedina. Riprova." };
  }

  return { error: null, balance: balance - stake };
}

// ─── Settlement (admin) ──────────────────────────────────────────────────────

async function recalculateRoundSlips(db: AdminClient, roundId: string): Promise<void> {
  const [{ data: matches }, { data: slips }] = await Promise.all([
    db.from("fanta_bet_matches").select("id, result").eq("round_id", roundId),
    db.from("fanta_bet_slips").select("id, user_id, stake, status, payout").eq("round_id", roundId),
  ]);
  const matchList = matches ?? [];
  const slipList = slips ?? [];
  if (matchList.length === 0 || slipList.length === 0) return;

  const slipIds = slipList.map((slip) => slip.id);
  const { data: picks } = await db
    .from("fanta_bet_slip_picks")
    .select("slip_id, match_id, pick")
    .in("slip_id", slipIds);
  const picksBySlip = new Map<string, Record<string, Pick>>();
  for (const pick of picks ?? []) {
    const slipPicks = picksBySlip.get(pick.slip_id) ?? {};
    slipPicks[pick.match_id] = pick.pick;
    picksBySlip.set(pick.slip_id, slipPicks);
  }

  for (const slip of slipList) {
    const slipPicks = picksBySlip.get(slip.id) ?? {};
    const nextStatus = evaluateSlipStatus(matchList, slipPicks);
    const nextPayout = nextStatus === "won" ? calculateFixedPayout(slip.stake) : 0;

    if (slip.status === "won" && slip.payout > 0) await addBalance(db, slip.user_id, -slip.payout);
    if (nextStatus === "won") await addBalance(db, slip.user_id, nextPayout);
    await db.from("fanta_bet_slips").update({ status: nextStatus, payout: nextPayout }).eq("id", slip.id);
  }
}

export async function setMatchResult(matchId: string, result: Pick | null): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  if (result !== null && !["1", "X", "2"].includes(result)) return { error: "Esito non valido" };

  const db = createAdminClient();
  const { data: match } = await db.from("fanta_bet_matches").select("*").eq("id", matchId).maybeSingle();
  if (!match) return { error: "Scontro non trovato" };

  const { error } = await db.from("fanta_bet_matches").update({
    result,
    settled_at: result ? new Date().toISOString() : null,
  }).eq("id", matchId);
  if (error) return { error: error.message };
  await recalculateRoundSlips(db, match.round_id);
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
  if (status === "open") {
    const { data: round } = await db.from("fanta_bet_rounds").select("closes_at").eq("id", roundId).maybeSingle();
    if (!round?.closes_at) return { error: "Impossibile pubblicare: scadenza schedina non disponibile" };
    if (Date.parse(round.closes_at) <= Date.now()) return { error: "La scadenza delle schedine è già trascorsa" };
  }
  const { error } = await db.from("fanta_bet_rounds").update({ status }).eq("id", roundId);
  return { error: error?.message ?? null };
}

async function refundAndDeleteRoundSlips(db: AdminClient, roundId: string): Promise<void> {
  const { data: slips } = await db
    .from("fanta_bet_slips")
    .select("id, user_id, stake, status, payout")
    .eq("round_id", roundId);
  for (const slip of slips ?? []) {
    const delta = slip.stake - (slip.status === "won" ? slip.payout : 0);
    if (delta) await addBalance(db, slip.user_id, delta);
  }
  await db.from("fanta_bet_slips").delete().eq("round_id", roundId);
}

async function roundHasSlips(db: AdminClient, roundId: string): Promise<boolean> {
  const { count } = await db
    .from("fanta_bet_slips")
    .select("id", { count: "exact", head: true })
    .eq("round_id", roundId);
  return (count ?? 0) > 0;
}

async function refreshRoundClosingAt(db: AdminClient, roundId: string): Promise<void> {
  const { data: matches } = await db.from("fanta_bet_matches").select("kickoff").eq("round_id", roundId);
  const closesAt = calculateBetClosesAt((matches ?? []).map((match) => match.kickoff));
  if (closesAt) await db.from("fanta_bet_rounds").update({ closes_at: closesAt }).eq("id", roundId);
}

export async function deleteBetRound(roundId: string): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  const db = createAdminClient();
  await refundAndDeleteRoundSlips(db, roundId);
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
  if (await roundHasSlips(db, input.roundId)) return { error: "Non puoi modificare gli incontri dopo la prima schedina" };
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
  if (await roundHasSlips(db, input.roundId)) return { error: "Non puoi modificare gli incontri dopo la prima schedina" };
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
  await refreshRoundClosingAt(db, input.roundId);
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
    await db.from("fanta_bet_matches").update({ result: r.result, settled_at: new Date().toISOString() }).eq("id", m.id);
    settled++;
  }
  if (settled > 0) await recalculateRoundSlips(db, roundId);
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
  const roundId = match.round_id;
  await refundAndDeleteRoundSlips(db, roundId);
  const { error } = await db.from("fanta_bet_matches").delete().eq("id", matchId);
  await refreshRoundClosingAt(db, roundId);
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

// Cancella una schedina e ripristina il saldo come se non fosse mai stata piazzata.
export async function adminDeleteBetSlip(slipId: string): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  const db = createAdminClient();
  const { data: slip } = await db
    .from("fanta_bet_slips")
    .select("user_id, stake, status, payout")
    .eq("id", slipId)
    .maybeSingle();
  if (!slip) return { error: "Schedina non trovata" };
  const delta = slip.stake - (slip.status === "won" ? slip.payout : 0);
  if (delta) await addBalance(db, slip.user_id, delta);
  const { error } = await db.from("fanta_bet_slips").delete().eq("id", slipId);
  return { error: error?.message ?? null };
}
