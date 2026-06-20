"use client";


import { useState, useEffect } from "react";
import type { NewsItem } from "@/app/api/news/route";

const CATEGORIES = ["Tutte", "Serie A", "Mercato"];

const SOURCE_COLORS: Record<string, string> = {
  corriere:        "#e63946",
  "corriere-calcio": "#60a5fa",
  tuttosport:      "#f59e0b",
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
    <div className="screen sec-news">

      {/* Header */}
      <div className="sec-header px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent-soft)" }}>Live feed</p>
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
              style={{ color: "var(--accent)" }}
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
                background: filter === cat ? "var(--accent)" : "rgba(255,255,255,0.07)",
                color: filter === cat ? "var(--accent-ink)" : "rgba(255,255,255,0.6)",
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

        {/* Notizia in primo piano */}
        {!loading && !error && visible.length > 0 && (
          <a href={visible[0].url} target="_blank" rel="noopener noreferrer"
            className="pop-in block rounded-3xl overflow-hidden active:opacity-80 transition-opacity"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="relative w-full" style={{ height: 210 }}>
              {visible[0].imageUrl
                ? <img src={visible[0].imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                : <div className="w-full h-full flex items-center justify-center text-6xl" style={{ background: "var(--accent-bg)" }}>⚽</div>}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,12,24,0.97) 6%, rgba(8,12,24,0.2) 55%, transparent 80%)" }} />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                    style={{ background: SOURCE_COLORS[visible[0].source] ?? "var(--accent)" }}>{visible[0].sourceLabel}</span>
                  <span className="text-white/70 text-[10px]">{timeAgo(visible[0].pubDate)} fa</span>
                </div>
                <h2 className="text-white font-bold text-lg leading-tight line-clamp-3">{visible[0].title}</h2>
              </div>
            </div>
          </a>
        )}

        {/* Lista compatta */}
        {!loading && !error && visible.slice(1).map((item) => (
          <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
            className="flex gap-3 rounded-2xl overflow-hidden active:opacity-70 transition-opacity p-2.5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex-none rounded-xl overflow-hidden" style={{ width: 86, height: 86 }}>
              {item.imageUrl
                ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = "none"; }} />
                : <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: "var(--accent-bg)" }}>⚽</div>}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: SOURCE_COLORS[item.source] ?? "var(--accent-soft)" }}>{item.sourceLabel}</span>
                <span className="text-white/30 text-[9px]">· {timeAgo(item.pubDate)} fa</span>
              </div>
              <h3 className="text-white font-semibold text-[13px] leading-snug line-clamp-2 mb-1">{item.title}</h3>
              <p className="text-white/40 text-[11px] leading-snug line-clamp-2">{item.summary}</p>
            </div>
          </a>
        ))}

        <div className="h-20" />
      </div>
    </div>
  );
}
