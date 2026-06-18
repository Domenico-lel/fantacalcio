"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import type { NewsItem } from "@/app/api/news/route";

const CATEGORIES = ["Tutte", "Fantacalcio", "Serie A", "Mercato"];

const SOURCE_COLORS: Record<string, string> = {
  fantacalcio: "#34d399",
  gazzetta:    "#f59e0b",
  calciomercato: "#60a5fa",
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h fa`;
  return `${Math.floor(h / 24)}g fa`;
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("Tutte");

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const visible = filter === "Tutte"
    ? items
    : items.filter((i) => i.category === filter);

  return (
    <div className="min-h-dvh" style={{ background: "#0d1f14" }}>

      {/* Header */}
      <div
        className="px-4 pt-12 pb-4"
        style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wide">Live feed</p>
            <h1 className="text-white font-bold text-2xl leading-tight">Notizie</h1>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity active:opacity-60 disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            aria-label="Aggiorna"
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              className={loading ? "animate-spin" : ""}
              style={{ color: "#34d399" }}
            >
              <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 9a8 8 0 0114.93-2M20 15a8 8 0 01-14.93 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Filtri */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: filter === cat ? "#34d399" : "rgba(255,255,255,0.07)",
                color: filter === cat ? "#0d1f14" : "rgba(255,255,255,0.6)",
                border: filter === cat ? "none" : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 flex flex-col gap-3">

        {/* Loading skeleton */}
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div style={{ height: 160, background: "rgba(255,255,255,0.06)" }} />
            <div className="p-4 flex flex-col gap-2">
              <div className="h-3 rounded-full w-24" style={{ background: "rgba(255,255,255,0.08)" }} />
              <div className="h-4 rounded-full w-full" style={{ background: "rgba(255,255,255,0.08)" }} />
              <div className="h-4 rounded-full w-3/4" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
          </div>
        ))}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center py-16 gap-4">
            <span className="text-4xl">📡</span>
            <p className="text-white/50 text-sm text-center">
              Impossibile caricare le notizie.<br />Controlla la connessione.
            </p>
            <button
              onClick={load}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.3)" }}
            >
              Riprova
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && visible.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="text-4xl">🔍</span>
            <p className="text-white/50 text-sm">Nessuna notizia in questa categoria.</p>
          </div>
        )}

        {/* News cards */}
        {!loading && !error && visible.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl overflow-hidden transition-opacity active:opacity-70"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Immagine */}
            {item.imageUrl ? (
              <div className="relative w-full" style={{ height: 180 }}>
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }}
                />
                {/* Gradient overlay per leggibilità del badge fonte */}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(13,31,20,0.7) 0%, transparent 50%)" }}
                />
                {/* Badge fonte sovrapposto all'immagine */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm"
                    style={{
                      color: SOURCE_COLORS[item.source] ?? "#34d399",
                      background: `rgba(0,0,0,0.55)`,
                      border: `1px solid ${SOURCE_COLORS[item.source] ?? "#34d399"}40`,
                    }}
                  >
                    {item.sourceLabel}
                  </span>
                  <span className="text-white/60 text-[10px] backdrop-blur-sm">{timeAgo(item.pubDate)}</span>
                </div>
              </div>
            ) : (
              /* Placeholder quando non c'è immagine */
              <div
                className="w-full flex items-center justify-center text-4xl"
                style={{ height: 80, background: "rgba(255,255,255,0.03)" }}
              >
                ⚽
              </div>
            )}

            {/* Testo */}
            <div className="p-4">
              {/* Source + time (solo se no immagine) */}
              {!item.imageUrl && (
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      color: SOURCE_COLORS[item.source] ?? "#34d399",
                      background: `${SOURCE_COLORS[item.source] ?? "#34d399"}18`,
                    }}
                  >
                    {item.sourceLabel}
                  </span>
                  <span className="text-white/30 text-[10px]">{timeAgo(item.pubDate)}</span>
                </div>
              )}

              {/* Categoria */}
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mb-2"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}
              >
                {item.category}
              </span>

              {/* Titolo */}
              <h2 className="text-white font-semibold text-sm leading-snug mb-1.5 line-clamp-2">
                {item.title}
              </h2>

              {/* Summary */}
              <p className="text-white/45 text-xs leading-relaxed line-clamp-2">
                {item.summary}
              </p>

              {/* Read more */}
              <div className="flex items-center gap-1 mt-3">
                <span className="text-emerald-400 text-[10px] font-semibold">Leggi su {item.sourceLabel}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M7 17L17 7M17 7H7M17 7v10" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </a>
        ))}

        <div className="h-4" />
      </div>
    </div>
  );
}
