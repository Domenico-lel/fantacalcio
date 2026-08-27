"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchBetCenter, placeBetSlip, setMatchResult,
  createBetRound, setRoundStatus, deleteBetRound, addBetMatch, deleteBetMatch, adjustCredits,
  adminDeleteBetSlip,
  fetchFootballMatches, addExternalBetMatch, syncRoundResults,
  preparePredictionDraftNow,
  type BetCenter, type BetRound, type BetMatch, type CreditRow,
} from "@/app/pronostici-actions";
import { fetchTeams, type Team } from "@/app/teams-actions";
import {
  STARTING_CREDITS,
  FIXED_WIN_MULTIPLIER,
  calculateFixedPayout,
  countdownTone,
  BET_CUTOFF_MINUTES,
  FOOTBALL_COMPETITIONS,
  type ExtMatch,
} from "@/lib/bet-constants";
import {
  groupPredictionRounds,
  type PredictionCompetitionGroup,
} from "@/lib/prediction-competition-groups";
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

function fmtKickoff(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) return "Schedine chiuse";
  const seconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days > 0) return `${days}g ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
}

function useServerNow(clockOffset: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now() + clockOffset);
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [clockOffset]);
  return now;
}

function BetCountdown({ closesAt, now }: { closesAt: string | null; now: number | null }) {
  if (!closesAt) {
    return <p className="text-[10px] text-white/45">Scadenza non disponibile</p>;
  }
  const remaining = now === null ? null : Date.parse(closesAt) - now;
  const tone = remaining === null ? "normal" : countdownTone(remaining);
  const color = tone === "red" || tone === "closed" ? "#f87171" : tone === "orange" ? "#f59e0b" : "var(--accent-soft)";
  return (
    <div className="rounded-xl px-3 py-2 flex items-center gap-2" role="timer" aria-live="polite"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 35%, transparent)` }}>
      <span aria-hidden="true">⏱️</span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color }}>Tempo per giocare</p>
        <p className="font-display text-sm font-extrabold" style={{ color }}>
          {remaining === null ? "Calcolo…" : formatCountdown(remaining)}
        </p>
      </div>
      <span className="text-[9px] text-white/35 text-right">chiusura<br />{fmtKickoff(closesAt)}</span>
    </div>
  );
}

export default function PronosticiPage() {
  const [tab, setTab] = useState<TabKey>("bet");
  const [data, setData] = useState<BetCenter | null>(null);
  const [loading, setLoading] = useState(true);
  // scarto tra orologio del server e del dispositivo: (server - client) al momento del fetch.
  // Serve a chiudere le scommesse sull'ora del server, non su quella (potenzialmente sballata) del telefono.
  const [clockOffset, setClockOffset] = useState(0);

  const load = useCallback(async () => {
    try {
      const d = await fetchBetCenter();
      setClockOffset(d.serverNow - Date.now());
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
        {tab === "bet" ? <BetTab data={data} loading={loading} reload={load} clockOffset={clockOffset} />
          : tab === "rank" ? <RankTab leaderboard={data?.leaderboard ?? []} loading={loading} />
          : isAdmin ? <AdminTab rounds={data?.rounds ?? []} leaderboard={data?.leaderboard ?? []} reload={load} clockOffset={clockOffset} />
          : null}
      </TabPanel>
    </div>
  );
}

/* ─── TAB SCOMMETTI ─────────────────────────────────────────────────────── */

function CompetitionFolders({
  groups,
  activeKey,
  onChange,
}: {
  groups: PredictionCompetitionGroup<BetRound>[];
  activeKey: string;
  onChange: (key: string) => void;
}) {
  if (groups.length <= 1) return null;
  return (
    <div className="grid grid-cols-2 gap-2" aria-label="Competizioni">
      {groups.map((group) => {
        const active = group.key === activeKey;
        const open = group.rounds.filter((round) => round.status === "open").length;
        return (
          <button
            key={group.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(group.key)}
            className="min-w-0 rounded-2xl px-3 py-3 text-left transition-all active:scale-[0.98]"
            style={{
              background: active ? "color-mix(in srgb, var(--accent) 17%, var(--surface))" : "var(--surface)",
              border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              boxShadow: active ? "0 8px 24px -16px var(--accent-glow)" : "none",
            }}
          >
            <span className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">{group.icon}</span>
              <span className="font-display text-sm font-bold text-white truncate">{group.label}</span>
            </span>
            <span className="block text-[10px] mt-1" style={{ color: active ? "var(--accent-soft)" : "var(--text-faint)" }}>
              {open ? (open === 1 ? "1 aperta" : `${open} aperte`) : `${group.rounds.length} giornat${group.rounds.length === 1 ? "a" : "e"}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function BetTab({ data, loading, reload, clockOffset }: { data: BetCenter | null; loading: boolean; reload: () => Promise<void>; clockOffset: number }) {
  const rounds = data?.rounds ?? [];
  const canBet = !!data?.viewer && !data.viewer.isAdmin && data.viewer.hasProfile;
  const groups = groupPredictionRounds(rounds);
  const [selectedKey, setSelectedKey] = useState("");
  const activeGroup = groups.find((group) => group.key === selectedKey) ?? groups[0];

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

      {!loading && activeGroup && (
        <>
          <CompetitionFolders
            groups={groups}
            activeKey={activeGroup.key}
            onChange={setSelectedKey}
          />
          {activeGroup.rounds.map((round) => (
            <details
              key={round.id}
              open={round.status === "open"}
              className="card overflow-hidden group"
            >
              <summary className="list-none cursor-pointer px-4 py-3 flex items-center gap-2 select-none">
                <span className="font-display font-bold text-white text-sm flex-1">Giornata {round.day}</span>
                <RoundBadge status={round.status} />
                <span className="text-white/35 text-xs transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="px-3 pb-3 flex flex-col gap-3 border-t" style={{ borderColor: "var(--border)" }}>
                <RoundSlipCard round={round} canBet={canBet} reload={reload} clockOffset={clockOffset} />
              </div>
            </details>
          ))}
        </>
      )}
      <div className="h-4" />
    </div>
  );
}

function RoundBadge({ status }: { status: BetRound["status"] }) {
  const map = {
    draft: { label: "Bozza", color: "#94a3b8" },
    open: { label: "Aperta", color: "#34d399" },
    closed: { label: "Chiusa", color: "#f0a43a" },
    settled: { label: "Conclusa", color: "#857cf0" },
  }[status];
  return (
    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
      style={{ background: `${map.color}26`, color: map.color }}>{map.label}</span>
  );
}

function RoundSlipCard({ round, canBet, reload, clockOffset }: {
  round: BetRound; canBet: boolean; reload: () => Promise<void>; clockOffset: number;
}) {
  const [picks, setPicks] = useState<Record<string, Pick>>(round.mySlip?.picks ?? {});
  const [stake, setStake] = useState<string>(round.mySlip ? String(round.mySlip.stake) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const now = useServerNow(clockOffset);
  const expired = !!round.closesAt && now !== null && Date.parse(round.closesAt) <= now;
  const locked = round.status !== "open" || !canBet || !!round.mySlip || expired || !round.closesAt;
  const stakeNum = parseInt(stake || "0", 10);
  const selectedCount = round.matches.filter((match) => !!picks[match.id]).length;
  const complete = round.matches.length > 0 && selectedCount === round.matches.length;
  const potential = complete && stakeNum > 0 ? calculateFixedPayout(stakeNum) : 0;

  async function submit() {
    if (!complete) { setError("Completa tutti i pronostici della schedina"); return; }
    if (!Number.isInteger(stakeNum) || stakeNum <= 0) { setError("Inserisci una puntata"); return; }
    setBusy(true); setError("");
    const res = await placeBetSlip(
      round.id,
      round.matches.map((match) => ({ matchId: match.id, pick: picks[match.id] })),
      stakeNum,
    );
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    await reload();
  }

  return (
    <div className="pt-3 flex flex-col gap-3">
      <BetCountdown closesAt={round.closesAt} now={now} />
      <p className="text-[10px] text-white/40 px-1">
        Scegli tutti gli esiti e gioca una sola schedina. Chiude {BET_CUTOFF_MINUTES} minuti prima della prima partita.
      </p>

      {round.matches.length === 0 && <p className="text-white/35 text-xs">Nessun incontro inserito.</p>}
      {round.matches.map((match) => {
        const chosen = round.mySlip?.picks[match.id] ?? picks[match.id] ?? null;
        return (
          <div key={match.id} className="card-flat p-3">
            {match.kickoff && <p className="text-white/35 text-[10px] mb-2">{fmtKickoff(match.kickoff)}</p>}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar src={match.homeLogo} size={28} />
                <span className="text-white text-xs font-semibold truncate">{match.homeName}</span>
              </div>
              <span className="text-white/30 text-[10px] font-bold flex-none">VS</span>
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <span className="text-white text-xs font-semibold truncate text-right">{match.awayName}</span>
                <Avatar src={match.awayLogo} size={28} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2.5">
              {(["1", "X", "2"] as Pick[]).map((pick) => {
                const active = chosen === pick;
                const correct = !!match.result && match.result === pick;
                const wrongChoice = !!match.result && active && match.result !== pick;
                return (
                  <button key={pick} type="button" disabled={locked}
                    aria-label={`${PICK_NAME[pick]}: ${match.homeName} - ${match.awayName}`}
                    aria-pressed={active}
                    onClick={() => setPicks((current) => ({ ...current, [match.id]: pick }))}
                    className="py-2 rounded-xl transition-all active:scale-95 disabled:cursor-default"
                    style={{
                      background: correct ? "rgba(52,211,153,0.18)" : wrongChoice ? "rgba(248,113,113,0.16)" : active ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${correct ? "#34d399" : wrongChoice ? "#f87171" : active ? "var(--accent)" : "var(--border)"}`,
                      color: correct ? "#34d399" : wrongChoice ? "#f87171" : active ? "var(--accent-soft)" : "var(--text-dim)",
                    }}>
                    <span className="font-display text-sm font-bold">{PICK_LABELS[pick]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {round.mySlip ? (
        <div className="rounded-xl px-3 py-3 flex items-center justify-between gap-3"
          style={{
            background: round.mySlip.status === "won" ? "rgba(52,211,153,0.12)" : round.mySlip.status === "lost" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)",
            border: "1px solid var(--border)",
          }}>
          <div>
            <p className="text-xs font-bold text-white">Schedina giocata · {round.mySlip.stake} cr</p>
            <p className="text-[10px] text-white/45">{Object.keys(round.mySlip.picks).length} pronostici · vincita {calculateFixedPayout(round.mySlip.stake)} cr</p>
          </div>
          {round.mySlip.status === "won" && <span className="text-emerald-400 text-xs font-bold">Vinta +{round.mySlip.payout}</span>}
          {round.mySlip.status === "lost" && <span className="text-red-400 text-xs font-bold">Persa</span>}
          {round.mySlip.status === "pending" && <span className="text-white/50 text-xs font-bold">In gioco</span>}
        </div>
      ) : !locked ? (
        <div className="card-accent p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/60">Pronostici scelti</span>
            <span className="font-display text-sm font-bold" style={{ color: complete ? "#34d399" : "var(--accent-soft)" }}>{selectedCount}/{round.matches.length}</span>
          </div>
          <div className="flex items-center gap-2">
          <input
            type="number" inputMode="numeric" min={1} value={stake}
            onChange={(e) => setStake(e.target.value)} placeholder="Crediti"
            className="input w-24 px-3 py-2.5 text-sm" />
          <button onClick={submit} disabled={busy || !complete || stakeNum <= 0}
            className="btn-primary flex-1 py-2.5 text-sm">
            {busy ? "Invio…" : `Gioca schedina${potential ? ` · ricevi ${potential}` : ""}`}
          </button>
          </div>
        </div>
      ) : (
        <p className="text-center text-xs text-white/45 py-2">🔒 Schedine chiuse</p>
      )}

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      {round.slipCount > 0 && <p className="text-white/30 text-[10px] text-center">{round.slipCount} schedine giocate</p>}
    </div>
  );
}

/* ─── TAB CLASSIFICA ────────────────────────────────────────────────────── */

function RankTab({ leaderboard, loading }: { leaderboard: CreditRow[]; loading: boolean }) {
  return (
    <div className="px-4 py-4 flex flex-col gap-2">
      <p className="text-white/40 text-xs mb-1">Saldo crediti dei manager. Si parte da {STARTING_CREDITS}; una schedina completa vincente restituisce 2× la puntata.</p>
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

function AdminTab({ rounds, leaderboard, reload, clockOffset }: { rounds: BetRound[]; leaderboard: CreditRow[]; reload: () => Promise<void>; clockOffset: number }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [day, setDay] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [prepareMsg, setPrepareMsg] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const groups = groupPredictionRounds(rounds);
  const activeGroup = groups.find((group) => group.key === selectedKey) ?? groups[0];

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

  async function prepare() {
    setPreparing(true); setPrepareMsg("");
    const res = await preparePredictionDraftNow();
    setPreparing(false);
    const describe = (
      label: string,
      draft: { day: number | null; matches: number; skipped: boolean; error: string | null },
    ) => {
      if (draft.error) return `${label}: ${draft.error}`;
      if (draft.skipped) return draft.day
        ? `${label} G${draft.day} già pronta/pubblicata`
        : `${label}: nessuna novità`;
      return `${label} G${draft.day}: ${draft.matches} partite pronte`;
    };
    const hasError = !!(res.fantasy.error || res.serieA.error);
    setPrepareMsg(`${hasError ? "⚠" : "✓"} ${describe("Fantacalcio", res.fantasy)} · ${describe("Serie A", res.serieA)}`);
    await reload();
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      <div className="card p-4" style={{ borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow mb-1">Bozza automatica</p>
            <p className="text-sm leading-snug" style={{ color: "var(--text-dim)" }}>
              Prepara Fantacalcio e Serie A. Ogni vincita paga sempre 2×.
            </p>
          </div>
          <span className="text-xl flex-none">✨</span>
        </div>
        <button type="button" onClick={prepare} disabled={preparing}
          className="btn-primary w-full min-h-[44px] px-4 text-sm mt-3 disabled:opacity-50">
          {preparing ? "Preparo…" : "Aggiorna entrambe le bozze"}
        </button>
        {prepareMsg && <p role={prepareMsg.startsWith("✓") ? "status" : "alert"} className="text-xs mt-2" style={{ color: prepareMsg.startsWith("✓") ? "var(--success)" : "var(--text-dim)" }}>{prepareMsg}</p>}
      </div>

      {/* fallback nascosto: l'uso normale resta concentrato sulle bozze automatiche */}
      <details className="card overflow-hidden">
        <summary className="list-none cursor-pointer px-4 py-3 flex items-center gap-2">
          <span className="text-sm">🛠️</span>
          <span className="font-display text-white text-sm font-bold flex-1">Creazione manuale</span>
          <span className="text-white/35 text-xs">⌄</span>
        </summary>
        <div className="px-4 pb-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
          <div className="flex gap-2">
            <input type="number" value={day} onChange={(e) => setDay(e.target.value)} placeholder="Giornata"
              className="input w-24 px-3 py-2 text-sm" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Competizione"
              className="input flex-1 min-w-0 px-3 py-2 text-sm" />
            <button onClick={create} disabled={busy} className="btn-primary px-4 py-2 text-sm">+</button>
          </div>
          {msg && <p className="text-white/60 text-xs mt-2">{msg}</p>}
        </div>
      </details>

      {activeGroup && (
        <>
          <CompetitionFolders groups={groups} activeKey={activeGroup.key} onChange={setSelectedKey} />
          {activeGroup.rounds.map((round) => <AdminRoundCard key={round.id} round={round} teams={teams} reload={reload} clockOffset={clockOffset} />)}
        </>
      )}

      {/* crediti manuali */}
      <AdminCreditsCard leaderboard={leaderboard} reload={reload} />
      <div className="h-4" />
    </div>
  );
}

function AdminRoundCard({ round, teams, reload, clockOffset }: { round: BetRound; teams: Team[]; reload: () => Promise<void>; clockOffset: number }) {
  const confirm = useConfirm();
  const [mode, setMode] = useState<"league" | "real">("league");

  // modalità squadre lega
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");

  // modalità partita reale
  const [comp, setComp] = useState<string>(FOOTBALL_COMPETITIONS[0].code);
  const [matchday, setMatchday] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<ExtMatch[]>([]);
  const [sel, setSel] = useState<ExtMatch | null>(null);
  const [rHome, setRHome] = useState("");
  const [rAway, setRAway] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const now = useServerNow(clockOffset);

  const hasExternal = round.matches.some((m) => m.external);

  async function addLeague() {
    if (!home || !away) { setErr("Scegli le due squadre"); return; }
    setBusy(true); setErr("");
    const res = await addBetMatch({ roundId: round.id, homeTeamId: home, awayTeamId: away });
    setBusy(false);
    if (res.error) { setErr(res.error); return; }
    setHome(""); setAway("");
    await reload();
  }

  async function search() {
    setSearching(true); setErr(""); setFound([]); setSel(null); setRHome(""); setRAway("");
    const res = await fetchFootballMatches(comp, matchday ? parseInt(matchday, 10) : undefined);
    setSearching(false);
    if (res.error) { setErr(res.error); return; }
    if (res.matches.length === 0) { setErr("Nessuna partita trovata per questa selezione."); return; }
    setFound(res.matches);
  }

  function pickMatch(m: ExtMatch) {
    setSel(m); setRHome(m.homeName); setRAway(m.awayName); setErr("");
  }

  async function addReal() {
    if (!rHome.trim() || !rAway.trim()) { setErr("Inserisci entrambe le squadre"); return; }
    setBusy(true); setErr("");
    const compName = sel?.competition || FOOTBALL_COMPETITIONS.find((c) => c.code === comp)?.name || null;
    const res = await addExternalBetMatch({
      roundId: round.id,
      homeName: rHome, awayName: rAway,
      homeLogo: sel?.homeLogo ?? null, awayLogo: sel?.awayLogo ?? null,
      competition: compName,
      eventId: sel?.eventId ?? null,
      kickoff: sel?.kickoff ?? null,
    });
    setBusy(false);
    if (res.error) { setErr(res.error); return; }
    setSel(null); setRHome(""); setRAway(""); setFound([]);
    await reload();
  }

  async function sync() {
    setSyncing(true); setSyncMsg("");
    const res = await syncRoundResults(round.id);
    setSyncing(false);
    setSyncMsg(res.error ?? `Aggiornate ${res.settled} partite.`);
    await reload();
  }

  async function changeStatus(status: "open" | "closed") {
    setBusy(true); setErr("");
    const res = await setRoundStatus(round.id, status);
    setBusy(false);
    if (res.error) { setErr(res.error); return; }
    await reload();
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display text-white font-bold text-sm">Giornata {round.day}</span>
          <RoundBadge status={round.status} />
        </div>
        <div className="flex items-center gap-1.5">
          {hasExternal && round.status !== "settled" && (
            <button onClick={sync} disabled={syncing} className="btn-soft px-2.5 py-1.5 text-[11px]">
              {syncing ? "…" : "↻ Risultati"}
            </button>
          )}
          {round.status === "draft" && (
            <button type="button" onClick={() => changeStatus("open")} disabled={busy}
              className="btn-primary px-3 py-1.5 text-[11px]">Pubblica</button>
          )}
          {round.status !== "draft" && round.status !== "settled" && (
            <button type="button" onClick={() => changeStatus(round.status === "open" ? "closed" : "open")} disabled={busy}
              className="btn-soft px-2.5 py-1.5 text-[11px]">
              {round.status === "open" ? "Chiudi" : "Riapri"}
            </button>
          )}
          <button onClick={async () => { if (await confirm({ title: "Eliminare la giornata?", message: "Le giocate verranno rimborsate.", confirmLabel: "Elimina", danger: true })) { await deleteBetRound(round.id); await reload(); } }}
            className="btn-danger-soft tap text-[13px]">🗑️</button>
        </div>
      </div>

      {syncMsg && <p className="text-white/60 text-xs">{syncMsg}</p>}
      <BetCountdown closesAt={round.closesAt} now={now} />

      {/* scontri esistenti */}
      {round.matches.map((m) => <AdminMatchRow key={m.id} match={m} reload={reload} />)}

      {round.slips && round.slips.length > 0 && (
        <details className="card-flat overflow-hidden">
          <summary className="list-none cursor-pointer px-3 py-2.5 flex items-center gap-2">
            <span className="font-display text-xs font-bold text-white flex-1">🎟️ Schedine ({round.slips.length})</span>
            <span className="text-white/35 text-xs">⌄</span>
          </summary>
          <div className="px-3 pb-3 border-t flex flex-col gap-1.5 pt-2.5" style={{ borderColor: "var(--border)" }}>
            {round.slips.map((slip) => (
              <div key={slip.id} className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                <Avatar src={slip.logo} size={20} />
                <div className="flex-1 min-w-0">
                  <p className="text-white/85 text-xs truncate">{slip.name}</p>
                  <p className="text-white/40 text-[9px]">{Object.keys(slip.picks).length} pronostici · {slip.stake} cr</p>
                </div>
                <span className="text-[10px] flex-none"
                  style={{ color: slip.status === "won" ? "#34d399" : slip.status === "lost" ? "#f87171" : "rgba(255,255,255,0.45)" }}>
                  {slip.status === "won" ? `+${slip.payout}` : slip.status === "lost" ? "persa" : "in gioco"}
                </span>
                <button onClick={async () => { if (await confirm({ title: `Eliminare la schedina di ${slip.name}?`, message: "Il saldo verrà ripristinato.", confirmLabel: "Elimina", danger: true })) { await adminDeleteBetSlip(slip.id); await reload(); } }}
                  className="tap text-red-400/70 text-sm flex-none">✕</button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Gli incontri diventano immutabili appena esiste una schedina. */}
      {round.slipCount === 0 ? <details className="card-accent overflow-hidden" style={{ borderRadius: 14 }}>
        <summary className="list-none cursor-pointer px-3 py-2.5 flex items-center gap-2">
          <span className="font-display text-xs font-bold text-white flex-1">＋ Aggiungi partita</span>
          <span className="text-[10px]" style={{ color: "var(--accent-soft)" }}>vincita {FIXED_WIN_MULTIPLIER}×</span>
        </summary>
        <div className="px-3 pb-3 flex flex-col gap-2.5 border-t pt-2.5" style={{ borderColor: "var(--border)" }}>
        {/* toggle modalità */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
          {([["league", "Squadre lega"], ["real", "Partita reale"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => { setMode(key); setErr(""); }}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background: mode === key ? "var(--accent-grad)" : "transparent",
                color: mode === key ? "var(--accent-ink)" : "var(--text-dim)",
              }}>{label}</button>
          ))}
        </div>

        {mode === "league" ? (
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
        ) : (
          <>
            {/* ricerca partite reali: competizione + giornata (vuoto = prossime) */}
            <div className="flex gap-2">
              <select value={comp} onChange={(e) => setComp(e.target.value)} className="input flex-1 min-w-0 px-2 py-2 text-xs">
                {FOOTBALL_COMPETITIONS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              <input value={matchday} onChange={(e) => setMatchday(e.target.value)} inputMode="numeric" placeholder="Giorn."
                className="input w-16 px-2 py-2 text-xs text-center" />
              <button onClick={search} disabled={searching} className="btn-soft px-3 py-2 text-xs">{searching ? "…" : "Cerca"}</button>
            </div>

            {found.length > 0 && (
              <div className="flex flex-col gap-1 overflow-auto pr-0.5" style={{ maxHeight: 208 }}>
                {found.map((m) => (
                  <button key={m.eventId} onClick={() => pickMatch(m)}
                    className="flex flex-col gap-1 px-2 py-1.5 rounded-lg text-left transition-all"
                    style={{
                      background: sel?.eventId === m.eventId ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${sel?.eventId === m.eventId ? "var(--accent)" : "transparent"}`,
                    }}>
                    <div className="flex items-center gap-2 w-full">
                      <Avatar src={m.homeLogo || "⚽"} size={16} />
                      <span className="text-white/85 text-[11px] flex-1 truncate">{m.homeName} <span className="text-white/30">-</span> {m.awayName}</span>
                      <Avatar src={m.awayLogo || "⚽"} size={16} />
                    </div>
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-white/35 text-[9px]">{fmtKickoff(m.kickoff)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* nomi: auto-compilati dalla partita scelta, oppure a mano */}
            <div className="flex gap-2">
              <input value={rHome} onChange={(e) => setRHome(e.target.value)} placeholder="Casa" className="input flex-1 min-w-0 px-2 py-2 text-xs" />
              <input value={rAway} onChange={(e) => setRAway(e.target.value)} placeholder="Ospite" className="input flex-1 min-w-0 px-2 py-2 text-xs" />
            </div>
          </>
        )}

        <button onClick={mode === "league" ? addLeague : addReal} disabled={busy} className="btn-primary w-full py-2 text-sm">
          {busy ? "Aggiungo…" : "Aggiungi partita"}
        </button>
        {err && <p className="text-red-400 text-xs">{err}</p>}
        </div>
      </details> : (
        <p className="text-center text-[10px] text-white/35">Incontri bloccati: sono già state giocate delle schedine.</p>
      )}
    </div>
  );
}

function AdminMatchRow({ match: m, reload }: { match: BetMatch; reload: () => Promise<void> }) {
  const confirm = useConfirm();

  return (
    <div className="card-flat px-3 py-2.5">
      {m.competition && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent-soft)" }}>
            {m.competition}
          </span>
          {m.kickoff && <span className="text-white/30 text-[9px]">{fmtKickoff(m.kickoff)}</span>}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-white text-xs font-semibold truncate flex-1">{m.homeName} <span className="text-white/30">vs</span> {m.awayName}</span>
      </div>

      {/* risultato: l'admin dichiara chi ha vinto → salda subito le giocate */}
      <p className="text-white/45 text-[10px] mt-2.5 mb-1">
        {m.result ? "Risultato — tocca per cambiare, oppure annulla" : "Imposta il risultato: la schedina verrà aggiornata automaticamente"}
      </p>
      <div className="flex items-center gap-1.5">
        {(["1", "X", "2"] as Pick[]).map((p) => {
          const caption = p === "1" ? m.homeName : p === "2" ? m.awayName : "Pareggio";
          const on = m.result === p;
          return (
            <button key={p} onClick={async () => { await setMatchResult(m.id, p); await reload(); }}
              className="flex-1 min-w-0 flex flex-col items-center py-1.5 rounded-lg transition-all"
              style={{
                background: on ? "var(--accent-grad)" : "rgba(255,255,255,0.06)",
                color: on ? "var(--accent-ink)" : "var(--text-dim)",
                border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
              }}>
              <span className="text-xs font-bold leading-none">{PICK_LABELS[p]}</span>
              <span className="text-[9px] leading-tight truncate max-w-full mt-0.5 opacity-80">{caption}</span>
            </button>
          );
        })}
        {m.result && (
          <button onClick={async () => { await setMatchResult(m.id, null); await reload(); }}
            className="btn-soft px-2 py-1.5 text-[11px] flex-none">annulla</button>
        )}
        <button onClick={async () => { if (await confirm({ title: "Eliminare lo scontro?", message: "Le schedine già piazzate nella giornata verranno rimborsate.", confirmLabel: "Elimina", danger: true })) { await deleteBetMatch(m.id); await reload(); } }}
          className="btn-danger-soft tap text-[13px] flex-none">✕</button>
      </div>
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
    <details className="card overflow-hidden">
      <summary className="list-none cursor-pointer px-4 py-3 flex items-center gap-2">
        <span className="eyebrow flex-1">Crediti manuali</span>
        <span className="text-white/35 text-xs">⌄</span>
      </summary>
      <div className="px-4 pb-4 pt-3 border-t flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
        <select value={user} onChange={(e) => setUser(e.target.value)} className="input w-full px-2 py-2 text-sm">
          <option value="">Manager…</option>
          {leaderboard.map((r) => <option key={r.userId} value={r.userId}>{r.name} ({r.balance})</option>)}
        </select>
        <div className="flex gap-2">
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="±crediti"
            className="input flex-1 min-w-0 px-3 py-2 text-sm" />
          <button onClick={apply} disabled={busy} className="btn-primary px-5 py-2 text-sm">OK</button>
        </div>
        <p className="text-white/35 text-[10px]">Usa valori negativi per togliere crediti. Es. +100 ricarica, -50 multa.</p>
      </div>
    </details>
  );
}
