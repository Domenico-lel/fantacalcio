"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useAppUser } from "@/lib/app-user-context";

const DEMO_MODE = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

interface Props {
  open: boolean;
  onClose: () => void;
  teamName?: string;
  logo?: string;
  budget?: number;
}

export default function ProfileDrawer({ open, onClose, teamName, logo, budget }: Props) {
  const user = useAppUser();
  const { signOut } = useClerk();
  const router = useRouter();

  async function handleLogout() {
    onClose();
    if (DEMO_MODE) {
      router.push("/");
      return;
    }
    await signOut();
    router.push("/");
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{
          background: "rgba(0,0,0,0.55)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* Drawer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
        style={{
          background: "#0f2318",
          border: "1px solid rgba(255,255,255,0.1)",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 220ms cubic-bezier(0.23,1,0.32,1)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
        </div>

        {/* Profile header */}
        <div className="px-6 pt-4 pb-6">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border"
              style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)" }}
            >
              {logo ?? "⚽"}
            </div>
            <div>
              <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wide mb-0.5">
                {user.fullName || "Allenatore"}
              </p>
              <p className="text-white font-bold text-xl leading-tight">
                {teamName ?? "La tua Squadra"}
              </p>
              {user.email && (
                <p className="text-white/40 text-xs mt-1">{user.email}</p>
              )}
            </div>
          </div>

          {/* Info card */}
          <div
            className="rounded-2xl p-4 mb-4 flex items-center justify-between"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="text-center flex-1">
              <p className="text-white/40 text-xs mb-1">Crediti</p>
              <p className="text-emerald-400 font-bold text-lg">{budget ?? 500}M</p>
            </div>
            <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="text-center flex-1">
              <p className="text-white/40 text-xs mb-1">Modalità</p>
              <p className="text-white font-semibold text-sm">{DEMO_MODE ? "Demo" : "Live"}</p>
            </div>
          </div>

          {/* Logout button */}
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

          {/* Safe area spacer */}
          <div className="h-6" />
        </div>
      </div>
    </>
  );
}
