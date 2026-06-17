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
