"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TEAM_LOGO_OPTIONS } from "@/lib/mock-data";
import { loadState, saveState } from "@/lib/store";
import { upsertProfile, upsertSquad } from "@/app/actions";
import { useAppUser } from "@/lib/app-user-context";

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAppUser();
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [logo, setLogo] = useState("⚽");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleNext() {
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) { setError("Inserisci nome e cognome"); return; }
      setError(""); setStep(2);
    } else if (step === 2) {
      if (!teamName.trim()) { setError("Inserisci il nome della squadra"); return; }
      setError(""); setStep(3);
    } else {
      setSaving(true);

      const profile = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        teamName: teamName.trim(),
        logo,
        budget: 500,
      };

      // Persist locally first
      const state = loadState();
      const nextState = { ...state, profile };
      saveState(nextState);

      // Sync to Supabase — user.id is the real Clerk ID (or "demo-user" in demo mode)
      const userId = user.id || "demo-user";
      const [profileResult, squadResult] = await Promise.all([
        upsertProfile(userId, profile),
        upsertSquad(userId, nextState.squad),
      ]);

      if (profileResult.error) console.error("Supabase profile error:", profileResult.error);
      if (squadResult.error) console.error("Supabase squad error:", squadResult.error);

      setSaving(false);
      router.push("/squad");
    }
  }

  return (
    <main className="min-h-dvh pitch-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ background: s <= step ? "#34d399" : "rgba(255,255,255,0.2)" }}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="slide-up">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">👤</div>
              <h2 className="text-2xl font-bold text-white">Chi sei?</h2>
              <p className="text-white/50 text-sm mt-1">Inserisci i tuoi dati per iniziare</p>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-white/60 text-sm font-medium block mb-1.5">Nome</label>
                <input
                  className="w-full rounded-xl px-4 py-3.5 text-white placeholder:text-white/25 outline-none transition-colors"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  placeholder="es. Marco"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-white/60 text-sm font-medium block mb-1.5">Cognome</label>
                <input
                  className="w-full rounded-xl px-4 py-3.5 text-white placeholder:text-white/25 outline-none transition-colors"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  placeholder="es. Rossi"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="slide-up">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">🏟️</div>
              <h2 className="text-2xl font-bold text-white">La tua squadra</h2>
              <p className="text-white/50 text-sm mt-1">Come si chiama la tua squadra del fanta?</p>
            </div>
            <div>
              <label className="text-white/60 text-sm font-medium block mb-1.5">Nome squadra</label>
              <input
                className="w-full rounded-xl px-4 py-3.5 text-white placeholder:text-white/25 outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                placeholder="es. I Gladiatori"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                maxLength={30}
              />
              <p className="text-white/25 text-xs mt-1.5 text-right">{teamName.length}/30</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="slide-up">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">{logo}</div>
              <h2 className="text-2xl font-bold text-white">Scegli il logo</h2>
              <p className="text-white/50 text-sm mt-1">L&apos;emblema della tua squadra</p>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {TEAM_LOGO_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setLogo(emoji)}
                  className="aspect-square rounded-2xl text-3xl flex items-center justify-center transition-all"
                  style={{
                    background: logo === emoji ? "#34d399" : "rgba(255,255,255,0.08)",
                    transform: logo === emoji ? "scale(1.1)" : "scale(1)",
                    boxShadow: logo === emoji ? "0 4px 16px rgba(52,211,153,0.4)" : "none",
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={handleNext}
            disabled={saving}
            className="w-full py-4 font-bold rounded-2xl text-lg transition-all active:scale-95 disabled:opacity-60"
            style={{ background: "#34d399", color: "#052e16" }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Salvataggio…
              </span>
            ) : step === 3 ? "Inizia a giocare! 🚀" : "Continua →"}
          </button>
          {step > 1 && !saving && (
            <button
              onClick={() => { setStep(step - 1); setError(""); }}
              className="w-full py-3 text-white/40 text-sm"
            >
              ← Indietro
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
