"use client";

import { useState, useEffect } from "react";
import type { TransferItem } from "@/app/api/transfers/route";

function timeAgo(/*unused*/): string { return ""; }
void timeAgo;

const STATUS_COLORS = {
  high:   { bar: "#34d399", glow: "rgba(52,211,153,0.3)",  label: "Molto probabile" },
  mid:    { bar: "#fbbf24", glow: "rgba(251,191,36,0.3)",  label: "In trattativa"   },
  low:    { bar: "#60a5fa", glow: "rgba(96,165,250,0.3)",  label: "Rumors"          },
  vlow:   { bar: "rgba(255,255,255,0.35)", glow: "transparent", label: "Interesse" },
};

function statusFor(p: number) {
  if (p >= 80) return STATUS_COLORS.high;
  if (p >= 55) return STATUS_COLORS.mid;
  if (p >= 30) return STATUS_COLORS.low;
  return STATUS_COLORS.vlow;
}

export default function TransfersPage() {
  const [items, setItems]   = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  async function load() {
    setLoading(true); setError(false);
    try {
      const res = await fetch("/api/transfers");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items ?? []);
    } catch { setError(true); }
    finally  { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-dvh" style={{ background: "#0d1f14" }}>

      {/* Header */}
      <div className="px-4 pt-12 pb-5"
        style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wide">Transfermarkt</p>
            <h1 className="text-white font-bold text-2xl leading-tight">Mercato</h1>
          </div>
          <button onClick={load} disabled={loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:opacity-60 disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              className={loading ? "animate-spin" : ""} style={{ color: "#34d399" }}>
              <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 9a8 8 0 0114.93-2M20 15a8 8 0 01-14.93 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="px-4 py-4 flex flex-col gap-4">

        {/* Skeleton */}
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-3xl overflow-hidden animate-pulse"
            style={{ background: "rgba(255,255,255,0.05)", height: 220 }} />
        ))}

        {/* Errore */}
        {!loading && error && (
          <div className="flex flex-col items-center py-16 gap-4">
            <span className="text-4xl">📡</span>
            <p className="text-white/50 text-sm text-center">
              Impossibile caricare le trattative.<br />Controlla la connessione.
            </p>
            <button onClick={load}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.3)" }}>
              Riprova
            </button>
          </div>
        )}

        {/* Vuoto */}
        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="text-4xl">🔍</span>
            <p className="text-white/50 text-sm">Nessuna trattativa disponibile.</p>
          </div>
        )}

        {/* Transfer cards */}
        {!loading && !error && items.map((item) => {
          const sc = statusFor(item.probability);
          return (
            <a key={item.id} href={item.discussionUrl} target="_blank" rel="noopener noreferrer"
              className="block rounded-3xl overflow-hidden active:opacity-75 transition-opacity"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>

              {/* Foto giocatore — primo piano */}
              <div className="relative w-full" style={{ height: 240 }}>
                {item.player.photoUrl ? (
                  <img
                    src={item.player.photoUrl}
                    alt={item.player.name}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-7xl"
                    style={{ background: "rgba(255,255,255,0.04)" }}>
                    👤
                  </div>
                )}

                {/* Gradiente bottom per leggibilità */}
                <div className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(13,31,20,1) 0%, rgba(13,31,20,0.4) 50%, transparent 100%)" }} />

                {/* Badge probabilità in alto a destra */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md"
                  style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${sc.bar}50` }}>
                  <span className="font-black text-base" style={{ color: sc.bar }}>{item.probability}%</span>
                  {item.trend === "up"   && <span className="text-xs" style={{ color: sc.bar }}>↑</span>}
                  {item.trend === "down" && <span className="text-xs text-red-400">↓</span>}
                </div>

                {/* Nome giocatore e posizione sopra il footer */}
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                  <p className="text-white/60 text-xs mb-0.5">{item.player.position}</p>
                  <p className="text-white font-black text-xl leading-tight">{item.player.name}</p>
                </div>
              </div>

              {/* Footer: club da → a */}
              <div className="px-4 pt-3 pb-4">

                {/* Club row */}
                <div className="flex items-center justify-between mb-4">
                  {/* Club di provenienza */}
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    {item.fromClub.logoUrl ? (
                      <img src={item.fromClub.logoUrl} alt={item.fromClub.name}
                        className="w-10 h-10 object-contain" loading="lazy" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                        style={{ background: "rgba(255,255,255,0.08)" }}>⚽</div>
                    )}
                    <p className="text-white/60 text-[11px] font-semibold text-center max-w-20 leading-tight">
                      {item.fromClub.name}
                    </p>
                  </div>

                  {/* Freccia + valore */}
                  <div className="flex flex-col items-center gap-1 px-2">
                    <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
                      <path d="M0 8h24M20 3l5 5-5 5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {item.player.value && (
                      <span className="text-emerald-400 text-[10px] font-bold">{item.player.value}</span>
                    )}
                  </div>

                  {/* Club di destinazione */}
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    {item.toClub.logoUrl ? (
                      <img src={item.toClub.logoUrl} alt={item.toClub.name}
                        className="w-10 h-10 object-contain" loading="lazy" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                        style={{ background: "rgba(255,255,255,0.08)" }}>⚽</div>
                    )}
                    <p className="text-white/60 text-[11px] font-semibold text-center max-w-20 leading-tight">
                      {item.toClub.name}
                    </p>
                  </div>
                </div>

                {/* Barra probabilità */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wide">
                    {sc.label}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: sc.bar }}>
                    {item.probability}%
                  </span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${item.probability}%`,
                      background: `linear-gradient(90deg, ${sc.bar}88, ${sc.bar})`,
                      boxShadow: `0 0 8px ${sc.glow}`,
                    }} />
                </div>

              </div>
            </a>
          );
        })}

        <div className="h-4" />
      </div>
    </div>
  );
}
