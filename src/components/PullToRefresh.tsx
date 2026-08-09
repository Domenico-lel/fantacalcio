"use client";

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode, type RefObject, type TouchEvent,
} from "react";

type RefreshFn = () => Promise<void> | void;

const RefreshCtx = createContext<(fn: RefreshFn | null) => void>(() => {});

/**
 * Registra la funzione di refresh della schermata attualmente montata.
 * Ogni contenuto di tab la chiama con la propria `reload`: quando la tab
 * cambia, la vecchia si smonta (cleanup) e la nuova prende il posto.
 */
export function useRegisterRefresh(fn: RefreshFn) {
  const register = useContext(RefreshCtx);
  useEffect(() => {
    register(fn);
    return () => register(null);
  }, [fn, register]);
}

const THRESHOLD = 64;

/**
 * Contenitore scrollabile dell'app con pull-to-refresh nativo.
 * Lo `scrollRef` è passato dall'alto così la barra in basso può fare
 * "torna su" (ri-tap sulla tab attiva).
 */
export default function PullToRefresh({
  scrollRef,
  children,
}: {
  scrollRef: RefObject<HTMLDivElement>;
  children: ReactNode;
}) {
  const handlerRef = useRef<RefreshFn | null>(null);
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const register = useCallback((fn: RefreshFn | null) => {
    handlerRef.current = fn;
  }, []);

  const onTouchStart = (e: TouchEvent) => {
    if (refreshing) return;
    const el = scrollRef.current;
    if (el && el.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      dragging.current = true;
    } else {
      dragging.current = false;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!dragging.current || startY.current == null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    setPull(dy > 0 ? Math.min(dy * 0.5, 90) : 0);
  };

  const onTouchEnd = async () => {
    if (!dragging.current) return;
    dragging.current = false;
    startY.current = null;
    if (pull >= THRESHOLD && handlerRef.current) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try { await handlerRef.current(); } catch { /* la schermata gestisce i suoi errori */ }
      setRefreshing(false);
    }
    setPull(0);
  };

  const indicator = refreshing ? THRESHOLD : pull;
  const offset = refreshing ? THRESHOLD * 0.5 : pull;

  return (
    <RefreshCtx.Provider value={register}>
      <div className="flex-1 relative overflow-hidden">
        {/* Indicatore circolare */}
        <div
          role="status"
          aria-live="polite"
          aria-label={refreshing ? "Aggiornamento in corso" : undefined}
          className="absolute top-0 left-0 right-0 z-30 flex justify-center pointer-events-none"
          style={{
            transform: `translateY(${indicator - 44}px)`,
            opacity: Math.min(indicator / THRESHOLD, 1),
            transition: dragging.current ? "none" : "transform .25s ease, opacity .25s ease",
          }}
        >
          <div className="mt-2 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(8,12,24,0.92)", border: "1px solid var(--border)", boxShadow: "0 4px 14px rgba(0,0,0,0.4)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              style={{
                animation: refreshing ? "spin .8s linear infinite" : "none",
                transform: refreshing ? undefined : `rotate(${indicator * 3}deg)`,
              }}>
              <path d="M21 12a9 9 0 11-3-6.7M21 4v4h-4" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="h-full overflow-y-auto"
          style={{ paddingBottom: "calc(var(--bottom-nav-height) + max(env(safe-area-inset-bottom, 0px), 8px))" }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          aria-busy={refreshing}
        >
          {/* transform solo durante il gesto: a riposo niente transform, così i
              position:fixed interni (es. il bottom-sheet giocatore) restano ancorati al viewport */}
          <div style={{ transform: offset > 0 ? `translateY(${offset}px)` : undefined, transition: dragging.current ? "none" : "transform .25s ease" }}>
            {children}
          </div>
        </div>
      </div>
    </RefreshCtx.Provider>
  );
}
