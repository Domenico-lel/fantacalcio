"use client";

import { createContext, useContext, ReactNode } from "react";

export interface AppUser {
  id: string;
  fullName: string;
  firstName: string;
  email?: string;
}

const defaultUser: AppUser = {
  id: "demo-user",
  fullName: "Marco Rossi",
  firstName: "Marco",
  email: undefined,
};

export const AppUserContext = createContext<AppUser>(defaultUser);

export function useAppUser(): AppUser {
  return useContext(AppUserContext);
}

// Used in demo mode — provides a static user
export function DemoUserProvider({ children }: { children: ReactNode }) {
  return (
    <AppUserContext.Provider value={defaultUser}>
      {children}
    </AppUserContext.Provider>
  );
}
