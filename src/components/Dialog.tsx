"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ConfirmOpts = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};
type ToastType = "success" | "error" | "info";

type DialogCtx = {
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  toast: (message: string, type?: ToastType) => void;
};

const Ctx = createContext<DialogCtx>({ confirm: async () => false, toast: () => {} });

/** Conferma in bottom-sheet, al posto del confirm() nativo. Restituisce una Promise<boolean>. */
export function useConfirm() { return useContext(Ctx).confirm; }
/** Toast in tema, al posto di alert(). */
export function useToast() { return useContext(Ctx).toast; }

type PendingConfirm = ConfirmOpts & { resolve: (v: boolean) => void };
type ToastItem = { id: number; message: string; type: ToastType };

export default function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<PendingConfirm | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const confirm = useCallback(
    (opts: ConfirmOpts) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })),
    [],
  );

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ confirm, toast }}>
      {children}

      {/* Toast */}
      <div className="fixed left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}>
        {toasts.map((t) => (
          <div key={t.id}
            className="slide-up pointer-events-auto max-w-sm w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl"
            style={{
              background: t.type === "error" ? "rgba(220,38,38,0.96)" : t.type === "success" ? "rgba(16,185,129,0.96)" : "rgba(20,29,51,0.97)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(8px)",
            }}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Conferma bottom-sheet */}
      {dialog && (
        <>
          <div className="fixed inset-0 z-[70]" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => close(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[71] rounded-t-3xl slide-up"
            style={{ background: "var(--bg)", border: "1px solid rgba(255,255,255,0.1)", paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="rounded-full" style={{ width: 36, height: 4, background: "rgba(255,255,255,0.2)" }} />
            </div>
            <div className="px-5 pt-2 pb-5">
              <h3 className="text-white font-bold text-lg leading-tight">{dialog.title}</h3>
              {dialog.message && <p className="text-white/60 text-sm mt-1.5 leading-relaxed">{dialog.message}</p>}
              <div className="flex gap-3 mt-5">
                <button onClick={() => close(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white/80 active:scale-95 transition-transform"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  {dialog.cancelLabel ?? "Annulla"}
                </button>
                <button onClick={() => close(true)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                  style={dialog.danger
                    ? { background: "rgba(220,38,38,0.92)", border: "1px solid rgba(239,68,68,0.5)", color: "#fff" }
                    : { background: "var(--accent-grad)", color: "var(--accent-ink)", boxShadow: "0 0 14px var(--accent-glow)" }}>
                  {dialog.confirmLabel ?? "Conferma"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </Ctx.Provider>
  );
}
