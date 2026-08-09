"use client";

import { useCallback, useEffect, useState } from "react";
import { loadViewerCache } from "@/lib/store";
import { getCurrentViewer } from "@/app/social-actions";
import { fetchStandingsNameMap, type StandingsTeamInfo } from "@/app/teams-actions";
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

export default function StandingsPage() {
  const [tab, setTab] = useState<TabKey>("classifica");
  const [myTeamName, setMyTeamName] = useState("La tua Squadra");
  const [myLogo, setMyLogo] = useState("⭐");
  const [standings, setStandings] = useState<StandingEntryWithLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, StandingsTeamInfo>>({});
  const [sourceError, setSourceError] = useState("");

  useEffect(() => {
    // Identità autorevole dal server (stessa fonte dell'header), con paint immediato dalla cache.
    // localStorage da solo era inaffidabile: il nome squadra non combaciava con la classifica
    // e la "tua posizione" non veniva evidenziata.
    const cached = loadViewerCache();
    if (cached?.displayName) setMyTeamName(cached.displayName);
    if (cached?.logo && !isImageAvatar(cached.logo)) setMyLogo(cached.logo);
    getCurrentViewer().then((v) => {
      if (!v?.displayName) return;
      setMyTeamName(v.displayName);
      setMyLogo(isImageAvatar(v.logo) ? "⭐" : v.logo || "⭐");
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchStandingsNameMap().then(setOverrides).catch(() => {});
  }, []);

  function Logo({ url, fallback, size, radius = 50 }: { url: string | null; fallback: string; size: number; radius?: number }) {
    if (url) return <img src={url} alt="" className="object-cover flex-none" style={{ width: size, height: size, borderRadius: radius }} />;
    return (
      <span className="flex-none flex items-center justify-center"
        style={{ width: size, height: size, borderRadius: radius, background: "rgba(255,255,255,0.07)", fontSize: size * 0.5 }}>
        {fallback}
      </span>
    );
  }

  const loadStandings = useCallback(async () => {
    try {
      const res = await fetch("/api/standings");
      if (!res.ok) throw new Error("Failed to fetch standings");
      const data = await res.json();
      setSourceError(data.error || "");
      const withLogos: StandingEntryWithLogo[] = (data.items || []).map((entry: any) => {
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
    } catch {
      setStandings([]);
      setSourceError("Impossibile caricare la classifica. Riprova tra poco.");
    } finally {
      setLoading(false);
    }
  }, [myTeamName, myLogo, overrides]);

  useEffect(() => { loadStandings(); }, [loadStandings]);

  // Pull-to-refresh sulla classifica; sulla tab Trofei ci pensa TrofeiContent.
  useRegisterRefresh(tab === "classifica" ? loadStandings : NOOP);

  const myEntry = standings.find((e) => e.displayName === myTeamName);
  const leader = standings[0];
  const maxPoints = leader?.points || 1;

  return (
    <div className="screen sec-rank">
      <PageHeader
        eyebrow={tab === "classifica" ? "Stagione 2025/26" : "Fanta Soccer Club"}
        title={tab === "classifica" ? "Classifica" : "Albo d'oro"}
        right={
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
            style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}>
            🏆
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
      <div className="px-4 pb-24 pt-4 flex flex-col gap-3">

        {loading && standings.length === 0 && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: i === 0 ? 96 : 60 }} />
        ))}

        {!loading && standings.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <span className="text-4xl">🏆</span>
            <p className="text-white/50 text-sm">{sourceError || "Classifica non ancora disponibile."}</p>
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
              const pct = Math.max(6, Math.round((entry.points / maxPoints) * 100));
              return (
                <div key={entry.position}
                  className="flex items-center gap-3 px-3.5 py-3"
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
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: isMe ? "var(--accent-grad)" : "rgba(255,255,255,0.28)" }} />
                      </div>
                      <span className="text-[11px] flex-none tabular-nums" style={{ color: "var(--text-dim)" }}>
                        {entry.won}-{entry.drawn}-{entry.lost} · {entry.goalDiff > 0 ? `+${entry.goalDiff}` : entry.goalDiff}
                      </span>
                    </div>
                  </div>
                </div>
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
