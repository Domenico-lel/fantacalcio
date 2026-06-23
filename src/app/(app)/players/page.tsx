"use client";


import { useState, useEffect, useCallback } from "react";
import type { MarketItem } from "@/app/api/market/route";
import SegmentedTabs from "@/components/SegmentedTabs";

type TabKey = "voci" | "partite";

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ora";
  if (m < 60) return `${m}m fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h fa`;
  return `${Math.floor(h / 24)}g fa`;
}

// Badge automatico dedotto dal testo del post stile Romano
function newsBadge(text: string): { label: string; color: string } | null {
  const t = text.toLowerCase();
  if (/here we go/.test(t)) return { label: "🟢 Here we go!", color: "#22c55e" };
  if (/ufficiale|official/.test(t)) return { label: "Ufficiale", color: "#22c55e" };
  if (/visite mediche|medical/.test(t)) return { label: "Visite mediche", color: "#38bdf8" };
  if (/salta|saltat|sfumat|naufragat|niente da fare|si complica/.test(t)) return { label: "A rischio", color: "#ef4444" };
  return null;
}

function useMarketFeed() {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await fetch("/api/market");
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.items?.length) throw new Error();
      setItems(data.items as MarketItem[]);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { items, loading, error, load };
}

function ErrorState({ onRetry, label }: { onRetry: () => void; label: string }) {
  return (
    <div className="flex flex-col items-center py-16 gap-4">
      <span className="text-4xl">📡</span>
      <p className="text-white/50 text-sm text-center">{label}</p>
      <button onClick={onRetry} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}>Riprova</button>
    </div>
  );
}

/* ─── Tab "Voci di mercato" ──────────────────────────────────────────────── */
function VociTab({ items, loading, error, onRetry }: {
  items: MarketItem[]; loading: boolean; error: boolean; onRetry: () => void;
}) {
  const voci = items.filter((i) => i.kind === "mercato");
  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      {loading && Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)", height: 96 }} />
      ))}

      {!loading && error && <ErrorState onRetry={onRetry} label="Impossibile caricare le voci di mercato." />}

      {!loading && !error && voci.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-3">
          <span className="text-4xl">🔍</span>
          <p className="text-white/50 text-sm">Nessuna voce di mercato al momento.</p>
        </div>
      )}

      {!loading && !error && voci.map((item) => {
        const badge = newsBadge(item.text);
        const lines = item.text.split("\n").filter(Boolean);
        const title = lines[0] ?? "";
        const body = lines.slice(1).join("\n").trim();
        return (
          <div key={item.id} className="pop-in rounded-2xl p-3.5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: "var(--accent-bg)", color: "var(--accent-soft)" }}>Voci di mercato</span>
              {badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${badge.color}1f`, color: badge.color, border: `1px solid ${badge.color}55` }}>
                  {badge.label}
                </span>
              )}
              <span className="text-white/30 text-[10px] ml-auto flex-none">{timeAgo(item.postedAt)}</span>
            </div>
            <p className="text-white font-bold text-[14px] leading-snug">{title}</p>
            {body && <p className="text-white/55 text-[12.5px] leading-snug mt-1 whitespace-pre-line">{body}</p>}
          </div>
        );
      })}

      <div className="h-4" />
    </div>
  );
}

/* ─── Tab "Partite": gol e aggiornamenti live, partita in grande ─────────────── */
function PartiteTab({ items, loading, error, onRetry }: {
  items: MarketItem[]; loading: boolean; error: boolean; onRetry: () => void;
}) {
  const partite = items.filter((i) => i.kind === "match");
  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      {loading && Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)", height: 130 }} />
      ))}

      {!loading && error && <ErrorState onRetry={onRetry} label="Impossibile caricare le partite." />}

      {!loading && !error && partite.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-3">
          <span className="text-4xl">⚽</span>
          <p className="text-white/50 text-sm">Nessuna partita in corso al momento.</p>
        </div>
      )}

      {!loading && !error && partite.map((item, idx) => {
        const isLive = idx === 0;
        // Card "recap" senza dati strutturati
        if (!item.match) {
          const lines = item.text.split("\n").filter(Boolean);
          return (
            <div key={item.id} className="pop-in rounded-2xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: "var(--accent-bg)", color: "var(--accent-soft)" }}>Risultati</span>
                <span className="text-white/30 text-[10px]">{timeAgo(item.postedAt)}</span>
              </div>
              {lines.map((l, i) => (
                <p key={i} className={i === 0 ? "text-white/50 text-xs mb-1" : "text-white font-semibold text-sm leading-relaxed"}>{l}</p>
              ))}
            </div>
          );
        }

        const mt = item.match;
        const goalish = /goal|gol/i.test(mt.event ?? "");
        const evColor = goalish ? "#22c55e" : "var(--accent-soft)";
        const evBg = goalish ? "#22c55e1f" : "var(--accent-bg)";
        return (
          <div key={item.id} className="pop-in rounded-2xl p-4"
            style={{
              background: "var(--surface)",
              border: isLive ? "1px solid var(--accent)" : "1px solid var(--border)",
              boxShadow: isLive ? "0 0 16px var(--accent-glow)" : "none",
            }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isLive && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#ef4444" }}>
                    <span className="status-dot" style={{ width: 7, height: 7, background: "#ef4444" }} />DIRETTA
                  </span>
                )}
                {mt.event && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: evBg, color: evColor }}>{mt.event}</span>
                )}
              </div>
              <span className="text-white/30 text-[10px]">{timeAgo(item.postedAt)}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 flex flex-col items-center text-center min-w-0">
                <span className="text-3xl leading-none">{mt.homeFlag ?? "⚽"}</span>
                <span className="text-white font-bold text-sm mt-1.5 truncate w-full">{mt.home}</span>
              </div>
              <div className="flex flex-col items-center px-1 flex-none">
                <span className="text-white font-black text-3xl leading-none tracking-tight">{mt.score ?? "vs"}</span>
                {mt.minute && <span className="text-[11px] font-bold mt-1" style={{ color: "var(--accent-soft)" }}>{mt.minute}</span>}
              </div>
              <div className="flex-1 flex flex-col items-center text-center min-w-0">
                <span className="text-3xl leading-none">{mt.awayFlag ?? "⚽"}</span>
                <span className="text-white font-bold text-sm mt-1.5 truncate w-full">{mt.away}</span>
              </div>
            </div>

            {(mt.scorer || mt.assist) && (
              <div className="mt-3 pt-3 flex flex-col gap-1" style={{ borderTop: "1px solid var(--border)" }}>
                {mt.scorer && <p className="text-white/80 text-xs">⚽ <span className="font-semibold">{mt.scorer}</span></p>}
                {mt.assist && <p className="text-white/50 text-xs">👟 {mt.assist}</p>}
              </div>
            )}
          </div>
        );
      })}

      <div className="h-4" />
    </div>
  );
}

export default function MercatoPage() {
  const [tab, setTab] = useState<TabKey>("voci");
  const feed = useMarketFeed();

  return (
    <div className="screen sec-market">
      {/* Header */}
      <div className="sec-header px-4 pt-12 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent-soft)" }}>Calciomercato</p>
        <h1 className="text-white font-bold text-2xl leading-tight mb-3">Mercato</h1>
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          items={[
            { key: "voci" as TabKey, label: "Voci di mercato" },
            { key: "partite" as TabKey, label: "Partite" },
          ]}
        />
      </div>

      {tab === "voci" && <VociTab {...feed} onRetry={feed.load} />}
      {tab === "partite" && <PartiteTab {...feed} onRetry={feed.load} />}
    </div>
  );
}
