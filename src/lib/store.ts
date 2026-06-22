"use client";

export interface TeamProfile {
  firstName: string;
  lastName: string;
  teamName: string;
  logo: string;
  budget: number;
}

const STORAGE_KEY = "fantacalcio-profile";

export function loadState(): { profile: TeamProfile | null } {
  if (typeof window === "undefined") return { profile: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { profile: null };
    return { profile: JSON.parse(raw) as TeamProfile };
  } catch {
    return { profile: null };
  }
}

export function saveState(profile: TeamProfile | null): void {
  if (typeof window === "undefined") return;
  try {
    if (profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

// ─── Cache del viewer (identità autorevole dal server) ───────────────────────
// Serve a dipingere subito la profile bar con i dati corretti dopo un refresh,
// senza il "lampo" del vecchio profilo onboarding in localStorage.

export interface CachedViewer {
  logo: string;
  displayName: string;
  badges: string[];
  isAdmin: boolean;
}

const VIEWER_KEY = "fantacalcio-viewer";

export function loadViewerCache(): CachedViewer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(VIEWER_KEY);
    return raw ? (JSON.parse(raw) as CachedViewer) : null;
  } catch {
    return null;
  }
}

export function saveViewerCache(viewer: CachedViewer | null): void {
  if (typeof window === "undefined") return;
  try {
    if (viewer) localStorage.setItem(VIEWER_KEY, JSON.stringify(viewer));
    else localStorage.removeItem(VIEWER_KEY);
  } catch {
    // ignore
  }
}
