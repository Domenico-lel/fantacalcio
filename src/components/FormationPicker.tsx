"use client";

import { FORMATIONS } from "@/lib/mock-data";

interface Props {
  current: string;
  onSelect: (formation: string) => void;
  onClose: () => void;
}

export default function FormationPicker({ current, onSelect, onClose }: Props) {
  const descriptions: Record<string, string> = {
    "4-3-3": "Offensivo, tre attaccanti",
    "4-4-2": "Bilanciato, classico",
    "3-5-2": "Centrocampo numeroso",
    "3-4-3": "Molto offensivo",
    "4-2-3-1": "Moderno, trequarti",
    "5-3-2": "Difensivo con ali",
    "4-5-1": "Molto difensivo",
    "3-4-1-2": "Con trequartista",
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 slide-up">
        <div className="bg-field-800 border-t border-white/10 rounded-t-3xl px-5 pt-2 pb-8 safe-bottom shadow-2xl">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
          <h2 className="text-white font-bold text-lg mb-4">Scegli il modulo</h2>
          <div className="grid grid-cols-2 gap-2">
            {FORMATIONS.map((f) => (
              <button
                key={f}
                onClick={() => onSelect(f)}
                className={`flex flex-col items-center gap-1 px-4 py-4 rounded-xl border transition-all ${
                  f === current
                    ? "bg-field-300 border-field-300 text-field-900"
                    : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                }`}
              >
                <span className="font-black text-xl">{f}</span>
                <span className={`text-xs text-center leading-tight ${f === current ? "text-field-800" : "text-white/40"}`}>
                  {descriptions[f] ?? ""}
                </span>
              </button>
            ))}
          </div>
          <button onClick={onClose} className="w-full py-3 text-white/40 text-sm mt-3">
            Annulla
          </button>
        </div>
      </div>
    </>
  );
}
