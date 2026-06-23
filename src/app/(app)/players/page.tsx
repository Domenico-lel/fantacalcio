"use client";


import { useState, useEffect, useCallback } from "react";
import type { TransferItem } from "@/app/api/transfers/route";
import type { MarketNewsItem } from "@/app/api/market/route";
import SegmentedTabs from "@/components/SegmentedTabs";

type TabKey = "voci" | "trattative";

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

// Stato trattativa: verde = quasi fatta, giallo = probabilità bassa, rosso = a rischio/saltata
function dealStatus(probability: number, trend: TransferItem["trend"]) {
  if (trend === "down" || probability < 35) return { color: "#ef4444", label: "A rischio" };
  if (probability >= 65) return { color: "#22c55e", label: "Quasi fatta" };
  return { color: "#eab308", label: "Probabilità bassa" };
}

// Badge automatico dedotto dal testo del post stile Romano
function newsBadge(text: string): { label: string; color: string } | null {
  const t = text.toLowerCase();
  if (/here we go/.test(t)) return { label: "🟢 Here we go!", color: "#22c55e" };
  if (/ufficiale|official|✅/.test(t)) return { label: "Ufficiale", color: "#22c55e" };
  if (/visite mediche|medical/.test(t)) return { label: "Visite mediche", color: "#38bdf8" };
  if (/salta|saltat|sfumat|naufragat|niente da fare|si complica/.test(t)) return { label: "A rischio", color: "#ef4444" };
  if (/goal|gol!|inizio|intervallo|fine partita|fischio/.test(t)) return { label: "Live", color: "#f59e0b" };
  return null;
}

function PlayerSheet({ item, onClose }: { item: TransferItem; onClose: () => void }) {
  const ds = dealStatus(item.probability, item.trend);
  const profileUrl = item.player.playerSlug && item.player.playerId
    ? `https://www.transfermarkt.it/${item.player.playerSlug}/profil/spieler/${item.player.playerId}`
    : null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
        style={{ background: "var(--bg)", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "90dvh" }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="rounded-full" style={{ width: 36, height: 4, background: "rgba(255,255,255,0.2)" }} />
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "calc(90dvh - 20px)" }}>
          {/* Hero */}
          <div className="relative flex items-end gap-4 px-5 pb-5 pt-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {/* Foto */}
            <div className="relative flex-shrink-0 rounded-2xl overflow-hidden"
              style={{ width: 90, height: 110, background: "rgba(255,255,255,0.05)" }}>
              {item.player.photoUrl && (
                <img src={item.player.photoUrl} alt={item.player.name}
                  className="absolute inset-0 w-full h-full object-contain object-bottom" />
              )}
            </div>

            {/* Info testo */}
            <div className="flex-1 min-w-0 pb-1">
              <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wide mb-0.5">
                {item.player.position || ""}
              </p>
              <h2 className="text-white font-black text-xl leading-tight mb-1">
                {item.player.name}
              </h2>
              {item.player.value && (
                <p className="font-bold text-sm mt-1" style={{ color: "var(--accent-soft)" }}>{item.player.value}</p>
              )}
            </div>
          </div>

          {/* Link profilo */}
          <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            {profileUrl ? (
              <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)" }}>
                Vedi profilo su Transfermarkt
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6l-12 12M18 6h-5v5M18 6v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            ) : (
              <p className="text-white/30 text-sm">Profilo non disponibile</p>
            )}
          </div>

          {/* Lega badge + chiudi */}
          <div className="px-5 pb-8 pt-2 flex items-center justify-between">
            <span className="text-white/30 text-xs">{item.league}</span>
            <button onClick={onClose}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white/70 active:opacity-60"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Tab "Voci di mercato": mirror del canale Telegram pubblico ─────────────── */
function VociTab() {
  const [items, setItems] = useState<MarketNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await fetch("/api/market");
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.items?.length) throw new Error();
      setItems(data.items);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      {loading && Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)", height: 110 }} />
      ))}

      {!loading && error && (
        <div className="flex flex-col items-center py-16 gap-4">
          <span className="text-4xl">📡</span>
          <p className="text-white/50 text-sm text-center">Impossibile caricare le voci di mercato.</p>
          <button onClick={load} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}>Riprova</button>
        </div>
      )}

      {!loading && !error && items.map((item) => {
        const badge = newsBadge(item.text);
        const lines = item.text.split("\n");
        const title = lines[0] ?? "";
        const body = lines.slice(1).join("\n").trim();
        return (
          <div key={item.id} className="pop-in rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {item.imageUrl && (
              <img src={item.imageUrl} alt="" className="w-full max-h-52 object-cover" loading="lazy"
                onError={(e) => { e.currentTarget.style.display = "none"; }} />
            )}
            <div className="p-3.5">
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
              {body && (
                <p className="text-white/55 text-[12.5px] leading-snug mt-1 whitespace-pre-line">{body}</p>
              )}
            </div>
          </div>
        );
      })}

      <div className="h-4" />
    </div>
  );
}

/* ─── Tab "Trattative": feed Transfermarkt con probabilità ──────────────────── */
function TrattativeTab() {
  const [items, setItems]       = useState<TransferItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [selected, setSelected] = useState<TransferItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await fetch("/api/transfers");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items ?? []);
    } catch { setError(true); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {loading && Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-3xl overflow-hidden animate-pulse"
          style={{ background: "rgba(255,255,255,0.05)", height: 160 }} />
      ))}

      {!loading && error && (
        <div className="flex flex-col items-center py-16 gap-4">
          <span className="text-4xl">📡</span>
          <p className="text-white/50 text-sm text-center">
            Impossibile caricare le trattative.<br />Controlla la connessione.
          </p>
          <button onClick={load}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}>
            Riprova
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-3">
          <span className="text-4xl">🔍</span>
          <p className="text-white/50 text-sm">Nessuna trattativa disponibile.</p>
        </div>
      )}

      {!loading && !error && items.map((item) => {
        const ds = dealStatus(item.probability, item.trend);
        return (
          <button key={item.id} onClick={() => setSelected(item)}
            className="flex rounded-2xl overflow-hidden active:opacity-75 transition-opacity text-left w-full"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", minHeight: 160 }}>

            {/* Foto giocatore */}
            <div className="relative flex-shrink-0" style={{ width: 110 }}>
              <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.03)" }} />
              {item.player.photoUrl ? (
                <img src={item.player.photoUrl} alt={item.player.name}
                  className="absolute inset-0 w-full h-full object-contain object-bottom"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.opacity = "0"; }} />
              ) : (
                <div className="absolute inset-0 flex items-end justify-center pb-2 text-5xl">👤</div>
              )}
              <div className="absolute inset-0"
                style={{ background: "linear-gradient(to right, transparent 60%, rgba(10,15,29,0.95) 100%)" }} />
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-between px-3 py-3 min-w-0">
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="text-white/50 text-[10px] font-medium leading-tight">{item.player.position}</p>
                    <p className="text-white font-black text-base leading-tight truncate">{item.player.name}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full"
                    style={{ background: `${ds.color}1f`, border: `1px solid ${ds.color}55` }}>
                    <span className="status-dot" style={{ width: 8, height: 8, background: ds.color }} />
                    <span className="font-bold text-xs leading-none" style={{ color: ds.color }}>{item.probability}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {item.fromClub.logoUrl && (
                      <img src={item.fromClub.logoUrl} alt={item.fromClub.name}
                        className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
                    )}
                    <span className="text-white/60 text-[11px] font-semibold truncate max-w-16">
                      {item.fromClub.name}
                    </span>
                  </div>
                  <svg width="18" height="10" viewBox="0 0 18 10" fill="none" className="flex-shrink-0">
                    <path d="M0 5h14M10 1l4 4-4 4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {item.toClub.logoUrl && (
                      <img src={item.toClub.logoUrl} alt={item.toClub.name}
                        className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
                    )}
                    <span className="text-white font-bold text-[11px] truncate max-w-16">
                      {item.toClub.name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="status-dot" style={{ width: 9, height: 9, background: ds.color }} />
                  <span className="text-[11px] font-semibold truncate" style={{ color: ds.color }}>{ds.label}</span>
                </div>
                {item.player.value && (
                  <span className="text-white font-bold text-sm flex-none">{item.player.value}</span>
                )}
              </div>
            </div>
          </button>
        );
      })}

      <div className="h-4" />
      {selected && <PlayerSheet item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default function MercatoPage() {
  const [tab, setTab] = useState<TabKey>("voci");

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
            { key: "trattative" as TabKey, label: "Trattative" },
          ]}
        />
      </div>

      {tab === "voci" && <VociTab />}
      {tab === "trattative" && <TrattativeTab />}
    </div>
  );
}
