"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchAllTrophies, type Trophy } from "@/app/actions";
import { loadState } from "@/lib/store";
import SegmentedTabs from "@/components/SegmentedTabs";

type TabKey = "stagioni" | "record" | "manager";

const MEDAL: Record<number, { label: string; color: string }> = {
  1: { label: "ORO", color: "#f5c518" },
  2: { label: "ARGENTO", color: "#c8d2dc" },
  3: { label: "BRONZO", color: "#cd7f32" },
};

/* Albo d'oro della Coppa — competizione a parte (solo il vincitore di ogni edizione).
   Il primo elemento è l'edizione più recente. */
const COPPA: { season: string; winner: string }[] = [
  { season: "2025/26", winner: "Damiano" },
  { season: "2024/25", winner: "Matteo" },
];

interface SeasonGroup {
  year: number;
  season: string;
  rows: Trophy[];
  podium: Trophy[];
  champion?: Trophy;
}

function initial(name: string) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

function groupSeasons(trophies: Trophy[]): SeasonGroup[] {
  const map = new Map<string, Trophy[]>();
  for (const t of trophies) {
    const key = t.season || String(t.year);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  const groups: SeasonGroup[] = [];
  for (const rows of map.values()) {
    const sorted = [...rows].sort((a, b) => a.position - b.position);
    groups.push({
      year: rows[0].year,
      season: rows[0].season,
      rows: sorted,
      podium: sorted.filter((r) => r.position >= 1 && r.position <= 3),
      champion: rows.find((r) => r.position === 1),
    });
  }
  return groups.sort((a, b) => b.year - a.year);
}

function sameName(a?: string, b?: string) {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/* ─── Avatar tondo con iniziale ─────────────────────────────────────────────── */
function Avatar({ name, size, ring }: { name: string; size: number; ring: string }) {
  return (
    <div className="rounded-full flex items-center justify-center font-black flex-none"
      style={{
        width: size, height: size, fontSize: size * 0.42, color: ring,
        background: "rgba(255,255,255,0.06)", border: `2px solid ${ring}`,
      }}>
      {initial(name)}
    </div>
  );
}

/* ─── Card stagione in evidenza con podio ──────────────────────────────────── */
function FeaturedSeason({ g }: { g: SeasonGroup }) {
  const p1 = g.podium.find((r) => r.position === 1);
  const p2 = g.podium.find((r) => r.position === 2);
  const p3 = g.podium.find((r) => r.position === 3);

  const Step = ({ row, place, h, color }: { row?: Trophy; place: number; h: number; color: string }) => (
    <div className="flex-1 flex flex-col items-center justify-end">
      <span className="text-white/90 text-[12px] font-semibold truncate max-w-full mb-2 px-1">
        {row?.display_name ?? "—"}
      </span>
      <div className="w-full rounded-t-xl flex items-start justify-center pt-2 font-black"
        style={{ height: h, background: `${color}22`, border: `1px solid ${color}55`, borderBottom: "none", color }}>
        <span style={{ fontSize: place === 1 ? 26 : 20 }}>{place}°</span>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--accent-soft)" }}>
          Stagione {g.season}
        </span>
        <span className="text-white/35 text-[11px] font-semibold uppercase tracking-wider">Conclusa</span>
      </div>

      {/* Avatar row con corona sul 1° */}
      <div className="flex items-end justify-center gap-6 mb-3">
        <div className="flex flex-col items-center gap-1.5">
          <Avatar name={p2?.display_name ?? "—"} size={54} ring={MEDAL[2].color} />
        </div>
        <div className="flex flex-col items-center gap-1.5 relative">
          <span className="absolute -top-6 text-2xl">👑</span>
          <Avatar name={p1?.display_name ?? "—"} size={66} ring={MEDAL[1].color} />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Avatar name={p3?.display_name ?? "—"} size={54} ring={MEDAL[3].color} />
        </div>
      </div>

      {/* Podio a blocchi */}
      <div className="flex items-end gap-2 mb-1" style={{ minHeight: 96 }}>
        <Step row={p2} place={2} h={64} color={MEDAL[2].color} />
        <Step row={p1} place={1} h={92} color={MEDAL[1].color} />
        <Step row={p3} place={3} h={48} color={MEDAL[3].color} />
      </div>
    </div>
  );
}

/* ─── Riga stagione precedente ─────────────────────────────────────────────── */
function SeasonRow({ g, myName }: { g: SeasonGroup; myName: string }) {
  const mine = g.rows.find((r) => sameName(r.display_name, myName));
  const medal = mine && MEDAL[mine.position] ? MEDAL[mine.position] : null;
  const champ = g.champion;
  return (
    <div className="flex items-center gap-3 rounded-2xl px-3 py-3"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `3px solid ${medal?.color ?? "var(--border)"}` }}>
      <span className="text-[13px] font-bold tabular-nums" style={{ color: "var(--accent-soft)" }}>{g.season}</span>
      {medal && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-none"
          style={{ background: `${medal.color}1f`, color: medal.color, border: `1px solid ${medal.color}66` }}>
          {medal.label}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white text-[13px] font-semibold truncate">🏆 {champ?.display_name ?? "—"}</p>
      </div>
    </div>
  );
}

/* ─── La Coppa: competizione separata, solo il vincitore per edizione ───────── */
function CoppaSection({ myName }: { myName: string }) {
  return (
    <>
      <div className="flex items-center justify-between mt-1 px-1">
        <span className="text-white/40 text-[11px] font-bold uppercase tracking-widest">🏆 La Coppa</span>
        <span className="text-white/30 text-[11px] tabular-nums">{COPPA.length} edizioni</span>
      </div>
      <div className="flex flex-col gap-2">
        {COPPA.map((c, i) => {
          const current = i === 0;
          const mine = sameName(c.winner, myName);
          return (
            <div key={c.season} className="flex items-center gap-3 rounded-2xl px-3 py-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `3px solid ${current ? "#f5c518" : "var(--border)"}` }}>
              <Avatar name={c.winner} size={40} ring={current ? "#f5c518" : "rgba(255,255,255,0.25)"} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">
                  {c.winner}{mine && <span className="text-white/40 font-semibold"> · tu</span>}
                </p>
                <p className="text-white/40 text-[11px] font-semibold">{current ? "Vincitore in carica" : "Campione"}</p>
              </div>
              <span className="text-[13px] font-bold tabular-nums flex-none" style={{ color: "var(--accent-soft)" }}>{c.season}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─── Tab Manager: classifica per persona ──────────────────────────────────── */
function ManagerTab({ groups }: { groups: SeasonGroup[] }) {
  const stats = useMemo(() => {
    const map = new Map<string, { name: string; titles: number; podiums: number; seasons: number }>();
    const get = (name: string) => {
      const k = name.trim().toLowerCase();
      if (!map.has(k)) map.set(k, { name, titles: 0, podiums: 0, seasons: 0 });
      return map.get(k)!;
    };
    for (const g of groups) {
      for (const r of g.rows) {
        const s = get(r.display_name);
        s.seasons++;
        if (r.position === 1) s.titles++;
        if (r.position <= 3) s.podiums++;
      }
    }
    return [...map.values()].sort((a, b) => b.titles - a.titles || b.podiums - a.podiums);
  }, [groups]);

  return (
    <div className="px-4 py-4 flex flex-col gap-2">
      {stats.map((s, i) => (
        <div key={s.name} className="flex items-center gap-3 rounded-2xl px-3 py-3"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <span className="w-6 text-center font-black text-sm flex-none"
            style={{ color: i < 3 ? "var(--accent)" : "rgba(255,255,255,0.4)" }}>{i + 1}</span>
          <Avatar name={s.name} size={38} ring={i === 0 ? "#f5c518" : "rgba(255,255,255,0.25)"} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold truncate">{s.name}</p>
            <p className="text-white/40 text-[11px]">{s.podiums} {s.podiums === 1 ? "podio" : "podi"}</p>
          </div>
          <div className="flex items-center gap-1 flex-none">
            <span className="text-lg">🏆</span>
            <span className="text-white font-black text-lg tabular-nums">{s.titles}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Tab Record: primati della lega ───────────────────────────────────────── */
function RecordTab({ groups }: { groups: SeasonGroup[] }) {
  const rec = useMemo(() => {
    const titleMap = new Map<string, number>();
    for (const g of groups) {
      const champ = g.champion;
      if (champ) titleMap.set(champ.display_name, (titleMap.get(champ.display_name) ?? 0) + 1);
    }
    const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    return { mostTitles: top(titleMap), seasons: groups.length };
  }, [groups]);

  const currentChamp = groups[0]?.champion;
  const currentCup = COPPA[0];

  const Card = ({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) => (
    <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <span className="text-3xl flex-none">{icon}</span>
      <div className="min-w-0">
        <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-white font-black text-lg leading-tight truncate">{value}</p>
        {sub && <p className="text-white/45 text-xs truncate">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <Card icon="📚" label="Stagioni giocate" value={`${rec.seasons}`} />
      {rec.mostTitles && <Card icon="👑" label="Più titoli" value={rec.mostTitles[0]} sub={`${rec.mostTitles[1]} scudetti`} />}
      {currentChamp && <Card icon="🛡️" label="Campione in carica" value={currentChamp.display_name} sub={`Stagione ${groups[0].season}`} />}
      {currentCup && <Card icon="🏆" label="Coppa in carica" value={currentCup.winner} sub={`Stagione ${currentCup.season}`} />}
    </div>
  );
}

export default function TrofeiPage() {
  const [tab, setTab] = useState<TabKey>("stagioni");
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [loading, setLoading] = useState(true);
  const [myName, setMyName] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setMyName(loadState().profile?.firstName ?? "");
    fetchAllTrophies()
      .then((r) => setTrophies(r.data))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => groupSeasons(trophies), [trophies]);
  const featured = groups[0];
  const previous = groups.slice(1);
  const minYear = groups.length ? Math.min(...groups.map((g) => g.year)) : null;
  const shownPrev = showAll ? previous : previous.slice(0, 5);

  return (
    <div className="screen sec-trophy">
      {/* Header */}
      <div className="sec-header px-4 pt-12 pb-3">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">🏆</span>
          <h1 className="text-white font-bold text-3xl leading-none">Trofei</h1>
        </div>
        <p className="text-white/55 text-sm">L&apos;albo d&apos;oro del Soccer Dick Club</p>
        {groups.length > 0 && (
          <p className="text-[12px] font-semibold tracking-wide mt-0.5" style={{ color: "var(--accent-soft)" }}>
            {groups.length} stagioni · dal {minYear}
          </p>
        )}
        <div className="mt-3">
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            items={[
              { key: "stagioni" as TabKey, label: "Stagioni" },
              { key: "record" as TabKey, label: "Record" },
              { key: "manager" as TabKey, label: "Manager" },
            ]}
          />
        </div>
      </div>

      {loading && (
        <div className="px-4 py-4 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)", height: i === 0 ? 280 : 64 }} />
          ))}
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="flex flex-col items-center py-20 gap-3">
          <span className="text-5xl">🏆</span>
          <p className="text-white/50 text-sm text-center px-8">
            L&apos;albo d&apos;oro è ancora vuoto.<br />I trofei delle stagioni passate appariranno qui.
          </p>
        </div>
      )}

      {!loading && groups.length > 0 && tab === "stagioni" && (
        <div className="px-4 py-4 flex flex-col gap-4">
          {featured && <FeaturedSeason g={featured} />}

          {previous.length > 0 && (
            <>
              <div className="flex items-center justify-between mt-1 px-1">
                <span className="text-white/40 text-[11px] font-bold uppercase tracking-widest">Stagioni precedenti</span>
                <span className="text-white/30 text-[11px] tabular-nums">{previous.length} / {groups.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {shownPrev.map((g) => <SeasonRow key={g.season} g={g} myName={myName} />)}
              </div>
              {previous.length > 5 && (
                <button onClick={() => setShowAll((v) => !v)}
                  className="self-start text-sm font-bold mt-1" style={{ color: "var(--accent)" }}>
                  {showAll ? "Mostra meno" : `Mostra tutte le ${groups.length} stagioni →`}
                </button>
              )}
            </>
          )}

          <CoppaSection myName={myName} />
          <div className="h-4" />
        </div>
      )}

      {!loading && groups.length > 0 && tab === "record" && <RecordTab groups={groups} />}
      {!loading && groups.length > 0 && tab === "manager" && <ManagerTab groups={groups} />}
    </div>
  );
}
