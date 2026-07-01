"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Contenitore del contenuto di una tab: ad ogni cambio di `tabKey` rigioca
 * un'animazione di scorrimento nella direzione giusta (avanti = da destra,
 * indietro = da sinistra), ricavata dall'ordine in `keys`.
 *
 * Il `key` sul div forza il rimontaggio → l'animazione riparte ogni volta.
 */
export default function TabPanel({
  tabKey,
  keys,
  children,
}: {
  tabKey: string;
  keys: string[];
  children: ReactNode;
}) {
  const prev = useRef(tabKey);
  const forward = keys.indexOf(tabKey) >= keys.indexOf(prev.current);
  useEffect(() => { prev.current = tabKey; }, [tabKey]);

  return (
    <div key={tabKey} className={forward ? "tab-in-right" : "tab-in-left"}>
      {children}
    </div>
  );
}
