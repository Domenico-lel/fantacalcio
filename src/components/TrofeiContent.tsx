"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { fetchAllTrophies, type Trophy } from "@/app/actions";
import { loadState } from "@/lib/store";
import SegmentedTabs from "@/components/SegmentedTabs";
import { useRegisterRefresh } from "@/components/PullToRefresh";

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

/* ─── Statistiche per manager: scudetti (1° posto) + coppe ─────────────────── */
interface ManagerStat {
  name: string;
  titles: number;       // scudetti (1° in classifica)
  cups: number;         // coppe vinte
  titleSeasons: string[];
  cupSeasons: string[];
  total: number;        // scudetti + coppe
}

function computeManagerStats(groups: SeasonGroup[]): ManagerStat[] {
  const map = new Map<string, ManagerStat>();
  const get = (name: string) => {
    const k = name.trim().toLowerCase();
    let s = map.get(k);
    if (!s) { s = { name, titles: 0, cups: 0, titleSeasons: [], cupSeasons: [], total: 0 }; map.set(k, s); }
    return s;
  };
  // Scudetti (1° posto), in ordine cronologico
  for (const g of [...groups].reverse()) {
    if (!g.champion) continue;
    const s = get(g.champion.display_name);
    s.titles++;
    s.titleSeasons.push(g.season || String(g.year));
  }
  // Coppe (competizione separata), dalla più vecchia alla più recente
  for (const c of [...COPPA].reverse()) {
    const s = get(c.winner);
    s.cups++;
    s.cupSeasons.push(c.season);
  }
  for (const s of map.values()) s.total = s.titles + s.cups;
  // Ordine: trofei totali, poi scudetti, poi nome
  return [...map.values()].sort((a, b) => b.total - a.total || b.titles - a.titles || a.name.localeCompare(b.name));
}

/* Conteggio trofei: "N🏆" per gli scudetti e "+N🏅" per le coppe.
   Chi ha vinto solo la coppa (es. Matteo) mostra solo "N🏅". */
function TrophyTally({ titles, cups, size = 12 }: { titles: number; cups: number; size?: number }) {
  if (titles === 0 && cups === 0) return null;
  return (
    <span className="font-bold whitespace-nowrap leading-none" style={{ fontSize: size }}>
      {titles > 0 && `${titles}🏆`}
      {cups > 0 && (titles > 0 ? ` +${cups}🏅` : `${cups}🏅`)}
    </span>
  );
}

/* Testa del podio: corona (solo 1°) + avatar + nome, allineati alla stessa base. */
function PodiumHead({ row, size, ring, crown = false }: { row?: ManagerStat; size: number; ring: string; crown?: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-end gap-1.5">
      {/* placeholder corona su tutte le colonne → avatar allineati */}
      <span className="text-xl leading-none" style={{ visibility: crown ? "visible" : "hidden" }}>👑</span>
      <Avatar name={row?.name ?? "—"} size={size} ring={ring} />
      <span className="text-white/90 text-[13px] font-semibold truncate max-w-full text-center px-1">{row?.name ?? "—"}</span>
    </div>
  );
}

/* Blocco del podio: solo numero posizione + conteggio trofei (niente nome → niente sfalsamenti). */
function PodiumBlock({ row, place, h, color }: { row?: ManagerStat; place: number; h: number; color: string }) {
  return (
    <div className="flex-1 flex flex-col justify-end">
      <div className="w-full rounded-t-xl flex flex-col items-center justify-center gap-1 font-black"
        style={{ height: h, background: `${color}22`, border: `1px solid ${color}55`, borderBottom: "none", color }}>
        <span style={{ fontSize: place === 1 ? 24 : 18 }}>{place}°</span>
        {row && <TrophyTally titles={row.titles} cups={row.cups} />}
      </div>
    </div>
  );
}

function AllTimePodium({ groups }: { groups: SeasonGroup[] }) {
  const ranked = useMemo(() => computeManagerStats(groups), [groups]);
  const [p1, p2, p3] = ranked;

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px] font-bold uppercase tracking-widest" style={{ color: "var(--accent-soft)" }}>
          Classifica trofei
        </span>
        <span className="text-white/45 text-[11px] font-semibold uppercase tracking-wider">Tutti i tempi</span>
      </div>

      {/* Teste del podio (corona sul 1°) */}
      <div className="flex items-end justify-center gap-3 mb-3">
        <PodiumHead row={p2} size={54} ring={MEDAL[2].color} />
        <PodiumHead row={p1} size={66} ring={MEDAL[1].color} crown />
        <PodiumHead row={p3} size={54} ring={MEDAL[3].color} />
      </div>

      {/* Podio a blocchi — l'altezza indica la posizione, il numero i trofei vinti */}
      <div className="flex items-end gap-2" style={{ minHeight: 92 }}>
        <PodiumBlock row={p2} place={2} h={64} color={MEDAL[2].color} />
        <PodiumBlock row={p1} place={1} h={92} color={MEDAL[1].color} />
        <PodiumBlock row={p3} place={3} h={48} color={MEDAL[3].color} />
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
      <span className="text-[14px] font-bold tabular-nums" style={{ color: "var(--accent-soft)" }}>{g.season}</span>
      {medal && (
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-none"
          style={{ background: `${medal.color}1f`, color: medal.color, border: `1px solid ${medal.color}66` }}>
          {medal.label}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white text-[14px] font-semibold truncate">🏆 {champ?.display_name ?? "—"}</p>
      </div>
    </div>
  );
}

/* ─── La Coppa: competizione separata, solo il vincitore per edizione ───────── */
function CoppaSection({ myName }: { myName: string }) {
  return (
    <>
      <div className="flex items-center justify-between mt-1 px-1">
        <span className="text-white/50 text-[12px] font-bold uppercase tracking-widest">🏆 La Coppa</span>
        <span className="text-white/40 text-[11px] tabular-nums">{COPPA.length} edizioni</span>
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
                  {c.winner}{mine && <span className="text-white/50 font-semibold"> · tu</span>}
                </p>
                <p className="text-white/50 text-[12px] font-semibold">{current ? "Vincitore in carica" : "Campione"}</p>
              </div>
              <span className="text-[14px] font-bold tabular-nums flex-none" style={{ color: "var(--accent-soft)" }}>{c.season}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─── Tab Manager: albo dei campioni (scudetti + coppe) ────────────────────── */
function ManagerTab({ groups }: { groups: SeasonGroup[] }) {
  const stats = useMemo(() => computeManagerStats(groups), [groups]);

  return (
    <div className="px-4 py-4 flex flex-col gap-2">
      {stats.map((s, i) => {
        // Sottotitolo: stagioni degli scudetti + edizioni di coppa (con 🏅)
        const lines = [...s.titleSeasons, ...s.cupSeasons.map((x) => `🏅 ${x}`)];
        return (
          <div key={s.name} className="flex items-center gap-3 rounded-2xl px-3 py-3"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <span className="w-6 text-center font-black text-sm flex-none"
              style={{ color: i < 3 ? "var(--accent)" : "rgba(255,255,255,0.45)" }}>{i + 1}</span>
            <Avatar name={s.name} size={38} ring={i === 0 ? "#f5c518" : "rgba(255,255,255,0.25)"} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold truncate">{s.name}</p>
              <p className="text-white/50 text-[12px] truncate">{lines.join(" · ")}</p>
            </div>
            <div className="flex items-center gap-2 flex-none">
              {s.titles > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-lg">🏆</span>
                  <span className="text-white font-black text-lg tabular-nums">{s.titles}</span>
                </span>
              )}
              {s.cups > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-lg">🏅</span>
                  <span className="text-white font-black text-lg tabular-nums">{s.cups}</span>
                </span>
              )}
            </div>
          </div>
        );
      })}
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
        <p className="text-white/50 text-[12px] font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-white font-black text-lg leading-tight truncate">{value}</p>
        {sub && <p className="text-white/55 text-[13px] truncate">{sub}</p>}
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

/* Albo d'oro del club — vive dentro la sezione Classifica e ne eredita il
   tema (viola), con le sotto-linguette Stagioni / Record / Manager. */
export default function TrofeiContent() {
  const [tab, setTab] = useState<TabKey>("stagioni");
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [loading, setLoading] = useState(true);
  const [myName, setMyName] = useState("");
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    const r = await fetchAllTrophies();
    setTrophies(r.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    setMyName(loadState().profile?.firstName ?? "");
    load();
  }, [load]);
  useRegisterRefresh(load);

  const groups = useMemo(() => groupSeasons(trophies), [trophies]);
  const minYear = groups.length ? Math.min(...groups.map((g) => g.year)) : null;
  const shownSeasons = showAll ? groups : groups.slice(0, 5);

  return (
    <div>
      <div className="px-4 pt-4">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          items={[
            { key: "stagioni" as TabKey, label: "Stagioni" },
            { key: "record" as TabKey, label: "Record" },
            { key: "manager" as TabKey, label: "Manager" },
          ]}
        />
        {groups.length > 0 && (
          <p className="text-[13px] font-semibold tracking-wide mt-3 px-1" style={{ color: "var(--accent-soft)" }}>
            L&apos;albo d&apos;oro del Soccer Dick Club · {groups.length} stagioni dal {minYear}
          </p>
        )}
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
          <p className="text-white/55 text-sm text-center px-8">
            L&apos;albo d&apos;oro è ancora vuoto.<br />I trofei delle stagioni passate appariranno qui.
          </p>
        </div>
      )}

      {!loading && groups.length > 0 && tab === "stagioni" && (
        <div className="px-4 py-4 flex flex-col gap-4">
          <AllTimePodium groups={groups} />

          {groups.length > 0 && (
            <>
              <div className="flex items-center justify-between mt-1 px-1">
                <span className="text-white/50 text-[12px] font-bold uppercase tracking-widest">Stagione per stagione</span>
                <span className="text-white/40 text-[11px] tabular-nums">{groups.length} stagioni</span>
              </div>
              <div className="flex flex-col gap-2">
                {shownSeasons.map((g) => <SeasonRow key={g.season} g={g} myName={myName} />)}
              </div>
              {groups.length > 5 && (
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
