"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import ProfileDrawer from "@/components/ProfileDrawer";
import { loadState } from "@/lib/store";
import type { TeamProfile } from "@/lib/store";
import { getCurrentViewer } from "@/app/social-actions";

const NAV_ITEMS = [
  { href: "/news",      label: "Notizie",   icon: NewsIcon },
  { href: "/players",   label: "Mercato",   icon: TransferIcon },
  { href: "/standings", label: "Classifica",icon: StandingsIcon },
  { href: "/bacheca",   label: "Bacheca",    icon: MegaphoneIcon },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState<TeamProfile | null>(null);
  const [viewer, setViewer] = useState<{ logo: string; displayName: string } | null>(null);

  useEffect(() => {
    const { profile: p } = loadState();
    setProfile(p);
    getCurrentViewer().then((v) => {
      if (v) setViewer({ logo: v.logo, displayName: v.displayName });
    }).catch(() => {});
  }, []);

  const avatarSrc = viewer?.logo ?? profile?.logo ?? "👤";
  const teamLabel = viewer?.displayName ?? profile?.teamName ?? "La tua squadra";

  return (
    <div className="h-dvh bg-[#0d1f14] flex flex-col overflow-hidden">
      {/* Profile bar — flex-none, mai scrollabile */}
      <div className="flex-none px-4 pt-4 pb-2 flex justify-center">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-opacity active:opacity-60 w-auto max-w-[60vw]"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          aria-label="Profilo"
        >
          {avatarSrc.startsWith("http")
            ? <img src={avatarSrc} alt="" className="w-7 h-7 rounded-full object-cover flex-none" />
            : <span className="text-2xl leading-none flex-none">{avatarSrc}</span>}
          <div className="flex flex-col items-start min-w-0">
            <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wide leading-none mb-0.5">Il tuo profilo</span>
            <span className="text-white text-sm font-bold leading-none truncate w-full">
              {teamLabel}
            </span>
          </div>
        </button>
      </div>

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

      <ProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profile={profile}
        onProfileSaved={(p) => setProfile(p)}
      />
    </div>
  );
}

function NewsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        fill={active ? "currentColor" : "none"} fillOpacity={0.1} />
      <path d="M7 9h10M7 13h6M7 17h4" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round"/>
    </svg>
  );
}

function TransferIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M15 7l5 5-5 5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 12H5M9 17l-5-5 5-5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.4}/>
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

function MegaphoneIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 11v2a1 1 0 001 1h2l4 4V6L6 10H4a1 1 0 00-1 1z" stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        fill={active ? "currentColor" : "none"} fillOpacity={0.12} strokeLinejoin="round"/>
      <path d="M14 8a4 4 0 010 8M17 5a8 8 0 010 14" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round"/>
    </svg>
  );
}
