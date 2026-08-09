"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveState } from "@/lib/store";
import { upsertProfile } from "@/app/actions";
import { getCurrentViewer } from "@/app/social-actions";
import { fetchTeams, claimTeam, type Team } from "@/app/teams-actions";
import { useAppUser } from "@/lib/app-user-context";
import { isAppOpen } from "@/app/release-actions";

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAppUser();
  const [checking, setChecking] = useState(true);
  const [comingSoon, setComingSoon] = useState(true); // fase "in arrivo": si raccoglie solo nome/cognome
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamQuery, setTeamQuery] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // L'admin non ha una squadra: salta l'onboarding e va alla bacheca
  useEffect(() => {
    Promise.all([getCurrentViewer(), isAppOpen()]).then(([v, open]) => {
      const cs = !open;
      setComingSoon(cs);
      if (v?.isAdmin) { router.replace("/bacheca"); return; }
      // in fase "in arrivo" non si sceglie la squadra: niente lista da caricare
      if (cs) { setChecking(false); return; }
      fetchTeams().then((t) => setTeams(t)).finally(() => setChecking(false));
    }).catch(() => setChecking(false));
  }, [router]);

  const available = teams.filter((t) => !t.claimed);
  const filteredTeams = available.filter((team) =>
    team.name.toLocaleLowerCase("it-IT").includes(teamQuery.trim().toLocaleLowerCase("it-IT"))
  );
  const hasTeams = teams.length > 0;

  async function saveProfile(team: Team | null) {
    setSaving(true); setError("");

    const profile = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      teamName: team?.name ?? "",
      logo: "⚽",
      budget: 500,
    };
    saveState(profile);

    if (user.id) {
      const res = await upsertProfile(profile);
      if (res.error) { setError("Errore nel salvataggio: " + res.error); setSaving(false); return; }
      if (team) {
        const claim = await claimTeam(team.id);
        if (claim.error) { setError(claim.error); setSaving(false); return; }
      }
    }

    setSaving(false);
    // finché l'app è "in arrivo", l'utente normale finisce sulla pagina di attesa
    router.push(comingSoon ? "/registrato" : "/standings");
  }

  async function handleNext() {
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) { setError("Inserisci nome e cognome"); return; }
      // in fase "in arrivo" basta nome e cognome: la squadra la assegna l'admin
      if (comingSoon) { await saveProfile(null); return; }
      setError(""); setStep(2);
      return;
    }

    // step 2: la squadra si sceglie sempre dalla lista (niente testo libero)
    if (!selectedTeam) { setError("Seleziona la tua squadra"); return; }
    await saveProfile(selectedTeam);
  }

  if (checking) {
    return (
      <main className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <span className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-dvh pitch-bg flex flex-col items-center justify-center px-5 py-6">
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {(comingSoon ? [1] : [1, 2]).map((s) => (
            <div key={s} className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ background: s <= step ? "#34d399" : "rgba(255,255,255,0.2)" }} />
          ))}
        </div>

        {step === 1 && (
          <div className="slide-up">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">👤</div>
              <h2 className="font-display text-2xl font-bold text-white">Chi sei?</h2>
              <p className="text-white/50 text-sm mt-1">Inserisci i tuoi dati per iniziare</p>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="first-name" className="text-white/60 text-sm font-medium block mb-1.5">Nome</label>
                <input
                  id="first-name"
                  autoComplete="given-name"
                  className="input w-full px-4 py-3.5"
                  placeholder="es. Marco" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="last-name" className="text-white/60 text-sm font-medium block mb-1.5">Cognome</label>
                <input
                  id="last-name"
                  autoComplete="family-name"
                  className="input w-full px-4 py-3.5"
                  placeholder="es. Rossi" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="slide-up">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🏟️</div>
              <h2 className="font-display text-2xl font-bold text-white">La tua squadra</h2>
              <p className="text-white/50 text-sm mt-1">Seleziona la squadra che ti appartiene</p>
            </div>

            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm text-white/55">{available.length} squadre disponibili</p>
              {selectedTeam && <p className="text-sm font-semibold text-emerald-300" role="status">1 selezionata</p>}
            </div>

            {available.length > 0 && (
              <div className="mb-3">
                <label htmlFor="team-search" className="sr-only">Cerca la tua squadra</label>
                <input
                  id="team-search"
                  type="search"
                  autoComplete="off"
                  value={teamQuery}
                  onChange={(event) => setTeamQuery(event.target.value)}
                  placeholder="Cerca squadra"
                  className="input w-full px-4 py-3"
                />
              </div>
            )}

            <div className="flex flex-col gap-2 max-h-[36dvh] overflow-y-auto pr-1" role="radiogroup" aria-label="Scegli la tua squadra">
              {available.length === 0 && (
                <p className="text-white/50 text-sm text-center py-4">
                  {hasTeams
                    ? "Tutte le squadre risultano già assegnate. Contatta l'admin."
                    : "Nessuna squadra disponibile: l'admin deve ancora sincronizzare le squadre della lega."}
                </p>
              )}
              {available.length > 0 && filteredTeams.length === 0 && (
                <p className="text-white/50 text-sm text-center py-4">Nessuna squadra corrisponde alla ricerca.</p>
              )}
              {filteredTeams.map((t) => {
                const sel = selectedTeam?.id === t.id;
                return (
                  <button key={t.id} type="button" role="radio" aria-checked={sel} onClick={() => setSelectedTeam(t)}
                    className="flex min-h-14 items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all active:scale-[0.98]"
                    style={{
                      background: sel ? "rgba(52,211,153,0.14)" : "rgba(255,255,255,0.055)",
                      border: `1px solid ${sel ? "#34d399" : "var(--border)"}`,
                      boxShadow: sel ? "0 6px 18px -10px rgba(52,211,153,0.5)" : "none",
                    }}>
                    {t.logoUrl
                      ? <img src={t.logoUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-none" />
                      : <span className="w-9 h-9 rounded-full flex items-center justify-center text-xl flex-none" style={{ background: "rgba(255,255,255,0.08)" }}>⚽</span>}
                    <span className={`font-semibold text-sm ${sel ? "text-emerald-300" : "text-white"}`}>{t.name}</span>
                    {sel && <span className="ml-auto text-emerald-300">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center mt-3" role="alert">{error}</p>}

        <div className="mt-5 flex flex-col gap-3">
          <button onClick={handleNext} disabled={saving || (step === 2 && !selectedTeam)}
            className="w-full py-4 font-bold rounded-2xl text-lg transition-all active:scale-95 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #0ec98f, #4ae8b8)", color: "#04281e", boxShadow: "0 10px 26px -10px rgba(20,220,160,0.5)" }}>
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Salvataggio…
              </span>
            ) : step === 2 ? "Inizia a giocare! 🚀" : comingSoon ? "Conferma registrazione 🚀" : "Continua →"}
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
