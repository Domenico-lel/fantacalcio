"use client";

import { useState, useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useAppUser } from "@/lib/app-user-context";
import { upsertProfile } from "@/app/actions";
import { loadState, saveState } from "@/lib/store";
import { TEAM_LOGO_OPTIONS } from "@/lib/mock-data";
import type { TeamProfile } from "@/lib/store";

const DEMO_MODE = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

interface Props {
  open: boolean;
  onClose: () => void;
  profile: TeamProfile | null;
  onProfileSaved: (p: TeamProfile) => void;
}

export default function ProfileDrawer({ open, onClose, profile, onProfileSaved }: Props) {
  const user = useAppUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [logo, setLogo] = useState("⚽");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Popola i campi quando si apre il drawer
  useEffect(() => {
    if (open && profile) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
      setTeamName(profile.teamName ?? "");
      setLogo(profile.logo ?? "⚽");
    }
    if (!open) {
      setEditing(false);
      setError("");
    }
  }, [open, profile]);

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) { setError("Inserisci nome e cognome"); return; }
    if (!teamName.trim()) { setError("Inserisci il nome della squadra"); return; }

    setSaving(true);
    setError("");

    const updated: TeamProfile = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      teamName: teamName.trim(),
      logo,
      budget: profile?.budget ?? 500,
    };

    // Aggiorna localStorage
    const state = loadState();
    saveState({ ...state, profile: updated });

    // Sync Supabase in background
    const userId = DEMO_MODE ? "demo-user" : user.id;
    upsertProfile(userId, updated).catch(console.error);

    onProfileSaved(updated);
    setSaving(false);
    setEditing(false);
  }

  async function handleLogout() {
    onClose();
    if (DEMO_MODE) { router.push("/"); return; }
    await signOut();
    router.push("/");
  }

  function handleClose() {
    setEditing(false);
    setError("");
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{
          background: "rgba(0,0,0,0.55)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* Drawer */}
      <div
        className="fixed left-0 right-0 z-50 rounded-t-3xl"
        style={{
          bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
          background: "#0f2318",
          border: "1px solid rgba(255,255,255,0.1)",
          transform: open ? "translateY(0)" : "translateY(calc(100% + 64px))",
          transition: "transform 220ms cubic-bezier(0.23,1,0.32,1)",
          maxHeight: "calc(100dvh - 64px - env(safe-area-inset-bottom, 0px) - 48px)",
          overflowY: "auto",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
        </div>

        <div className="px-6 pt-4 pb-8">

          {/* ── VIEW MODE ─────────────────────────────────── */}
          {!editing && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)" }}
                  >
                    {profile?.logo ?? "⚽"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wide mb-0.5 truncate">
                      {profile?.firstName && profile?.lastName
                        ? `${profile.firstName} ${profile.lastName}`
                        : user.fullName || "Allenatore"}
                    </p>
                    <p className="text-white font-bold text-xl leading-tight truncate">
                      {profile?.teamName ?? "La tua Squadra"}
                    </p>
                    {user.email && (
                      <p className="text-white/40 text-xs mt-1 truncate">{user.email}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="flex-shrink-0 ml-3 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 transition-opacity active:opacity-60"
                  style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}
                >
                  Modifica
                </button>
              </div>

              {/* Info card */}
              <div
                className="rounded-2xl p-4 mb-4 flex items-center justify-between"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="text-center flex-1">
                  <p className="text-white/40 text-xs mb-1">Crediti</p>
                  <p className="text-emerald-400 font-bold text-lg">{profile?.budget ?? 500}M</p>
                </div>
                <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.1)" }} />
                <div className="text-center flex-1">
                  <p className="text-white/40 text-xs mb-1">Modalità</p>
                  <p className="text-white font-semibold text-sm">{DEMO_MODE ? "Demo" : "Live"}</p>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-opacity active:opacity-70"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Esci dall&apos;account
              </button>
            </>
          )}

          {/* ── EDIT MODE ─────────────────────────────────── */}
          {editing && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-bold text-lg">Modifica profilo</h2>
                <button
                  onClick={() => { setEditing(false); setError(""); }}
                  className="text-white/40 text-sm active:opacity-60"
                >
                  Annulla
                </button>
              </div>

              {/* Logo picker */}
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-3">Logo squadra</p>
              <div className="grid grid-cols-10 gap-2 mb-6">
                {TEAM_LOGO_OPTIONS.map((em) => (
                  <button
                    key={em}
                    onClick={() => setLogo(em)}
                    className="aspect-square rounded-xl flex items-center justify-center text-xl transition-all active:scale-90"
                    style={{
                      background: logo === em ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${logo === em ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>

              {/* Campi testo */}
              <div className="flex flex-col gap-3 mb-4">
                {[
                  { label: "Nome", value: firstName, onChange: setFirstName, placeholder: "Es. Marco" },
                  { label: "Cognome", value: lastName, onChange: setLastName, placeholder: "Es. Rossi" },
                  { label: "Nome squadra", value: teamName, onChange: setTeamName, placeholder: "Es. I Fenomeni" },
                ].map(({ label, value, onChange, placeholder }) => (
                  <div key={label}>
                    <label className="text-white/50 text-xs font-semibold uppercase tracking-wide block mb-1.5">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder={placeholder}
                      className="w-full px-4 py-3 rounded-xl text-white text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-400/40"
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        caretColor: "#34d399",
                      }}
                    />
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-red-400 text-xs mb-3 px-1">{error}</p>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 rounded-2xl font-bold text-base text-white transition-opacity active:opacity-70 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #059669, #34d399)" }}
              >
                {saving ? "Salvataggio…" : "Salva modifiche"}
              </button>
            </>
          )}

        </div>
      </div>
    </>
  );
}
