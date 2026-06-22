"use server";

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase-server";
import { getCurrentViewer, type Viewer } from "@/app/social-actions";
import { STARTING_CREDITS, REWARD_WIN, REWARD_DRAW, REWARD_LOSS } from "@/lib/bet-constants";

type Pick = "1" | "X" | "2";
type AdminClient = ReturnType<typeof createAdminClient>;

// ─── Tipi esposti al client ─────────────────────────────────────────────────

export interface MyBet {
  pick: Pick;
  stake: number;
  odd: number;
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
  odd: number;
  status: "pending" | "won" | "lost";
  payout: number;
}

export interface BetMatch {
  id: string;
  homeName: string;
  awayName: string;
  homeLogo: string;
  awayLogo: string;
  odd1: number;
  oddX: number;
  odd2: number;
  result: Pick | null;
  myBet: MyBet | null;
  betCount: number;
  bets?: AdminBet[]; // popolato solo per l'admin
}

export interface BetRound {
  id: string;
  day: number;
  title: string | null;
  status: "open" | "closed" | "settled";
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
}

// ─── Helper crediti ──────────────────────────────────────────────────────────

async function getBalance(db: AdminClient, userId: string): Promise<number> {
  const { data } = await db.from("fanta_credits").select("balance").eq("user_id", userId).maybeSingle();
  if (data) return data.balance;
  await db.from("fanta_credits").insert({ user_id: userId, balance: STARTING_CREDITS });
  return STARTING_CREDITS;
}

async function addBalance(db: AdminClient, userId: string, delta: number): Promise<void> {
  if (!delta) return;
  const bal = await getBalance(db, userId);
  await db
    .from("fanta_credits")
    .update({ balance: Math.max(0, bal + delta), updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

async function teamManager(db: AdminClient, teamId: string | null): Promise<string | null> {
  if (!teamId) return null;
  const { data } = await db.from("fanta_profiles").select("user_id").eq("team_ref", teamId).maybeSingle();
  return data?.user_id ?? null;
}

function oddFor(match: { odd_1: number; odd_x: number; odd_2: number }, pick: Pick): number {
  return pick === "1" ? match.odd_1 : pick === "X" ? match.odd_x : match.odd_2;
}

// ─── Lettura: centro scommesse ───────────────────────────────────────────────

export async function fetchBetCenter(): Promise<BetCenter> {
  const empty: BetCenter = { viewer: null, balance: 0, rounds: [], leaderboard: [] };
  if (!isSupabaseConfigured()) return empty;

  const viewer = await getCurrentViewer();
  if (!viewer) return empty;

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
        .select("id, match_id, user_id, pick, stake, odd, status, payout")
        .in("match_id", matchIds)).data
    : [];

  const myBetByMatch = new Map<string, MyBet>();
  const countByMatch = new Map<string, number>();
  const adminBetsByMatch = new Map<string, AdminBet[]>();
  for (const b of allBets ?? []) {
    countByMatch.set(b.match_id, (countByMatch.get(b.match_id) ?? 0) + 1);
    if (b.user_id === viewer.userId) {
      myBetByMatch.set(b.match_id, { pick: b.pick, stake: b.stake, odd: Number(b.odd), status: b.status, payout: b.payout });
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
        odd: Number(b.odd),
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
      homeLogo: (m.home_team && logoByTeam.get(m.home_team)) || "⚽",
      awayLogo: (m.away_team && logoByTeam.get(m.away_team)) || "⚽",
      odd1: Number(m.odd_1),
      oddX: Number(m.odd_x),
      odd2: Number(m.odd_2),
      result: m.result,
      myBet: myBetByMatch.get(m.id) ?? null,
      betCount: countByMatch.get(m.id) ?? 0,
      bets: viewer.isAdmin ? (adminBetsByMatch.get(m.id) ?? []) : undefined,
    });
    matchesByRound.set(m.round_id, list);
  }

  const roundList: BetRound[] = (rounds ?? []).map((r) => ({
    id: r.id,
    day: r.day,
    title: r.title,
    status: r.status,
    createdAt: r.created_at,
    matches: matchesByRound.get(r.id) ?? [],
  }));

  // classifica crediti — solo manager con una squadra assegnata
  // (l'admin ha un profilo senza team_ref e non è in gara)
  const balByUser = new Map<string, number>();
  for (const c of credits ?? []) balByUser.set(c.user_id, c.balance);

  const leaderboard: CreditRow[] = (profiles ?? [])
    .filter((p) => !!p.team_ref)
    .map((p) => ({
      userId: p.user_id,
      name: p.team_name || p.first_name || "Manager",
      logo: (p.team_ref && logoByTeam.get(p.team_ref)) || p.logo || "⚽",
      balance: balByUser.get(p.user_id) ?? STARTING_CREDITS,
      mine: p.user_id === viewer.userId,
    }))
    .sort((a, b) => b.balance - a.balance);

  return { viewer, balance, rounds: roundList, leaderboard };
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

  // crediti spendibili = saldo attuale + eventuale puntata già piazzata su questo scontro (la rimpiazziamo)
  const balance = await getBalance(db, viewer.userId);
  const { data: existing } = await db
    .from("fanta_bets")
    .select("id, stake, status")
    .eq("match_id", matchId)
    .eq("user_id", viewer.userId)
    .maybeSingle();

  const refundable = existing && existing.status === "pending" ? existing.stake : 0;
  const spendable = balance + refundable;
  if (spendable < stake) return { error: `Crediti insufficienti (hai ${balance})` };

  const odd = Number(oddFor(match, pick));
  const newBalance = spendable - stake;
  await db
    .from("fanta_credits")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("user_id", viewer.userId);

  if (existing) {
    await db.from("fanta_bets").update({ pick, stake, odd, status: "pending", payout: 0 }).eq("id", existing.id);
  } else {
    await db.from("fanta_bets").insert({ match_id: matchId, user_id: viewer.userId, pick, stake, odd });
  }

  return { error: null, balance: newBalance };
}

export async function cancelBet(matchId: string): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer) return { error: "Non autenticato" };

  const db = createAdminClient();
  const { data: match } = await db.from("fanta_bet_matches").select("round_id, result").eq("id", matchId).maybeSingle();
  if (!match || match.result) return { error: "Non puoi più annullare" };
  const { data: round } = await db.from("fanta_bet_rounds").select("status").eq("id", match.round_id).maybeSingle();
  if (round?.status !== "open") return { error: "Scommesse chiuse" };

  const { data: bet } = await db
    .from("fanta_bets")
    .select("id, stake, status")
    .eq("match_id", matchId)
    .eq("user_id", viewer.userId)
    .maybeSingle();
  if (!bet) return { error: "Nessuna scommessa da annullare" };
  if (bet.status === "pending") await addBalance(db, viewer.userId, bet.stake);
  await db.from("fanta_bets").delete().eq("id", bet.id);
  return { error: null };
}

// ─── Settlement (admin) ──────────────────────────────────────────────────────

function rewardFor(result: Pick, side: "home" | "away"): number {
  if (result === "X") return REWARD_DRAW;
  const winner = result === "1" ? "home" : "away";
  return side === winner ? REWARD_WIN : REWARD_LOSS;
}

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
  // annulla bonus partecipazione
  const homeMgr = await teamManager(db, match.home_team);
  const awayMgr = await teamManager(db, match.away_team);
  if (homeMgr) await addBalance(db, homeMgr, -rewardFor(match.result, "home"));
  if (awayMgr) await addBalance(db, awayMgr, -rewardFor(match.result, "away"));
}

async function settleMatch(db: AdminClient, matchId: string, result: Pick): Promise<void> {
  const { data: bets } = await db.from("fanta_bets").select("*").eq("match_id", matchId);
  for (const b of bets ?? []) {
    if (b.status !== "pending" && b.status !== "won" && b.status !== "lost") continue;
    if (b.pick === result) {
      const payout = Math.round(b.stake * Number(b.odd));
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
  // bonus partecipazione alla giornata
  const homeMgr = await teamManager(db, match.home_team);
  const awayMgr = await teamManager(db, match.away_team);
  if (homeMgr) await addBalance(db, homeMgr, rewardFor(result, "home"));
  if (awayMgr) await addBalance(db, awayMgr, rewardFor(result, "away"));

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
  const { error } = await db.from("fanta_bet_rounds").insert({ day, title: title.trim() || null });
  return { error: error?.message ?? null };
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
  odd1: number;
  oddX: number;
  odd2: number;
}): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  if (input.homeTeamId === input.awayTeamId) return { error: "Scegli due squadre diverse" };
  for (const o of [input.odd1, input.oddX, input.odd2]) {
    if (!Number.isFinite(o) || o < 1) return { error: "Quote non valide (minimo 1.00)" };
  }

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
    odd_1: input.odd1,
    odd_x: input.oddX,
    odd_2: input.odd2,
  });
  await refreshRoundStatus(db, input.roundId);
  return { error: error?.message ?? null };
}

export async function updateMatchOdds(matchId: string, odd1: number, oddX: number, odd2: number): Promise<{ error: string | null }> {
  const viewer = await getCurrentViewer();
  if (!viewer?.isAdmin) return { error: "Solo l'admin" };
  for (const o of [odd1, oddX, odd2]) if (!Number.isFinite(o) || o < 1) return { error: "Quote non valide" };
  const db = createAdminClient();
  const { data: match } = await db.from("fanta_bet_matches").select("result").eq("id", matchId).maybeSingle();
  if (match?.result) return { error: "Scontro già concluso" };
  const { error } = await db.from("fanta_bet_matches").update({ odd_1: odd1, odd_x: oddX, odd_2: odd2 }).eq("id", matchId);
  return { error: error?.message ?? null };
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
