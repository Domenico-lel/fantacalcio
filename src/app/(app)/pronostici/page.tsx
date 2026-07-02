"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchBetCenter, placeBet, setMatchResult,
  createBetRound, setRoundStatus, deleteBetRound, addBetMatch, deleteBetMatch, adjustCredits,
  updateMatchOdds, adminDeleteBet,
  type BetCenter, type BetRound, type BetMatch, type CreditRow,
} from "@/app/pronostici-actions";
import { fetchTeams, type Team } from "@/app/teams-actions";
import { STARTING_CREDITS } from "@/lib/bet-constants";
import { isImageAvatar } from "@/lib/avatar";
import PageHeader from "@/components/PageHeader";
import SegmentedTabs from "@/components/SegmentedTabs";
import TabPanel from "@/components/TabPanel";
import { useConfirm } from "@/components/Dialog";
import { useRegisterRefresh } from "@/components/PullToRefresh";

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
  useRegisterRefresh(load);

  const isAdmin = !!data?.viewer?.isAdmin;
  const tabKeys: TabKey[] = isAdmin ? ["bet", "rank", "admin"] : ["bet", "rank"];

  return (
    <div className="screen sec-bet">
      <PageHeader
        eyebrow="La lega"
        title="Pronostici"
        right={!isAdmin ? (
          <div className="text-right px-3 py-2 rounded-2xl"
            style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>Crediti</p>
            <p className="font-display font-extrabold text-xl leading-none mt-0.5" style={{ color: "var(--accent)" }}>
              {loading ? "—" : data?.balance ?? 0}
            </p>
          </div>
        ) : undefined}
      >
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          items={[
            { key: "bet" as TabKey, label: "Scommetti" },
            { key: "rank" as TabKey, label: "Classifica" },
            ...(isAdmin ? [{ key: "admin" as TabKey, label: "Gestione" }] : []),
          ]}
        />
      </PageHeader>

      <TabPanel tabKey={tab} keys={tabKeys}>
        {tab === "bet" ? <BetTab data={data} loading={loading} reload={load} />
          : tab === "rank" ? <RankTab leaderboard={data?.leaderboard ?? []} loading={loading} />
          : isAdmin ? <AdminTab rounds={data?.rounds ?? []} leaderboard={data?.leaderboard ?? []} reload={load} />
          : null}
      </TabPanel>
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
        <p className="card-flat px-3 py-2.5 text-sm text-white/70">
          Completa il tuo profilo squadra per poter scommettere.
        </p>
      )}

      {loading && Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 140 }} />
      ))}

      {!loading && rounds.length === 0 && (
        <div className="flex flex-col items-center py-20 gap-3">
          <span className="text-5xl">🎟️</span>
          <p className="text-white/50 text-sm text-center">Nessuna giornata aperta. Torna più tardi.</p>
        </div>
      )}

      {rounds.map((r) => (
        <div key={r.id} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <span className="font-display font-bold text-white text-sm">Giornata {r.day}{r.title ? ` · ${r.title}` : ""}</span>
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

  // una volta piazzata, la giocata non è più modificabile
  const locked = !!match.result || roundStatus !== "open" || !canBet || !!match.myBet;
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

  const odds: Record<Pick, number> = { "1": match.odd1, X: match.oddX, "2": match.odd2 };

  return (
    <div className="card p-4">
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
              className="flex flex-col items-center py-2.5 rounded-xl transition-all active:scale-95 disabled:cursor-default"
              style={{
                background: isResult ? "var(--accent-grad)" : active ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${isResult || active ? "var(--accent)" : "var(--border)"}`,
                boxShadow: active ? "0 4px 14px -6px var(--accent-glow)" : "none",
                opacity: locked && !isResult && !isPicked ? 0.55 : 1,
              }}>
              <span className="text-[11px] font-bold" style={{ color: isResult ? "var(--accent-ink)" : active ? "var(--accent-soft)" : "var(--text-dim)" }}>{PICK_LABELS[p]}</span>
              <span className="font-display text-sm font-bold" style={{ color: isResult ? "var(--accent-ink)" : "#fff" }}>{fmtOdd(odds[p])}</span>
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
            <span className="text-white/45"> ({PICK_NAME[match.myBet.pick]})</span> · {match.myBet.stake} cr · quota {fmtOdd(match.myBet.odd)}
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
            className="input w-24 px-3 py-2.5 text-sm" />
          <button onClick={submit} disabled={busy || !pick || stakeNum <= 0}
            className="btn-primary flex-1 py-2.5 text-sm">
            {busy ? "…" : `Punta${potential ? ` · vinci ${potential}` : ""}`}
          </button>
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
        <div key={i} className="skeleton" style={{ height: 56 }} />
      ))}
      {!loading && leaderboard.length === 0 && <p className="text-white/50 text-sm text-center py-10">Nessun manager.</p>}
      {leaderboard.map((row, i) => (
        <div key={row.userId} className={`flex items-center gap-3 px-3 py-2.5 ${row.mine ? "card-accent" : "card-flat"}`}>
          <span className="w-6 text-center font-display font-bold text-sm" style={{ color: i < 3 ? "var(--accent)" : "var(--text-faint)" }}>{i + 1}</span>
          <Avatar src={row.logo} size={30} />
          <span className="flex-1 min-w-0 truncate text-white text-sm font-semibold">{row.name}</span>
          <span className="font-display font-extrabold text-sm" style={{ color: "var(--accent)" }}>{row.balance}</span>
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
      <div className="card p-4">
        <p className="eyebrow mb-3">Nuova giornata</p>
        <div className="flex gap-2">
          <input type="number" value={day} onChange={(e) => setDay(e.target.value)} placeholder="Giornata"
            className="input w-24 px-3 py-2 text-sm" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo (facoltativo)"
            className="input flex-1 px-3 py-2 text-sm" />
          <button onClick={create} disabled={busy} className="btn-primary px-4 py-2 text-sm">+</button>
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
  const confirm = useConfirm();
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

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display text-white font-bold text-sm">Giornata {round.day}{round.title ? ` · ${round.title}` : ""}</span>
          <RoundBadge status={round.status} />
        </div>
        <div className="flex items-center gap-1.5">
          {round.status !== "settled" && (
            <button onClick={async () => { await setRoundStatus(round.id, round.status === "open" ? "closed" : "open"); await reload(); }}
              className="btn-soft px-2.5 py-1.5 text-[11px]">
              {round.status === "open" ? "Chiudi" : "Riapri"}
            </button>
          )}
          <button onClick={async () => { if (await confirm({ title: "Eliminare la giornata?", message: "Le giocate verranno rimborsate.", confirmLabel: "Elimina", danger: true })) { await deleteBetRound(round.id); await reload(); } }}
            className="btn-danger-soft tap text-[13px]">🗑️</button>
        </div>
      </div>

      {/* scontri esistenti */}
      {round.matches.map((m) => <AdminMatchRow key={m.id} match={m} reload={reload} />)}

      {/* nuovo scontro */}
      <div className="card-accent px-3 py-3 flex flex-col gap-2" style={{ borderRadius: 14 }}>
        <div className="flex gap-2">
          <select value={home} onChange={(e) => setHome(e.target.value)} className="input flex-1 min-w-0 px-2 py-2 text-xs">
            <option value="">Casa…</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={away} onChange={(e) => setAway(e.target.value)} className="input flex-1 min-w-0 px-2 py-2 text-xs">
            <option value="">Ospite…</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <input value={o1} onChange={(e) => setO1(e.target.value)} placeholder="1" className="input w-full px-2 py-2 text-xs text-center" />
          <input value={ox} onChange={(e) => setOx(e.target.value)} placeholder="X" className="input w-full px-2 py-2 text-xs text-center" />
          <input value={o2} onChange={(e) => setO2(e.target.value)} placeholder="2" className="input w-full px-2 py-2 text-xs text-center" />
          <button onClick={add} disabled={busy} className="btn-primary px-4 py-2 text-sm">+</button>
        </div>
        {err && <p className="text-red-400 text-xs">{err}</p>}
      </div>
    </div>
  );
}

function AdminMatchRow({ match: m, reload }: { match: BetMatch; reload: () => Promise<void> }) {
  const confirm = useConfirm();
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
    <div className="card-flat px-3 py-2.5">
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
          <input value={o1} onChange={(e) => setO1(e.target.value)} placeholder="1" className="input w-full px-2 py-1.5 text-xs text-center" />
          <input value={ox} onChange={(e) => setOx(e.target.value)} placeholder="X" className="input w-full px-2 py-1.5 text-xs text-center" />
          <input value={o2} onChange={(e) => setO2(e.target.value)} placeholder="2" className="input w-full px-2 py-1.5 text-xs text-center" />
          <button onClick={saveOdds} className="btn-primary px-2.5 py-1.5 text-xs">✓</button>
        </div>
      )}

      {/* risultato */}
      <div className="flex items-center gap-1.5 mt-2">
        {(["1", "X", "2"] as Pick[]).map((p) => (
          <button key={p} onClick={async () => { await setMatchResult(m.id, p); await reload(); }}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: m.result === p ? "var(--accent-grad)" : "rgba(255,255,255,0.06)",
              color: m.result === p ? "var(--accent-ink)" : "var(--text-dim)",
              border: `1px solid ${m.result === p ? "var(--accent)" : "var(--border)"}`,
            }}>{PICK_LABELS[p]}</button>
        ))}
        {m.result && (
          <button onClick={async () => { await setMatchResult(m.id, null); await reload(); }}
            className="btn-soft px-2 py-1.5 text-[11px]">annulla</button>
        )}
        <button onClick={async () => { if (await confirm({ title: "Eliminare lo scontro?", confirmLabel: "Elimina", danger: true })) { await deleteBetMatch(m.id); await reload(); } }}
          className="btn-danger-soft tap text-[13px]">✕</button>
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
              <button onClick={async () => { if (await confirm({ title: `Eliminare la giocata di ${b.name}?`, confirmLabel: "Elimina", danger: true })) { await adminDeleteBet(b.betId); await reload(); } }}
                className="tap text-red-400/70 text-sm flex-none">✕</button>
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

  return (
    <div className="card p-4">
      <p className="eyebrow mb-3">Crediti manuali</p>
      <div className="flex flex-col gap-2">
        <select value={user} onChange={(e) => setUser(e.target.value)} className="input w-full px-2 py-2 text-sm">
          <option value="">Manager…</option>
          {leaderboard.map((r) => <option key={r.userId} value={r.userId}>{r.name} ({r.balance})</option>)}
        </select>
        <div className="flex gap-2">
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="±crediti"
            className="input flex-1 px-3 py-2 text-sm" />
          <button onClick={apply} disabled={busy} className="btn-primary px-5 py-2 text-sm">OK</button>
        </div>
      </div>
      <p className="text-white/35 text-[10px] mt-2">Usa valori negativi per togliere crediti. Es. +100 ricarica, -50 multa.</p>
    </div>
  );
}
