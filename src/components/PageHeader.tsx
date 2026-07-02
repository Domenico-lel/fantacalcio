"use client";

import type { ReactNode } from "react";

/**
 * Header di sezione unificato: occhiello + titolo, elemento a destra opzionale
 * (es. saldo crediti) e riga sotto per le linguette. Sticky con effetto vetro
 * (stile in .sec-header). Un solo componente → tutte le pagine hanno lo stesso
 * ritmo visivo.
 */
export default function PageHeader({
  eyebrow,
  title,
  right,
  children,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="sec-header sticky top-0 z-20 px-4 pt-3 pb-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="page-title truncate mt-0.5">{title}</h1>
        </div>
        {right && <div className="flex-none">{right}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </header>
  );
}
