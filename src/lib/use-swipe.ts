"use client";

import { useRef } from "react";
import type { PointerEvent } from "react";

/**
 * Swipe orizzontale per cambiare tab. Usa i Pointer Events, così funziona
 * con touch (cellulare), mouse (browser desktop) e penna con un solo codice.
 *
 * - soglia minima 55px per non innescarsi con i tap/click
 * - richiede movimento prevalentemente orizzontale (niente conflitti con lo
 *   scroll verticale o la selezione)
 * - restituisce gli handler da spargere sul contenitore: {...swipe}
 */
export function useSwipeTabs<T extends string>(
  keys: T[],
  current: T,
  onChange: (key: T) => void,
) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onPointerDown: (e: PointerEvent) => {
      // solo pulsante primario per il mouse (sinistro)
      if (e.pointerType === "mouse" && e.button !== 0) { start.current = null; return; }
      start.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      // orizzontale dominante + oltre soglia
      if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      const i = keys.indexOf(current);
      if (i === -1) return;
      if (dx < 0 && i < keys.length - 1) onChange(keys[i + 1]);
      else if (dx > 0 && i > 0) onChange(keys[i - 1]);
    },
  };
}
