"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/squad",     label: "Squadra",   icon: SquadIcon },
  { href: "/players",   label: "Giocatori", icon: PlayersIcon },
  { href: "/standings", label: "Classifica",icon: StandingsIcon },
  { href: "/calendar",  label: "Calendario",icon: CalendarIcon },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-[#0d1f14] flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">{children}</div>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
           style={{ background: "rgba(10,28,16,0.97)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                  active ? "text-emerald-400" : "text-white/35"
                }`}
              >
                <Icon active={active} />
                <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                {active && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function SquadIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        fill={active ? "currentColor" : "none"} fillOpacity={0.15} />
      <circle cx="12" cy="9" r="2.5"
        stroke="currentColor" strokeWidth={1.5}
        fill={active ? "currentColor" : "none"} fillOpacity={0.5} />
    </svg>
  );
}

function PlayersIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        fill={active ? "currentColor" : "none"} fillOpacity={0.15} />
      <circle cx="17" cy="7" r="2.5" stroke="currentColor" strokeWidth={1.5} fill="none" />
      <path d="M2 21v-1a7 7 0 0114 0v1" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
      <path d="M19 11c2.21 0 4 1.79 4 4v1" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function StandingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="13" width="4" height="8" rx="1" stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        fill={active ? "currentColor" : "none"} fillOpacity={0.15} />
      <rect x="10" y="9" width="4" height="12" rx="1" stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        fill={active ? "currentColor" : "none"} fillOpacity={0.15} />
      <rect x="17" y="5" width="4" height="16" rx="1" stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        fill={active ? "currentColor" : "none"} fillOpacity={0.15} />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        fill={active ? "currentColor" : "none"} fillOpacity={0.1} />
      <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
      <circle cx="8" cy="14" r="1.5" fill="currentColor" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" />
      <circle cx="16" cy="14" r="1.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
