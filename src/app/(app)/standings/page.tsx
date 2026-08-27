"use client";

import Image from "next/image";
import { Fragment, useCallback, useEffect, useState } from "react";
import type { FantacalcioCurrentMatchday, FantacalcioMatchdayMatch, FantacalcioStandingsResult } from "@/lib/fantacalcio-api";
import { loadViewerCache } from "@/lib/store";
import { getCurrentViewer } from "@/app/social-actions";
import { fetchStandingsNameMap, fetchStandingsRosterMap, type RosterPlayer, type StandingsTeamInfo } from "@/app/teams-actions";
import { isImageAvatar } from "@/lib/avatar";
import PageHeader from "@/components/PageHeader";
import SegmentedTabs from "@/components/SegmentedTabs";
import TabPanel from "@/components/TabPanel";
import TrofeiContent from "@/components/TrofeiContent";
import { useRegisterRefresh } from "@/components/PullToRefresh";

type TabKey = "classifica" | "trofei";
const TAB_KEYS: TabKey[] = ["classifica", "trofei"];
// La tab Trofei registra da sé il proprio refresh: qui basta un no-op stabile.
const NOOP = () => {};

interface StandingEntryWithLogo {
  position: number;
  teamName: string;      // nome originale scrapato (chiave per l'override)
  teamId: string | null;
  displayName: string;   // nome mostrato (override bacheca, se presente)
  logoUrl: string | null;
  logoEmoji: string;
  points: number;
  totalFp: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDiff: number;
  goalsFor: number;
  goalsAgainst: number;
}

const EMOJI_POOL = ["⚽", "🏆", "⭐", "🦅", "🦁", "🐉", "🔥", "⚡", "🌟", "🎯", "🦊", "🐺", "🦈", "💎"];

function assignLogoToTeam(teamName: string): string {
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = ((hash << 5) - hash) + teamName.charCodeAt(i);
    hash = hash & hash;
  }
  return EMOJI_POOL[Math.abs(hash) % EMOJI_POOL.length];
}

/* Pallino posizione: oro/argento/bronzo per il podio, neutro per il resto */
const PODIUM_COLORS = ["#f5c518", "#c8d2dc", "#cd7f32"];

function PositionBadge({ position }: { position: number }) {
  const podium = position <= 3 ? PODIUM_COLORS[position - 1] : null;
  return (
    <span className="w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-[12px] flex-none"
      style={podium
        ? { background: `${podium}22`, color: podium, border: `1px solid ${podium}55` }
        : { color: "var(--text-faint)" }}>
      {position}
    </span>
  );
}

function Logo({ url, fallback, size, radius = 50 }: { url: string | null; fallback: string; size: number; radius?: number }) {
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="object-cover flex-none"
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <span className="flex-none flex items-center justify-center"
      style={{ width: size, height: size, borderRadius: radius, background: "rgba(255,255,255,0.07)", fontSize: size * 0.5 }}>
      {fallback}
    </span>
  );
}

function formatMatchdayPoints(value: number | null): string {
  return value === null
    ? "—"
    : value.toLocaleString("it-IT", { minimumFractionDigits: Number.isInteger(value) ? 0 : 1, maximumFractionDigits: 2 });
}

function scoreFor(match: FantacalcioMatchdayMatch, isHome: boolean): number | null {
  return isHome ? match.homeGoals : match.awayGoals;
}

function CurrentMatchdayPanel({
  matchday,
  teamId,
  teamName,
  teams,
}: {
  matchday: FantacalcioCurrentMatchday | null;
  teamId: string | null;
  teamName: string;
  teams: StandingEntryWithLogo[];
}) {
  const match = teamId
    ? matchday?.matches.find((item) => item.homeTeamId === teamId || item.awayTeamId === teamId)
    : undefined;

  if (!matchday || !match) {
    return (
      <div className="mt-3 rounded-2xl p-3" style={{ background: "color-mix(in srgb, var(--accent) 10%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--accent-soft)" }}>Giornata in corso</p>
            <p className="text-white text-sm font-semibold mt-0.5">Calendario non disponibile</p>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ color: "var(--text-dim)", background: "rgba(255,255,255,0.06)" }}>In attesa</span>
        </div>
        <p className="text-xs leading-relaxed mt-2" style={{ color: "var(--text-dim)" }}>Fantacalcio non ha ancora associato un incontro corrente a questa squadra.</p>
      </div>
    );
  }

  const isHome = match.homeTeamId === teamId;
  const opponentName = isHome ? match.awayTeamName : match.homeTeamName;
  const selectedSourceName = isHome ? match.homeTeamName : match.awayTeamName;
  const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
  const selectedTeam = teams.find((item) => item.teamId === teamId || item.teamName === selectedSourceName);
  const opponent = teams.find((item) => item.teamId === opponentId || item.teamName === opponentName);
  const teamPoints = isHome ? match.homePoints : match.awayPoints;
  const opponentPoints = isHome ? match.awayPoints : match.homePoints;
  const teamGoals = scoreFor(match, isHome);
  const opponentGoals = scoreFor(match, !isHome);
  const formation = isHome ? match.homeFormation : match.awayFormation;
  const playersWithVote = isHome ? match.homePlayersWithVote : match.awayPlayersWithVote;
  const hasLiveData = teamPoints !== null || opponentPoints !== null || playersWithVote > 0;
  const status = match.calculated ? "Calcolata" : hasLiveData ? "In corso" : "Da giocare";

  return (
    <div className="mt-3 rounded-2xl p-3" style={{ background: "color-mix(in srgb, var(--accent) 10%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--accent-soft)" }}>Giornata {matchday.matchweek}</p>
          <p className="text-white text-sm font-semibold mt-0.5">
            {matchday.realMatchweek ? `${matchday.realMatchweek}ª di Serie A` : "Giornata in corso"}
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ color: match.calculated ? "var(--success)" : "var(--text-dim)", background: "rgba(255,255,255,0.06)" }}>{status}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mt-3 rounded-xl px-2.5 py-2.5" style={{ background: "rgba(255,255,255,0.045)" }}>
        <div className="min-w-0 flex flex-col items-center text-center">
          <Logo url={selectedTeam?.logoUrl ?? null} fallback={selectedTeam?.logoEmoji ?? assignLogoToTeam(teamName)} size={34} radius={10} />
          <p className="mt-1.5 w-full truncate text-xs font-semibold text-white">{teamName}</p>
          <p className="font-display text-xl text-white font-extrabold mt-1">{formatMatchdayPoints(teamPoints)}</p>
          <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>fantapunti</p>
        </div>
        <div className="text-center px-1">
          <p className="text-[10px] font-bold" style={{ color: "var(--text-faint)" }}>VS</p>
          {teamGoals !== null && opponentGoals !== null && (
            <p className="font-display text-sm text-white font-bold mt-1">{teamGoals}–{opponentGoals}</p>
          )}
        </div>
        <div className="min-w-0 flex flex-col items-center text-center">
          <Logo url={opponent?.logoUrl ?? null} fallback={opponent?.logoEmoji ?? assignLogoToTeam(opponentName)} size={34} radius={10} />
          <p className="mt-1.5 w-full truncate text-xs font-semibold text-white">{opponent?.displayName ?? opponentName}</p>
          <p className="font-display text-xl text-white font-extrabold mt-1">{formatMatchdayPoints(opponentPoints)}</p>
          <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>fantapunti</p>
        </div>
      </div>

      {(formation || playersWithVote > 0) && (
        <p className="text-[11px] mt-2 text-center" style={{ color: "var(--text-dim)" }}>
          {formation ? `Modulo ${formation}` : "Formazione schierata"}{playersWithVote > 0 ? ` · ${playersWithVote}/11 con voto` : ""}
        </p>
      )}
    </div>
  );
}

export default function StandingsPage() {
  const [tab, setTab] = useState<TabKey>("classifica");
  const [myTeamName, setMyTeamName] = useState("La tua Squadra");
  const [myLogo, setMyLogo] = useState("⭐");
  const [standings, setStandings] = useState<StandingEntryWithLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceError, setSourceError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [expandedTeamName, setExpandedTeamName] = useState<string | null>(null);
  const [rosters, setRosters] = useState<Record<string, RosterPlayer[]>>({});
  const [rostersLoaded, setRostersLoaded] = useState(false);
  const [loadingRosters, setLoadingRosters] = useState(false);
  const [currentMatchday, setCurrentMatchday] = useState<FantacalcioCurrentMatchday | null>(null);

  useEffect(() => {
    // Identità autorevole dal server (stessa fonte dell'header), con paint immediato dalla cache.
    // localStorage da solo era inaffidabile: il nome squadra non combaciava con la classifica
    // e la "tua posizione" non veniva evidenziata.
    const cached = loadViewerCache();
    if (cached?.displayName) setMyTeamName(cached.displayName);
    if (cached?.logo && !isImageAvatar(cached.logo)) setMyLogo(cached.logo);
    getCurrentViewer().then((v) => {
      if (!v) return;
      setIsAdmin(v.isAdmin);
      if (!v.displayName) return;
      setMyTeamName(v.displayName);
      setMyLogo(isImageAvatar(v.logo) ? "⭐" : v.logo || "⭐");
    }).catch(() => {});
  }, []);

  const loadStandings = useCallback(async () => {
    try {
      // Il refresh deve aggiornare anche logo e nome personalizzato: prima
      // venivano letti soltanto al mount e in una PWA potevano restare vecchi.
      const [res, overrides] = await Promise.all([
        fetch("/api/standings", { cache: "no-store", headers: { Accept: "application/json" } }),
        fetchStandingsNameMap().catch((): Record<string, StandingsTeamInfo> => ({})),
      ]);
      if (!res.ok) throw new Error("Failed to fetch standings");
      const data = await res.json() as FantacalcioStandingsResult;
      setSourceError(data.error || "");
      const withLogos: StandingEntryWithLogo[] = (data.items || []).map((entry) => {
        const ov = overrides[entry.teamName];
        const displayName = ov?.displayName || entry.teamName;
        return {
          ...entry,
          displayName,
          logoUrl: ov?.logoUrl ?? null,
          logoEmoji: displayName === myTeamName ? myLogo : assignLogoToTeam(entry.teamName),
        };
      });
      setStandings(withLogos);
      setCurrentMatchday(data.currentMatchday ?? null);
      setLastUpdated(new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setStandings([]);
      setCurrentMatchday(null);
      setSourceError("Impossibile caricare la classifica. Riprova tra poco.");
    } finally {
      setLoading(false);
    }
  }, [myTeamName, myLogo]);

  useEffect(() => { loadStandings(); }, [loadStandings]);

  // Mantiene la classifica allineata al calcolo di fine giornata anche nelle
  // PWA lasciate aperte: aggiorna al ritorno in primo piano e ogni 5 minuti.
  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadStandings();
    };
    const interval = window.setInterval(refreshWhenVisible, 5 * 60 * 1000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadStandings]);

  async function refreshStandings() {
    setRefreshing(true);
    await loadStandings();
    setRefreshing(false);
  }

  async function toggleTeam(teamName: string) {
    if (expandedTeamName === teamName) {
      setExpandedTeamName(null);
      return;
    }
    setExpandedTeamName(teamName);
    if (rostersLoaded || loadingRosters) return;
    setLoadingRosters(true);
    try {
      setRosters(await fetchStandingsRosterMap());
      setRostersLoaded(true);
    } finally {
      setLoadingRosters(false);
    }
  }

  // Pull-to-refresh sulla classifica; sulla tab Trofei ci pensa TrofeiContent.
  useRegisterRefresh(tab === "classifica" ? refreshStandings : NOOP);

  const myEntry = standings.find((e) => e.displayName === myTeamName);
  const leader = standings[0];

  return (
    <div className="screen sec-rank">
      <PageHeader
        eyebrow={tab === "classifica" ? "Stagione 2025/26" : "Fanta Soccer Club"}
        title={tab === "classifica" ? "Classifica" : "Albo d'oro"}
        right={
          <div className="flex items-center gap-1">
            {tab === "classifica" && (
              <button type="button" onClick={refreshStandings} disabled={refreshing} className="tap rounded-2xl text-lg disabled:opacity-50"
                aria-label="Aggiorna la classifica"
                style={{ background: "color-mix(in srgb, var(--accent) 11%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", color: "var(--accent-soft)" }}>
                <span style={{ display: "inline-block", animation: refreshing ? "spin .8s linear infinite" : "none" }}>↻</span>
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
              style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}>
              🏆
            </div>
          </div>
        }
      >
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          items={[
            { key: "classifica" as TabKey, label: "Classifica" },
            { key: "trofei" as TabKey, label: "Trofei" },
          ]}
        />
      </PageHeader>

      <TabPanel tabKey={tab} keys={TAB_KEYS}>
        {tab === "trofei" ? <TrofeiContent /> : (
      <div className="px-4 pb-8 pt-4 flex flex-col gap-3">

        {loading && standings.length === 0 && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: i === 0 ? 96 : 60 }} />
        ))}

        {!loading && standings.length === 0 && (
          <div className="card-flat flex flex-col items-center py-10 px-5 gap-3 text-center">
            <span className="text-4xl">🏆</span>
            <p className="text-white/75 text-sm leading-relaxed">{sourceError || "Classifica non ancora disponibile."}</p>
            {isAdmin && sourceError && <p className="text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>Apri Bacheca → Gestione per controllare il link e sincronizzare le squadre.</p>}
            <button type="button" onClick={refreshStandings} disabled={refreshing} className="btn-primary min-h-[44px] px-5 text-sm disabled:opacity-50">
              {refreshing ? "Aggiorno…" : "Aggiorna classifica"}
            </button>
            {lastUpdated && <p className="text-xs" style={{ color: "var(--text-faint)" }}>Aggiornata alle {lastUpdated}</p>}
          </div>
        )}

        {/* HERO capolista */}
        {leader && (
          <div className="pop-in relative overflow-hidden rounded-3xl p-4"
            style={{
              background: "linear-gradient(140deg, color-mix(in srgb, var(--accent) 26%, var(--surface)), var(--surface) 75%)",
              border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
              boxShadow: "0 16px 40px -24px var(--accent-glow)",
            }}>
            <span className="absolute -top-3 right-1 text-7xl opacity-20 select-none">👑</span>
            <div className="flex items-center gap-3 relative">
              <Logo url={leader.logoUrl} fallback={leader.logoEmoji} size={54} radius={16} />
              <div className="flex-1 min-w-0">
                <p className="eyebrow">Capolista</p>
                <p className="font-display text-white font-bold text-lg leading-tight truncate">{leader.displayName}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>{leader.won}V · {leader.drawn}N · {leader.lost}P</p>
              </div>
              <div className="text-right">
                <p className="font-display text-white font-extrabold text-4xl leading-none">{leader.points}</p>
                <p className="text-xs mt-1" style={{ color: "var(--accent-soft)" }}>punti</p>
              </div>
            </div>
          </div>
        )}

        {/* La tua posizione */}
        {myEntry && myEntry.position !== 1 && (
          <div className="card-accent p-3.5 flex items-center gap-3">
            <span className="font-display font-extrabold text-2xl w-10 text-center flex-none" style={{ color: "var(--accent)" }}>{myEntry.position}°</span>
            <Logo url={myEntry.logoUrl} fallback={myEntry.logoEmoji} size={36} radius={12} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>La tua squadra</p>
              <p className="text-white font-semibold text-sm truncate">{myEntry.displayName}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-white font-bold text-lg leading-none">{myEntry.points}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>{myEntry.totalFp.toLocaleString("it-IT", { maximumFractionDigits: 0 })} fp</p>
            </div>
          </div>
        )}

        {/* Lista completa */}
        {standings.length > 0 && (
          <div className="card overflow-hidden mt-1">
            {standings.map((entry, i) => {
              const isMe = entry.displayName === myTeamName;
              const isExpanded = expandedTeamName === entry.teamName;
              const roster = rosters[entry.teamName] ?? [];
              return (
                <Fragment key={entry.teamName}>
                  <button type="button" onClick={() => toggleTeam(entry.teamName)} aria-expanded={isExpanded}
                    aria-controls={`team-detail-${entry.position}`}
                    className="w-full flex items-center gap-3 px-3.5 py-3 text-left tap"
                    style={{
                      background: isMe ? "color-mix(in srgb, var(--accent) 11%, transparent)" : "transparent",
                      borderTop: i === 0 ? "none" : "1px solid var(--border)",
                    }}>
                    <PositionBadge position={entry.position} />
                    <Logo url={entry.logoUrl} fallback={entry.logoEmoji} size={32} radius={10} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold truncate ${isMe ? "" : "text-white"}`} style={isMe ? { color: "var(--accent-soft)" } : undefined}>
                          {entry.displayName}
                        </span>
                        <span className="font-display text-white font-bold text-sm flex-none">{entry.points}</span>
                      </div>
                      <p className="mt-1 text-[11px] tabular-nums" style={{ color: "var(--text-dim)" }}>
                        {entry.won}-{entry.drawn}-{entry.lost} · {entry.goalDiff > 0 ? `+${entry.goalDiff}` : entry.goalDiff}
                      </p>
                    </div>
                    <span className="text-xs flex-none" style={{ color: "var(--text-faint)" }} aria-hidden="true">{isExpanded ? "▲" : "▼"}</span>
                  </button>

                  {isExpanded && (
                    <div id={`team-detail-${entry.position}`} className="px-3.5 pb-3.5" style={{ background: isMe ? "color-mix(in srgb, var(--accent) 7%, transparent)" : "rgba(255,255,255,0.018)", borderTop: "1px solid var(--border)" }}>
                      <CurrentMatchdayPanel matchday={currentMatchday} teamId={entry.teamId} teamName={entry.displayName} teams={standings} />

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="eyebrow text-[10px]">Rosa · {loadingRosters ? "caricamento…" : `${roster.length} giocatori`}</p>
                        {!loadingRosters && roster.length > 0 && <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>P · D · C · A</span>}
                      </div>
                      {loadingRosters && <p className="text-xs mt-2" style={{ color: "var(--text-dim)" }}>Carico la rosa…</p>}
                      {!loadingRosters && roster.length === 0 && <p className="text-xs mt-2" style={{ color: "var(--text-dim)" }}>Rosa in attesa della sincronizzazione automatica.</p>}
                      {!loadingRosters && roster.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                          {roster.map((player) => (
                            <div key={player.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5" style={{ background: "rgba(255,255,255,0.045)" }}>
                              {player.photoUrl
                                ? <img src={player.photoUrl} alt="" className="w-7 h-7 rounded-lg object-cover flex-none" />
                                : <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-none" style={{ background: "rgba(255,255,255,0.08)" }}>⚽</span>}
                              <span className="w-4 text-center text-[10px] font-bold flex-none" style={{ color: "var(--accent-soft)" }}>{player.role ?? "—"}</span>
                              <span className="text-sm text-white/90 truncate">{player.playerName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        )}

        {/* Punti totali fantacalcio */}
        {standings.length > 0 && standings.some((e) => e.totalFp > 0) && (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: "var(--text-faint)" }}>Punti totali fantacalcio</p>
            <div className="card overflow-hidden">
              {standings.slice().sort((a, b) => b.totalFp - a.totalFp).slice(0, 5).map((entry, i) => {
                const isMe = entry.displayName === myTeamName;
                return (
                  <div key={entry.teamName} className="flex items-center gap-3 px-3.5 py-2.5"
                    style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)", background: isMe ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent" }}>
                    <span className="text-xs w-4 flex-none" style={{ color: "var(--text-faint)" }}>{i + 1}</span>
                    <Logo url={entry.logoUrl} fallback={entry.logoEmoji} size={22} radius={7} />
                    <span className={`flex-1 text-sm truncate ${isMe ? "font-semibold" : "text-white"}`} style={isMe ? { color: "var(--accent-soft)" } : undefined}>{entry.displayName}</span>
                    <span className="font-display text-white font-bold text-sm">{entry.totalFp.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
        )}
      </TabPanel>
    </div>
  );
}
