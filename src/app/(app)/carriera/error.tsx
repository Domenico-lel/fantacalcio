"use client";

import PageHeader from "@/components/PageHeader";

export default function CarrieraError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="screen sec-career">
      <PageHeader eyebrow="Il tuo viaggio" title="Carriera" />
      <div className="px-4 py-10">
        <div className="card p-5 text-center" role="alert">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
            style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }} aria-hidden="true">
            ⚽
          </div>
          <h2 className="font-display mt-4 text-lg font-bold text-white">Carriera non caricata</h2>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
            C&apos;è stato un problema temporaneo. Il salvataggio non è stato modificato.
          </p>
          <button type="button" onClick={reset} className="btn-primary mt-5 min-h-11 w-full px-4 py-3 text-sm">
            Riprova
          </button>
        </div>
      </div>
    </div>
  );
}
