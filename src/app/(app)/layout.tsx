"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import ProfileDrawer from "@/components/ProfileDrawer";
import BadgeRow from "@/components/Badges";
import { loadState, loadViewerCache, saveViewerCache } from "@/lib/store";
import type { TeamProfile, CachedViewer } from "@/lib/store";
import { getCurrentViewer } from "@/app/social-actions";

const NAV_ITEMS = [
  { href: "/news",        label: "Notizie",    icon: NewsIcon,       color: "#3b8eea" },
  { href: "/players",     label: "Mercato",    icon: TransferIcon,   color: "#f0a43a" },
  { href: "/standings",   label: "Classifica", icon: StandingsIcon,  color: "#857cf0" },
  { href: "/pronostici",  label: "Pronostici", icon: DiceIcon,       color: "#f5a623" },
  { href: "/bacheca",     label: "Bacheca",    icon: MegaphoneIcon,  color: "#1fb083" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState<TeamProfile | null>(null);
  const [viewer, setViewer] = useState<CachedViewer | null>(null);

  useEffect(() => {
    const { profile: p } = loadState();
    setProfile(p);
    // Paint immediato dalla cache viewer (identità autorevole), poi refresh dal server
    setViewer(loadViewerCache());
    getCurrentViewer().then((v) => {
      if (v) {
        const vv: CachedViewer = { logo: v.logo, displayName: v.displayName, badges: v.badges, isAdmin: v.isAdmin };
        setViewer(vv);
        saveViewerCache(vv);
      } else {
        setViewer(null);
        saveViewerCache(null);
      }
    }).catch(() => {});
  }, []);

  const avatarSrc = viewer?.logo ?? "👤";
  const teamLabel = viewer?.displayName ?? "La tua squadra";

  return (
    <div className="h-dvh flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Profile bar — full-width, flex-none, mai scrollabile */}
      <div className="flex-none px-4 pt-4 pb-2">
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-opacity active:opacity-70"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          aria-label="Profilo"
        >
          {avatarSrc.startsWith("http")
            ? <img src={avatarSrc} alt="" className="w-12 h-12 rounded-xl object-cover flex-none" />
            : <span className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-none"
                style={{ background: "rgba(255,255,255,0.06)" }}>{avatarSrc}</span>}
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wide leading-none mb-1">Il tuo profilo</span>
            <span className="text-white text-base font-bold leading-tight truncate w-full">
              {teamLabel}
            </span>
            {viewer?.badges && viewer.badges.length > 0 && (
              <div className="mt-1.5">
                <BadgeRow ids={viewer.badges} compact size={26} />
              </div>
            )}
          </div>
          <svg className="flex-none text-white/30" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">{children}</div>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
           style={{ background: "rgba(8,12,24,0.92)", backdropFilter: "blur(16px)", borderTop: "1px solid var(--border)" }}>
        <div className="flex">
          {NAV_ITEMS.map(({ href, label, icon: Icon, color }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 transition-colors"
                style={{ color: active ? color : "rgba(255,255,255,0.35)" }}
              >
                <div className="flex items-center justify-center rounded-xl transition-all"
                  style={{
                    width: 44, height: 30,
                    background: active ? `${color}22` : "transparent",
                  }}>
                  <Icon active={active} />
                </div>
                <span className="text-[10px] font-semibold tracking-wide">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <ProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profile={profile}
        avatar={avatarSrc}
        badges={viewer?.badges ?? []}
        isAdmin={viewer?.isAdmin ?? false}
        adminName={viewer?.displayName}
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

function DiceIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        fill={active ? "currentColor" : "none"} fillOpacity={0.12} />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" />
      <circle cx="15" cy="9" r="1.4" fill="currentColor" />
      <circle cx="9" cy="15" r="1.4" fill="currentColor" />
      <circle cx="15" cy="15" r="1.4" fill="currentColor" />
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
