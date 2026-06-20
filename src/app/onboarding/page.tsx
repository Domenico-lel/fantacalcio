"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveState } from "@/lib/store";
import { upsertProfile } from "@/app/actions";
import { getCurrentViewer } from "@/app/social-actions";
import { fetchTeams, claimTeam, type Team } from "@/app/teams-actions";
import { useAppUser } from "@/lib/app-user-context";

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAppUser();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [freeName, setFreeName] = useState(""); // fallback se non ci sono squadre sincronizzate

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // L'admin non ha una squadra: salta l'onboarding e va alla bacheca
  useEffect(() => {
    getCurrentViewer().then((v) => {
      if (v?.isAdmin) { router.replace("/bacheca"); return; }
      fetchTeams().then((t) => setTeams(t)).finally(() => setChecking(false));
    }).catch(() => setChecking(false));
  }, [router]);

  const available = teams.filter((t) => !t.claimed);
  const hasTeams = teams.length > 0;

  async function handleNext() {
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) { setError("Inserisci nome e cognome"); return; }
      setError(""); setStep(2);
      return;
    }

    // step 2: scelta squadra
    const teamName = hasTeams ? (selectedTeam?.name ?? "") : freeName.trim();
    if (!teamName) { setError(hasTeams ? "Seleziona la tua squadra" : "Inserisci il nome della squadra"); return; }

    setSaving(true); setError("");

    const profile = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      teamName,
      logo: "⚽",
      budget: 500,
    };
    saveState(profile);

    if (user.id) {
      const res = await upsertProfile(user.id, profile);
      if (res.error) { setError("Errore nel salvataggio: " + res.error); setSaving(false); return; }
      if (selectedTeam) {
        const claim = await claimTeam(selectedTeam.id);
        if (claim.error) { setError(claim.error); setSaving(false); return; }
      }
    }

    setSaving(false);
    router.push("/standings");
  }

  if (checking) {
    return (
      <main className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <span className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-dvh pitch-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ background: s <= step ? "#34d399" : "rgba(255,255,255,0.2)" }} />
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
                  className="w-full rounded-xl px-4 py-3.5 text-white placeholder:text-white/25 outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  placeholder="es. Marco" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className="text-white/60 text-sm font-medium block mb-1.5">Cognome</label>
                <input
                  className="w-full rounded-xl px-4 py-3.5 text-white placeholder:text-white/25 outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  placeholder="es. Rossi" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="slide-up">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🏟️</div>
              <h2 className="text-2xl font-bold text-white">La tua squadra</h2>
              <p className="text-white/50 text-sm mt-1">
                {hasTeams ? "Seleziona la squadra che ti appartiene" : "Inserisci il nome della tua squadra"}
              </p>
            </div>

            {hasTeams ? (
              <div className="flex flex-col gap-2 max-h-[46vh] overflow-y-auto pr-1">
                {available.length === 0 && (
                  <p className="text-white/50 text-sm text-center py-4">
                    Tutte le squadre risultano già assegnate. Contatta l&apos;admin.
                  </p>
                )}
                {available.map((t) => {
                  const sel = selectedTeam?.id === t.id;
                  return (
                    <button key={t.id} onClick={() => setSelectedTeam(t)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all"
                      style={{
                        background: sel ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${sel ? "#34d399" : "rgba(255,255,255,0.1)"}`,
                      }}>
                      {t.logoUrl
                        ? <img src={t.logoUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-none" />
                        : <span className="w-9 h-9 rounded-full flex items-center justify-center text-xl flex-none" style={{ background: "rgba(255,255,255,0.08)" }}>⚽</span>}
                      <span className={`font-semibold text-sm ${sel ? "text-emerald-400" : "text-white"}`}>{t.name}</span>
                      {sel && <span className="ml-auto text-emerald-400">✓</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                className="w-full rounded-xl px-4 py-3.5 text-white placeholder:text-white/25 outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                placeholder="es. I Gladiatori" value={freeName} onChange={(e) => setFreeName(e.target.value)} maxLength={40} />
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}

        <div className="mt-8 flex flex-col gap-3">
          <button onClick={handleNext} disabled={saving}
            className="w-full py-4 font-bold rounded-2xl text-lg transition-all active:scale-95 disabled:opacity-60"
            style={{ background: "#34d399", color: "#052e16" }}>
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Salvataggio…
              </span>
            ) : step === 2 ? "Inizia a giocare! 🚀" : "Continua →"}
          </button>
          {step > 1 && !saving && (
            <button onClick={() => { setStep(step - 1); setError(""); }} className="w-full py-3 text-white/40 text-sm">
              ← Indietro
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
