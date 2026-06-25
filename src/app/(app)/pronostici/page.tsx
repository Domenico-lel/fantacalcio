"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchBetCenter, placeBet, cancelBet, setMatchResult,
  createBetRound, setRoundStatus, deleteBetRound, addBetMatch, deleteBetMatch, adjustCredits,
  updateMatchOdds, adminDeleteBet,
  type BetCenter, type BetRound, type BetMatch, type CreditRow,
} from "@/app/pronostici-actions";
import { fetchTeams, type Team } from "@/app/teams-actions";
import { STARTING_CREDITS } from "@/lib/bet-constants";
import { isImageAvatar } from "@/lib/avatar";
import SegmentedTabs from "@/components/SegmentedTabs";

type Pick = "1" | "X" | "2";
type TabKey = "bet" | "rank" | "admin";

const PICK_LABELS: Record<Pick, string> = { "1": "1", X: "X", "2": "2" };
// Significato del segno, per evitare che "1 · 3 cr" si legga come un risultato (1-3)
const PICK_NAME: Record<Pick, string> = { "1": "Casa", X: "Pareggio", "2": "Ospite" };

function Avatar({ src, size }: { src: string; size: number }) {
  if (isImageAvatar(src)) {
    return <img src={src} alt="" className="rounded-full object-cover flex-none" style={{ width: size, height: size }} />;
  }
  return <span className="flex-none leading-none" style={{ fontSize: size * 0.85 }}>{src}</span>;
}

function fmtOdd(o: number) {
  return o.toFixed(2);
}

export default function PronosticiPage() {
  const [tab, setTab] = useState<TabKey>("bet");
  const [data, setData] = useState<BetCenter | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await fetchBetCenter();
      setData(d);
    } catch {
      // network/server error — lascia data null
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const isAdmin = !!data?.viewer?.isAdmin;

  return (
    <div className="screen sec-bet">
      <div className="sec-header px-4 pt-12 pb-3 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent-soft)" }}>La lega</p>
            <h1 className="text-white font-bold text-2xl leading-tight">Pronostici</h1>
          </div>
          {!isAdmin && (
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Crediti</p>
              <p className="font-black text-2xl leading-none" style={{ color: "var(--accent)" }}>
                {loading ? "—" : data?.balance ?? 0}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3">
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            items={[
              { key: "bet" as TabKey, label: "Scommetti" },
              { key: "rank" as TabKey, label: "Classifica" },
              ...(isAdmin ? [{ key: "admin" as TabKey, label: "Gestione" }] : []),
            ]}
          />
        </div>
      </div>

      {tab === "bet" && <BetTab data={data} loading={loading} reload={load} />}
      {tab === "rank" && <RankTab leaderboard={data?.leaderboard ?? []} loading={loading} />}
      {tab === "admin" && isAdmin && <AdminTab rounds={data?.rounds ?? []} leaderboard={data?.leaderboard ?? []} reload={load} />}
    </div>
  );
}

/* ─── TAB SCOMMETTI ─────────────────────────────────────────────────────── */

function BetTab({ data, loading, reload }: { data: BetCenter | null; loading: boolean; reload: () => Promise<void> }) {
  const rounds = data?.rounds ?? [];
  const canBet = !!data?.viewer && !data.viewer.isAdmin && data.viewer.hasProfile;

  return (
    <div className="px-4 py-4 flex flex-col gap-5">
      {!loading && data?.viewer && !data.viewer.isAdmin && !data.viewer.hasProfile && (
        <p className="rounded-xl px-3 py-2.5 text-sm text-white/70" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>
          Completa il tuo profilo squadra per poter scommettere.
        </p>
      )}

      {loading && Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-2xl animate-pulse" style={{ height: 140, background: "rgba(255,255,255,0.05)" }} />
      ))}

      {!loading && rounds.length === 0 && (
        <div className="flex flex-col items-center py-20 gap-3">
          <span className="text-5xl">🎟️</span>
          <p className="text-white/50 text-sm text-center">Nessuna giornata aperta. Torna più tardi.</p>
        </div>
      )}

      {rounds.map((r) => (
        <div key={r.id} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">Giornata {r.day}{r.title ? ` · ${r.title}` : ""}</span>
            <RoundBadge status={r.status} />
          </div>
          {r.matches.length === 0 && <p className="text-white/35 text-xs">Nessuno scontro inserito.</p>}
          {r.matches.map((m) => (
            <MatchBetCard key={m.id} match={m} roundStatus={r.status} canBet={canBet} balance={data?.balance ?? 0} reload={reload} />
          ))}
        </div>
      ))}
      <div className="h-4" />
    </div>
  );
}

function RoundBadge({ status }: { status: BetRound["status"] }) {
  const map = {
    open: { label: "Aperta", color: "#34d399" },
    closed: { label: "Chiusa", color: "#f0a43a" },
    settled: { label: "Conclusa", color: "#857cf0" },
  }[status];
  return (
    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
      style={{ background: `${map.color}26`, color: map.color }}>{map.label}</span>
  );
}

function MatchBetCard({ match, roundStatus, canBet, balance, reload }: {
  match: BetMatch; roundStatus: BetRound["status"]; canBet: boolean; balance: number; reload: () => Promise<void>;
}) {
  const [pick, setPick] = useState<Pick | null>(match.myBet?.pick ?? null);
  const [stake, setStake] = useState<string>(match.myBet ? String(match.myBet.stake) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const locked = !!match.result || roundStatus !== "open" || !canBet;
  const stakeNum = parseInt(stake || "0", 10);
  const odd = pick === "1" ? match.odd1 : pick === "X" ? match.oddX : pick === "2" ? match.odd2 : 0;
  const potential = pick && stakeNum > 0 ? Math.round(stakeNum * odd) : 0;

  async function submit() {
    if (!pick) { setError("Scegli un esito"); return; }
    if (!Number.isInteger(stakeNum) || stakeNum <= 0) { setError("Inserisci una puntata"); return; }
    setBusy(true); setError("");
    const res = await placeBet(match.id, pick, stakeNum);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    await reload();
  }

  async function cancel() {
    setBusy(true); setError("");
    const res = await cancelBet(match.id);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setPick(null); setStake("");
    await reload();
  }

  const odds: Record<Pick, number> = { "1": match.odd1, X: match.oddX, "2": match.odd2 };

  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>
      {/* squadre */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar src={match.homeLogo} size={30} />
          <span className="text-white text-sm font-semibold truncate">{match.homeName}</span>
        </div>
        <span className="text-white/30 text-[11px] font-bold flex-none px-1">VS</span>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-white text-sm font-semibold truncate text-right">{match.awayName}</span>
          <Avatar src={match.awayLogo} size={30} />
        </div>
      </div>

      {/* esiti / quote */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {(["1", "X", "2"] as Pick[]).map((p) => {
          const isResult = match.result === p;
          const isPicked = pick === p;
          const active = isPicked && !match.result;
          return (
            <button key={p} disabled={locked} onClick={() => setPick(p)}
              className="flex flex-col items-center py-2 rounded-xl transition-all active:scale-95 disabled:cursor-default"
              style={{
                background: isResult ? "var(--accent)" : active ? "rgba(240,164,58,0.18)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${isResult ? "var(--accent)" : active ? "var(--accent)" : "rgba(255,255,255,0.1)"}`,
                opacity: locked && !isResult && !isPicked ? 0.55 : 1,
              }}>
              <span className="text-[11px] font-bold" style={{ color: isResult ? "var(--accent-ink)" : "rgba(255,255,255,0.55)" }}>{PICK_LABELS[p]}</span>
              <span className="text-sm font-black" style={{ color: isResult ? "var(--accent-ink)" : "#fff" }}>{fmtOdd(odds[p])}</span>
            </button>
          );
        })}
      </div>

      {/* mia giocata già piazzata */}
      {match.myBet && (
        <div className="mt-3 flex items-center justify-between rounded-xl px-3 py-2"
          style={{
            background: match.myBet.status === "won" ? "rgba(52,211,153,0.12)" : match.myBet.status === "lost" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)",
            border: "1px solid var(--border)",
          }}>
          <span className="text-xs text-white/70">
            Giocata: <b className="text-white">{PICK_LABELS[match.myBet.pick]}</b>
            <span className="text-white/45"> ({PICK_NAME[match.myBet.pick]})</span> · {match.myBet.stake} cr @ quota {fmtOdd(match.myBet.odd)}
          </span>
          {match.myBet.status === "won" && <span className="text-emerald-400 text-xs font-bold">Vinta +{match.myBet.payout}</span>}
          {match.myBet.status === "lost" && <span className="text-red-400 text-xs font-bold">Persa</span>}
          {match.myBet.status === "pending" && <span className="text-white/50 text-xs">poss. {Math.round(match.myBet.stake * match.myBet.odd)}</span>}
        </div>
      )}

      {/* form puntata */}
      {!locked && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number" inputMode="numeric" min={1} value={stake}
            onChange={(e) => setStake(e.target.value)} placeholder="Crediti"
            className="w-24 rounded-xl px-3 py-2 text-white text-sm outline-none focus:ring-2"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }} />
          <button onClick={submit} disabled={busy || !pick || stakeNum <= 0}
            className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
            style={{ background: "var(--accent-grad)", color: "var(--accent-ink)", boxShadow: "0 0 14px var(--accent-glow)" }}>
            {busy ? "…" : match.myBet ? `Modifica${potential ? ` · vinci ${potential}` : ""}` : `Punta${potential ? ` · vinci ${potential}` : ""}`}
          </button>
          {match.myBet && (
            <button onClick={cancel} disabled={busy} className="px-3 py-2 rounded-xl text-xs text-red-400/80"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>✕</button>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      {match.betCount > 0 && <p className="text-white/30 text-[10px] mt-2">{match.betCount} giocate</p>}
    </div>
  );
}

/* ─── TAB CLASSIFICA ────────────────────────────────────────────────────── */

function RankTab({ leaderboard, loading }: { leaderboard: CreditRow[]; loading: boolean }) {
  return (
    <div className="px-4 py-4 flex flex-col gap-2">
      <p className="text-white/40 text-xs mb-1">Saldo crediti dei manager. Si parte da {STARTING_CREDITS} crediti; si guadagna e si perde scommettendo sulle giornate.</p>
      {loading && Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl animate-pulse" style={{ height: 56, background: "rgba(255,255,255,0.05)" }} />
      ))}
      {!loading && leaderboard.length === 0 && <p className="text-white/50 text-sm text-center py-10">Nessun manager.</p>}
      {leaderboard.map((row, i) => (
        <div key={row.userId} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{
            background: row.mine ? "rgba(240,164,58,0.1)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${row.mine ? "rgba(240,164,58,0.3)" : "var(--border)"}`,
          }}>
          <span className="w-6 text-center font-black text-sm" style={{ color: i < 3 ? "var(--accent)" : "rgba(255,255,255,0.4)" }}>{i + 1}</span>
          <Avatar src={row.logo} size={30} />
          <span className="flex-1 min-w-0 truncate text-white text-sm font-semibold">{row.name}</span>
          <span className="font-black text-sm" style={{ color: "var(--accent)" }}>{row.balance}</span>
        </div>
      ))}
      <div className="h-4" />
    </div>
  );
}

/* ─── TAB GESTIONE (admin) ──────────────────────────────────────────────── */

function AdminTab({ rounds, leaderboard, reload }: { rounds: BetRound[]; leaderboard: CreditRow[]; reload: () => Promise<void> }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [day, setDay] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchTeams().then(setTeams); }, []);

  async function create() {
    const d = parseInt(day, 10);
    if (!d) { setMsg("Inserisci la giornata"); return; }
    setBusy(true); setMsg("");
    const res = await createBetRound(d, title);
    setBusy(false);
    if (res.error) { setMsg(res.error); return; }
    setDay(""); setTitle("");
    await reload();
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {/* crea giornata */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--accent)" }}>Nuova giornata</p>
        <div className="flex gap-2">
          <input type="number" value={day} onChange={(e) => setDay(e.target.value)} placeholder="Giornata"
            className="w-24 rounded-xl px-3 py-2 text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo (facoltativo)"
            className="flex-1 rounded-xl px-3 py-2 text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }} />
          <button onClick={create} disabled={busy} className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--accent-grad)", color: "var(--accent-ink)", boxShadow: "0 0 14px var(--accent-glow)" }}>+</button>
        </div>
        {msg && <p className="text-white/60 text-xs mt-2">{msg}</p>}
      </div>

      {rounds.map((r) => <AdminRoundCard key={r.id} round={r} teams={teams} reload={reload} />)}

      {/* crediti manuali */}
      <AdminCreditsCard leaderboard={leaderboard} reload={reload} />
      <div className="h-4" />
    </div>
  );
}

function AdminRoundCard({ round, teams, reload }: { round: BetRound; teams: Team[]; reload: () => Promise<void> }) {
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [o1, setO1] = useState("2.00");
  const [ox, setOx] = useState("3.00");
  const [o2, setO2] = useState("2.00");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function add() {
    if (!home || !away) { setErr("Scegli le due squadre"); return; }
    setBusy(true); setErr("");
    const res = await addBetMatch({
      roundId: round.id, homeTeamId: home, awayTeamId: away,
      odd1: parseFloat(o1), oddX: parseFloat(ox), odd2: parseFloat(o2),
    });
    setBusy(false);
    if (res.error) { setErr(res.error); return; }
    setHome(""); setAway("");
    await reload();
  }

  const selStyle = { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" };

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm">Giornata {round.day}{round.title ? ` · ${round.title}` : ""}</span>
          <RoundBadge status={round.status} />
        </div>
        <div className="flex items-center gap-1.5">
          {round.status !== "settled" && (
            <button onClick={async () => { await setRoundStatus(round.id, round.status === "open" ? "closed" : "open"); await reload(); }}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white/70" style={selStyle}>
              {round.status === "open" ? "Chiudi" : "Riapri"}
            </button>
          )}
          <button onClick={async () => { if (confirm("Eliminare la giornata e rimborsare le giocate?")) { await deleteBetRound(round.id); await reload(); } }}
            className="px-2 py-1.5 rounded-lg text-[11px] text-red-400/80" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>🗑️</button>
        </div>
      </div>

      {/* scontri esistenti */}
      {round.matches.map((m) => <AdminMatchRow key={m.id} match={m} reload={reload} />)}

      {/* nuovo scontro */}
      <div className="rounded-xl px-3 py-3 flex flex-col gap-2" style={{ background: "rgba(240,164,58,0.06)", border: "1px solid rgba(240,164,58,0.2)" }}>
        <div className="flex gap-2">
          <select value={home} onChange={(e) => setHome(e.target.value)} className="flex-1 min-w-0 rounded-lg px-2 py-2 text-white text-xs outline-none" style={selStyle}>
            <option value="" style={{ background: "#141d33" }}>Casa…</option>
            {teams.map((t) => <option key={t.id} value={t.id} style={{ background: "#141d33" }}>{t.name}</option>)}
          </select>
          <select value={away} onChange={(e) => setAway(e.target.value)} className="flex-1 min-w-0 rounded-lg px-2 py-2 text-white text-xs outline-none" style={selStyle}>
            <option value="" style={{ background: "#141d33" }}>Ospite…</option>
            {teams.map((t) => <option key={t.id} value={t.id} style={{ background: "#141d33" }}>{t.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <input value={o1} onChange={(e) => setO1(e.target.value)} placeholder="1" className="w-full rounded-lg px-2 py-2 text-white text-xs outline-none text-center" style={selStyle} />
          <input value={ox} onChange={(e) => setOx(e.target.value)} placeholder="X" className="w-full rounded-lg px-2 py-2 text-white text-xs outline-none text-center" style={selStyle} />
          <input value={o2} onChange={(e) => setO2(e.target.value)} placeholder="2" className="w-full rounded-lg px-2 py-2 text-white text-xs outline-none text-center" style={selStyle} />
          <button onClick={add} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50" style={{ background: "var(--accent-grad)", color: "var(--accent-ink)", boxShadow: "0 0 14px var(--accent-glow)" }}>+</button>
        </div>
        {err && <p className="text-red-400 text-xs">{err}</p>}
      </div>
    </div>
  );
}

function AdminMatchRow({ match: m, reload }: { match: BetMatch; reload: () => Promise<void> }) {
  const selStyle = { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" };
  const [editOdds, setEditOdds] = useState(false);
  const [o1, setO1] = useState(m.odd1.toFixed(2));
  const [ox, setOx] = useState(m.oddX.toFixed(2));
  const [o2, setO2] = useState(m.odd2.toFixed(2));
  const [err, setErr] = useState("");

  async function saveOdds() {
    const res = await updateMatchOdds(m.id, parseFloat(o1), parseFloat(ox), parseFloat(o2));
    if (res.error) { setErr(res.error); return; }
    setErr(""); setEditOdds(false);
    await reload();
  }

  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-white text-xs font-semibold truncate flex-1">{m.homeName} <span className="text-white/30">vs</span> {m.awayName}</span>
        <button
          onClick={() => { setO1(m.odd1.toFixed(2)); setOx(m.oddX.toFixed(2)); setO2(m.odd2.toFixed(2)); setEditOdds((v) => !v); setErr(""); }}
          disabled={!!m.result}
          className="text-white/40 text-[10px] flex-none disabled:opacity-40"
          title={m.result ? "Scontro concluso" : "Modifica quote"}>
          {fmtOdd(m.odd1)} / {fmtOdd(m.oddX)} / {fmtOdd(m.odd2)} {!m.result && "✏️"}
        </button>
      </div>

      {editOdds && !m.result && (
        <div className="flex items-center gap-1.5 mt-2">
          <input value={o1} onChange={(e) => setO1(e.target.value)} placeholder="1" className="w-full rounded-lg px-2 py-1.5 text-white text-xs text-center outline-none" style={selStyle} />
          <input value={ox} onChange={(e) => setOx(e.target.value)} placeholder="X" className="w-full rounded-lg px-2 py-1.5 text-white text-xs text-center outline-none" style={selStyle} />
          <input value={o2} onChange={(e) => setO2(e.target.value)} placeholder="2" className="w-full rounded-lg px-2 py-1.5 text-white text-xs text-center outline-none" style={selStyle} />
          <button onClick={saveOdds} className="px-2.5 py-1.5 rounded-lg text-xs font-bold" style={{ background: "var(--accent-grad)", color: "var(--accent-ink)", boxShadow: "0 0 14px var(--accent-glow)" }}>✓</button>
        </div>
      )}

      {/* risultato */}
      <div className="flex items-center gap-1.5 mt-2">
        {(["1", "X", "2"] as Pick[]).map((p) => (
          <button key={p} onClick={async () => { await setMatchResult(m.id, p); await reload(); }}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: m.result === p ? "var(--accent)" : "rgba(255,255,255,0.06)",
              color: m.result === p ? "var(--accent-ink)" : "rgba(255,255,255,0.6)",
              border: `1px solid ${m.result === p ? "var(--accent)" : "rgba(255,255,255,0.1)"}`,
            }}>{PICK_LABELS[p]}</button>
        ))}
        {m.result && (
          <button onClick={async () => { await setMatchResult(m.id, null); await reload(); }}
            className="px-2 py-1.5 rounded-lg text-[11px] text-white/50" style={selStyle}>annulla</button>
        )}
        <button onClick={async () => { if (confirm("Eliminare lo scontro?")) { await deleteBetMatch(m.id); await reload(); } }}
          className="px-2 py-1.5 rounded-lg text-[11px] text-red-400/70" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>✕</button>
      </div>

      {err && <p className="text-red-400 text-xs mt-1.5">{err}</p>}

      {/* giocate dei manager — l'admin può cancellarne una piazzata per errore */}
      {m.bets && m.bets.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-1">
          <p className="text-white/35 text-[10px] font-semibold uppercase tracking-wide">Giocate ({m.bets.length})</p>
          {m.bets.map((b) => (
            <div key={b.betId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
              <Avatar src={b.logo} size={18} />
              <span className="text-white/85 text-xs flex-1 truncate">{b.name}</span>
              <span className="text-white/60 text-[11px] flex-none">{PICK_LABELS[b.pick]} · {b.stake}cr</span>
              <span className="text-[10px] flex-none w-12 text-right"
                style={{ color: b.status === "won" ? "#34d399" : b.status === "lost" ? "#f87171" : "rgba(255,255,255,0.4)" }}>
                {b.status === "won" ? `+${b.payout}` : b.status === "lost" ? "persa" : "in gioco"}
              </span>
              <button onClick={async () => { if (confirm(`Eliminare la giocata di ${b.name}?`)) { await adminDeleteBet(b.betId); await reload(); } }}
                className="text-red-400/70 text-xs px-1 flex-none">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminCreditsCard({ leaderboard, reload }: { leaderboard: CreditRow[]; reload: () => Promise<void> }) {
  const [user, setUser] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function apply() {
    const n = parseInt(amount, 10);
    if (!user || !Number.isInteger(n) || n === 0) return;
    setBusy(true);
    await adjustCredits(user, n);
    setBusy(false);
    setAmount("");
    await reload();
  }

  const selStyle = { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" };
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--accent)" }}>Crediti manuali</p>
      <div className="flex flex-col gap-2">
        <select value={user} onChange={(e) => setUser(e.target.value)} className="w-full rounded-xl px-2 py-2 text-white text-sm outline-none" style={selStyle}>
          <option value="" style={{ background: "#141d33" }}>Manager…</option>
          {leaderboard.map((r) => <option key={r.userId} value={r.userId} style={{ background: "#141d33" }}>{r.name} ({r.balance})</option>)}
        </select>
        <div className="flex gap-2">
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="±crediti"
            className="flex-1 rounded-xl px-3 py-2 text-white text-sm outline-none" style={selStyle} />
          <button onClick={apply} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: "var(--accent-grad)", color: "var(--accent-ink)", boxShadow: "0 0 14px var(--accent-glow)" }}>OK</button>
        </div>
      </div>
      <p className="text-white/35 text-[10px] mt-2">Usa valori negativi per togliere crediti. Es. +100 ricarica, -50 multa.</p>
    </div>
  );
}
