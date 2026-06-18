"use client";

import { createContext, useContext } from "react";

export interface AppUser {
  id: string;
  fullName: string;
  firstName: string;
  email?: string;
}

export const AppUserContext = createContext<AppUser>({
  id: "",
  fullName: "",
  firstName: "",
  email: undefined,
});

export function useAppUser(): AppUser {
  return useContext(AppUserContext);
}
