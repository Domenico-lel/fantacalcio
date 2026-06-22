"use client";

import { useEffect, useState, type ReactNode } from "react";

const SEEN_KEY = "fc-pwa-guide-seen";

type Plat = "ios" | "android";

function detectPlatform(): Plat | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  // iPadOS recente si presenta come Mac con touch
  if (/Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document) return "ios";
  return null;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// ── Icone passo-passo ────────────────────────────────────────────────────────

function ShareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 14V3" />
      <path d="M8 7l4-4 4 4" />
      <path d="M7 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
    </svg>
  );
}

function AddSquareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

function InstallIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v11" />
      <path d="M7 11l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

type Step = { icon: ReactNode; text: ReactNode };

const STEPS: Record<Plat, Step[]> = {
  ios: [
    { icon: <ShareIcon />, text: <>Tocca <b>Condividi</b> nella barra di <b>Safari</b> (il quadrato con la freccia ↑).</> },
    { icon: <AddSquareIcon />, text: <>Scorri e tocca <b>Aggiungi alla schermata Home</b>.</> },
    { icon: <CheckIcon />, text: <>Tocca <b>Aggiungi</b> in alto a destra. Fatto! 🎉</> },
  ],
  android: [
    { icon: <DotsIcon />, text: <>Tocca il menu <b>⋮</b> in alto a destra in <b>Chrome</b>.</> },
    { icon: <InstallIcon />, text: <>Tocca <b>Installa app</b> (oppure <i>Aggiungi a schermata Home</i>).</> },
    { icon: <CheckIcon />, text: <>Conferma <b>Installa</b>. Fatto! 🎉</> },
  ],
};

export default function PwaInstallGuide() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Plat>("ios");

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY)) return; // già mostrato una volta
      if (isStandalone()) { localStorage.setItem(SEEN_KEY, "1"); return; } // già installata
      const p = detectPlatform();
      if (!p) return; // desktop / sconosciuto: niente tutorial
      setTab(p);
      setOpen(true);
    } catch { /* ignore */ }
  }, []);

  function dismiss() {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Installa l'app"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          background: "#141d33",
          border: "1px solid rgba(255,255,255,0.12)",
          marginBottom: "env(safe-area-inset-bottom, 0px)",
          maxHeight: "92dvh",
          overflowY: "auto",
        }}
      >
        {/* handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
        </div>

        <div className="px-6 pt-5 pb-7">
          {/* header */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/icon.svg" alt="" className="w-11 h-11 rounded-2xl flex-none"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }} />
              <div className="min-w-0">
                <h2 className="text-white font-bold text-lg leading-tight">Installa l&apos;app</h2>
                <p className="text-white/45 text-xs leading-snug">Aggiungila alla Home: si apre a schermo intero, come un&apos;app vera.</p>
              </div>
            </div>
            <button onClick={dismiss} aria-label="Chiudi" className="text-white/40 text-xl leading-none px-1 active:opacity-60 flex-none">✕</button>
          </div>

          {/* tabs piattaforma */}
          <div className="flex gap-1.5 p-1 rounded-2xl mt-4 mb-4" style={{ background: "rgba(255,255,255,0.06)" }}>
            {(["ios", "android"] as Plat[]).map((p) => {
              const active = tab === p;
              return (
                <button key={p} onClick={() => setTab(p)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
                  style={active
                    ? { background: "#34d399", color: "#052e16" }
                    : { color: "rgba(255,255,255,0.6)" }}>
                  {p === "ios" ? "iPhone" : "Android"}
                </button>
              );
            })}
          </div>

          {/* passi */}
          <div className="flex flex-col gap-3">
            {STEPS[tab].map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-none text-emerald-400"
                  style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}>
                  {s.icon}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-emerald-400/70 font-bold text-sm flex-none">{i + 1}.</span>
                  <p className="text-white/85 text-sm leading-snug">{s.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* footer */}
          <button onClick={dismiss}
            className="w-full mt-5 py-3.5 rounded-2xl font-bold text-base text-white transition-opacity active:opacity-80"
            style={{ background: "linear-gradient(135deg, #059669, #34d399)" }}>
            Ho capito
          </button>
          <p className="text-white/30 text-[11px] text-center mt-3">Lo mostriamo una sola volta. Puoi installarla anche più tardi dal menu del browser.</p>
        </div>
      </div>
    </div>
  );
}
