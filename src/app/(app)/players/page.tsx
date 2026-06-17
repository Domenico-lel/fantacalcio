"use client";

import { useState, useEffect, useCallback } from "react";
import type { TransferItem } from "@/app/api/transfers/route";

const STATUS_COLORS = {
  high: { bar: "#34d399", glow: "rgba(52,211,153,0.3)",  label: "Molto probabile" },
  mid:  { bar: "#fbbf24", glow: "rgba(251,191,36,0.3)",  label: "In trattativa"   },
  low:  { bar: "#60a5fa", glow: "rgba(96,165,250,0.3)",  label: "Rumors"          },
  vlow: { bar: "rgba(255,255,255,0.35)", glow: "transparent", label: "Interesse"  },
};

function statusFor(p: number) {
  if (p >= 80) return STATUS_COLORS.high;
  if (p >= 55) return STATUS_COLORS.mid;
  if (p >= 30) return STATUS_COLORS.low;
  return STATUS_COLORS.vlow;
}

function PlayerSheet({ item, onClose }: { item: TransferItem; onClose: () => void }) {
  const sc = statusFor(item.probability);
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
        style={{ background: "#0d1f14", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "90dvh" }}>

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
                <p className="text-emerald-400 font-bold text-sm mt-1">{item.player.value}</p>
              )}
            </div>
          </div>

          {/* Trasferimento */}
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-white/30 text-[10px] font-semibold uppercase tracking-wide mb-3">Trattativa</p>
            <div className="flex items-center gap-3">
              {/* Da */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {item.fromClub.logoUrl && (
                  <img src={item.fromClub.logoUrl} alt={item.fromClub.name}
                    className="w-8 h-8 object-contain flex-shrink-0" />
                )}
                <span className="text-white/60 text-sm font-semibold truncate">{item.fromClub.name}</span>
              </div>
              {/* Freccia */}
              <svg width="22" height="12" viewBox="0 0 22 12" fill="none" className="flex-shrink-0">
                <path d="M0 6h18M14 1.5l5 4.5-5 4.5" stroke="#34d399" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {/* A */}
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <span className="text-white font-bold text-sm truncate">{item.toClub.name}</span>
                {item.toClub.logoUrl && (
                  <img src={item.toClub.logoUrl} alt={item.toClub.name}
                    className="w-8 h-8 object-contain flex-shrink-0" />
                )}
              </div>
            </div>

            {/* Barra probabilità */}
            <div className="mt-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-white/40 text-[11px] font-semibold uppercase tracking-wide">{sc.label}</span>
                <div className="flex items-center gap-1">
                  <span className="font-black text-sm" style={{ color: sc.bar }}>{item.probability}%</span>
                  {item.trend === "up"   && <span className="text-[11px]" style={{ color: sc.bar }}>↑</span>}
                  {item.trend === "down" && <span className="text-[11px] text-red-400">↓</span>}
                </div>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full"
                  style={{
                    width: `${item.probability}%`,
                    background: `linear-gradient(90deg, ${sc.bar}70, ${sc.bar})`,
                    boxShadow: `0 0 8px ${sc.glow}`,
                  }} />
              </div>
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

export default function TransfersPage() {
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
              style={{ background: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.3)" }}>
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
          const sc = statusFor(item.probability);
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
                  style={{ background: "linear-gradient(to right, transparent 60%, rgba(13,31,20,0.95) 100%)" }} />
              </div>

              {/* Info */}
              <div className="flex-1 flex flex-col justify-between px-3 py-3 min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <p className="text-white/50 text-[10px] font-medium leading-tight">{item.player.position}</p>
                      <p className="text-white font-black text-base leading-tight truncate">{item.player.name}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full"
                      style={{ background: `${sc.bar}20`, border: `1px solid ${sc.bar}50` }}>
                      <span className="font-black text-sm leading-none" style={{ color: sc.bar }}>{item.probability}%</span>
                      {item.trend === "up"   && <span className="text-[10px] leading-none" style={{ color: sc.bar }}>↑</span>}
                      {item.trend === "down" && <span className="text-[10px] leading-none text-red-400">↓</span>}
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
                      <path d="M0 5h14M10 1l4 4-4 4" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/35 text-[10px] font-semibold uppercase tracking-wide">{sc.label}</span>
                    {item.player.value && (
                      <span className="text-emerald-400 text-[10px] font-bold">{item.player.value}</span>
                    )}
                  </div>
                  <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full"
                      style={{
                        width: `${item.probability}%`,
                        background: `linear-gradient(90deg, ${sc.bar}70, ${sc.bar})`,
                        boxShadow: `0 0 6px ${sc.glow}`,
                        transition: "width 0.7s ease",
                      }} />
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        <div className="h-4" />
      </div>

      {selected && <PlayerSheet item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
