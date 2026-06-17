"use client";

import { useEffect } from "react";
import { Player, ROLE_COLORS, ROLE_FULL_LABELS } from "@/lib/mock-data";

interface Props {
  player: Player;
  isCaptain: boolean;
  isVice: boolean;
  isStarter: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onSwap: () => void;
  onCaptain: () => void;
  onViceCaptain: () => void;
}

export default function PlayerSheet({
  player, isCaptain, isVice, isStarter, readOnly,
  onClose, onSwap, onCaptain, onViceCaptain,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 slide-up">
        <div className="bg-field-800 border-t border-white/10 rounded-t-3xl px-5 pt-2 pb-8 safe-bottom shadow-2xl max-h-[85vh] overflow-y-auto">
          {/* Handle */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

          {/* Player header */}
          <div className="flex items-start gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-field-700 border border-white/10 flex items-center justify-center text-3xl">
              {player.role === "P" ? "🧤" : player.role === "D" ? "🛡️" : player.role === "C" ? "⚡" : "🔥"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-lg leading-tight">{player.name}</h2>
                {isCaptain && <span className="text-xs bg-gold text-field-900 px-2 py-0.5 rounded-full font-black">C</span>}
                {isVice && <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">V</span>}
              </div>
              <p className="text-field-200 text-sm">{player.team}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${ROLE_COLORS[player.role]}`}>
                  {ROLE_FULL_LABELS[player.role]}
                </span>
                <span className="text-field-300 text-sm font-bold">{player.value}M</span>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: "Media", value: player.avgPoints.toFixed(1), icon: "📈" },
              { label: "Totale", value: player.points, icon: "⚡" },
              { label: "Gol", value: player.goals, icon: "⚽" },
              { label: "Assist", value: player.assists, icon: "🎯" },
              { label: "Amm.", value: player.yellowCards, icon: "🟨" },
              { label: "Esp.", value: player.redCards, icon: "🟥" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                <p className="text-lg">{icon}</p>
                <p className="text-white font-bold text-base">{value}</p>
                <p className="text-white/40 text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Voto fanta simulato */}
          <div className="bg-field-700/50 rounded-xl p-3 mb-5 border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-field-200 text-sm">Ultima giornata</span>
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-sm line-through">{(player.avgPoints - 0.3).toFixed(1)}</span>
                <span className="text-field-300 font-bold text-lg">{(player.avgPoints + 0.5).toFixed(1)}</span>
              </div>
            </div>
            <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-field-300 rounded-full transition-all"
                style={{ width: `${Math.min((player.avgPoints / 10) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          {!readOnly && (
            <div className="flex flex-col gap-2">
              <button
                onClick={onSwap}
                className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors border border-white/10"
              >
                🔄 Scambia giocatore
              </button>
              {isStarter && (
                <>
                  {!isCaptain && (
                    <button
                      onClick={onCaptain}
                      className="w-full py-3.5 bg-gold/20 hover:bg-gold/30 text-gold font-semibold rounded-xl transition-colors border border-gold/30"
                    >
                      ⭐ Imposta come Capitano
                    </button>
                  )}
                  {!isVice && !isCaptain && (
                    <button
                      onClick={onViceCaptain}
                      className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white/70 font-semibold rounded-xl transition-colors border border-white/10"
                    >
                      🥈 Imposta come Vice-Capitano
                    </button>
                  )}
                </>
              )}
              <button
                onClick={onClose}
                className="w-full py-3 text-white/40 text-sm"
              >
                Chiudi
              </button>
            </div>
          )}

          {readOnly && (
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-white/10 text-white font-semibold rounded-xl"
            >
              Chiudi
            </button>
          )}
        </div>
      </div>
    </>
  );
}
