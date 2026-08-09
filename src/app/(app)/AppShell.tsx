"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useRef, useState, useEffect } from "react";
import ProfileDrawer from "@/components/ProfileDrawer";
import BadgeRow from "@/components/Badges";
import PwaInstallGuide from "@/components/PwaInstallGuide";
import PullToRefresh from "@/components/PullToRefresh";
import DialogProvider from "@/components/Dialog";
import { loadState, loadViewerCache, saveViewerCache } from "@/lib/store";
import type { TeamProfile, CachedViewer } from "@/lib/store";
import { getCurrentViewer } from "@/app/social-actions";
import { isImageAvatar } from "@/lib/avatar";

const NAV_ITEMS = [
  { href: "/players",     label: "Mercato",    icon: TransferIcon,   color: "#fb923c" },
  { href: "/standings",   label: "Classifica", icon: StandingsIcon,  color: "#a78bfa" },
  { href: "/carriera",    label: "Carriera",   icon: CareerIcon,     color: "#22d3ee" },
  { href: "/pronostici",  label: "Pronostici", icon: DiceIcon,       color: "#fbbf24" },
  { href: "/bacheca",     label: "Bacheca",    icon: MegaphoneIcon,  color: "#2dd4a7" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
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
    <DialogProvider>
    <div className="h-dvh flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Top bar — header app-style, piatto, mai scrollabile */}
      <header className="flex-none flex min-h-[64px] items-center gap-3 px-4 pb-2 safe-top">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] leading-none" style={{ color: "var(--text-faint)" }}>
            Fanta Soccer Club
          </span>
          <div className="flex items-center gap-1.5 min-w-0 mt-1">
            <span className="font-display text-white text-[16px] font-bold leading-tight truncate">{teamLabel}</span>
            {viewer?.badges && viewer.badges.length > 0 && (
              <span className="flex-none"><BadgeRow ids={viewer.badges} compact size={16} /></span>
            )}
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="tap flex-none rounded-full active:scale-95 transition-transform"
          aria-label="Apri profilo"
        >
          {isImageAvatar(avatarSrc)
            ? <img src={avatarSrc} alt="" className="w-11 h-11 rounded-full object-cover"
                style={{ border: "2px solid var(--border-2)", boxShadow: "0 4px 14px -6px rgba(0,0,0,0.8)" }} />
            : <span className="w-11 h-11 rounded-full flex items-center justify-center text-xl"
                style={{ background: "var(--surface-2)", border: "2px solid var(--border-2)" }}>{avatarSrc}</span>}
        </button>
      </header>

      <PullToRefresh scrollRef={scrollRef}>{children}</PullToRefresh>

      {/* Bottom navigation */}
      <nav aria-label="Navigazione principale" className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
           style={{ background: "rgba(7,11,20,0.9)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", borderTop: "1px solid var(--border)" }}>
        <div
          className="mx-auto grid w-full max-w-xl"
          style={{ gridTemplateColumns: `repeat(${NAV_ITEMS.length}, minmax(0, 1fr))` }}
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon, color }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={(e) => {
                  // ri-tap sulla tab attiva → torna in cima (pattern iOS)
                  if (active) { e.preventDefault(); scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }
                }}
                aria-current={active ? "page" : undefined}
                className="flex min-h-[64px] flex-col items-center justify-center gap-1 py-1.5 transition-colors"
                style={{ color: active ? color : "var(--text-faint)" }}
              >
                <div className="flex items-center justify-center rounded-full transition-all duration-200"
                  style={{
                    width: 46, height: 29,
                    background: active ? `${color}1f` : "transparent",
                    boxShadow: active ? `0 6px 16px -8px ${color}` : "none",
                  }}>
                  <Icon active={active} />
                </div>
                <span className="text-[11px] tracking-wide" style={{ fontWeight: active ? 700 : 600 }}>{label}</span>
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

      <PwaInstallGuide />
    </div>
    </DialogProvider>
  );
}

function TransferIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M15 7l5 5-5 5" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 12H5M9 17l-5-5 5-5" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.4}/>
    </svg>
  );
}

function StandingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="13" width="4" height="8" rx="1.5" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}
        fill={active ? "currentColor" : "none"} fillOpacity={0.18} />
      <rect x="10" y="9" width="4" height="12" rx="1.5" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}
        fill={active ? "currentColor" : "none"} fillOpacity={0.18} />
      <rect x="17" y="5" width="4" height="16" rx="1.5" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}
        fill={active ? "currentColor" : "none"} fillOpacity={0.18} />
    </svg>
  );
}

function DiceIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}
        fill={active ? "currentColor" : "none"} fillOpacity={0.14} />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" />
      <circle cx="15" cy="9" r="1.4" fill="currentColor" />
      <circle cx="9" cy="15" r="1.4" fill="currentColor" />
      <circle cx="15" cy="15" r="1.4" fill="currentColor" />
    </svg>
  );
}

function CareerIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.1" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}
        fill={active ? "currentColor" : "none"} fillOpacity={0.14} />
      <path d="M6.5 20c.45-4 2.15-6 5.5-6s5.05 2 5.5 6" stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" />
      <path d="m18.25 4.4.55 1.12 1.24.18-.9.87.21 1.23-1.1-.58-1.1.58.21-1.23-.9-.87 1.24-.18.55-1.12Z"
        fill="currentColor" />
    </svg>
  );
}

function MegaphoneIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 11v2a1 1 0 001 1h2l4 4V6L6 10H4a1 1 0 00-1 1z" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}
        fill={active ? "currentColor" : "none"} fillOpacity={0.14} strokeLinejoin="round"/>
      <path d="M14 8a4 4 0 010 8M17 5a8 8 0 010 14" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round"/>
    </svg>
  );
}
