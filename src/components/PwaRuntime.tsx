"use client";

import { useEffect, useState } from "react";

export default function PwaRuntime() {
  const [offline, setOffline] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const syncConnectionState = () => setOffline(!navigator.onLine);
    syncConnectionState();

    window.addEventListener("online", syncConnectionState);
    window.addEventListener("offline", syncConnectionState);

    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener("online", syncConnectionState);
        window.removeEventListener("offline", syncConnectionState);
      };
    }

    const hadController = Boolean(navigator.serviceWorker.controller);
    const handleControllerChange = () => {
      if (hadController) setUpdateAvailable(true);
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {
        // L'app continua a funzionare online anche se il browser rifiuta il SW.
      });

    return () => {
      window.removeEventListener("online", syncConnectionState);
      window.removeEventListener("offline", syncConnectionState);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  if (!offline && !updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-4 right-4 z-[80] mx-auto flex max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-2xl"
      style={{
        bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        color: "white",
        background: offline ? "#172033" : "#0b3328",
        border: offline ? "1px solid rgba(160,178,214,.28)" : "1px solid rgba(52,211,153,.35)",
      }}
    >
      <span className="text-lg" aria-hidden="true">{offline ? "↯" : "↻"}</span>
      <span className="min-w-0 flex-1 font-semibold">
        {offline ? "Sei offline. Alcuni contenuti potrebbero non essere disponibili." : "È disponibile una nuova versione dell’app."}
      </span>
      {updateAvailable && !offline && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex-none rounded-xl px-3 py-2 font-bold text-emerald-950 active:scale-95"
          style={{ background: "#34d399" }}
        >
          Aggiorna
        </button>
      )}
    </div>
  );
}
