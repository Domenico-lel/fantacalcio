"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOpts) => new Promise<boolean>((resolve) => {
      triggerElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setDialog({ ...opts, resolve });
    }),
    [],
  );

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const close = useCallback((v: boolean) => {
    const trigger = triggerElementRef.current;
    dialog?.resolve(v);
    setDialog(null);
    requestAnimationFrame(() => trigger?.focus());
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(false);
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => confirmButtonRef.current?.focus());
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, dialog]);

  return (
    <Ctx.Provider value={{ confirm, toast }}>
      {children}

      {/* Toast */}
      <div aria-live="polite" aria-atomic="true" className="fixed left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}>
        {toasts.map((t) => (
          <div key={t.id}
            className="slide-up pointer-events-auto max-w-sm w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl"
            style={{
              background: t.type === "error" ? "rgba(220,38,38,0.96)" : t.type === "success" ? "rgba(16,185,129,0.96)" : "rgba(24,35,57,0.97)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 12px 32px -12px rgba(0,0,0,0.7)",
            }}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Conferma bottom-sheet */}
      {dialog && (
        <>
          <div aria-hidden="true" className="fixed inset-0 z-[70]" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => close(false)} />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="fixed bottom-0 left-0 right-0 z-[71] rounded-t-3xl slide-up"
            style={{ background: "var(--bg-soft)", border: "1px solid var(--border-2)", paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="rounded-full" style={{ width: 36, height: 4, background: "rgba(255,255,255,0.2)" }} />
            </div>
            <div className="px-5 pt-2 pb-5">
              <h3 id="confirm-dialog-title" className="font-display text-white font-bold text-lg leading-tight">{dialog.title}</h3>
              {dialog.message && <p className="text-white/60 text-sm mt-1.5 leading-relaxed">{dialog.message}</p>}
              <div className="flex gap-3 mt-5">
                <button onClick={() => close(false)}
                  className="btn-soft flex-1 min-h-11 py-3 text-sm font-bold">
                  {dialog.cancelLabel ?? "Annulla"}
                </button>
                <button ref={confirmButtonRef} onClick={() => close(true)}
                  className={`flex-1 min-h-11 py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform ${dialog.danger ? "" : "btn-primary"}`}
                  style={dialog.danger
                    ? { background: "linear-gradient(135deg, #dc2626, #ef4444)", border: "1px solid rgba(239,68,68,0.5)", color: "#fff", boxShadow: "0 8px 20px -8px rgba(239,68,68,0.4)" }
                    : undefined}>
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
