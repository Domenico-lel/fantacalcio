"use client";

import { useUser } from "@clerk/nextjs";
import { AppUserContext } from "@/lib/app-user-context";
import { ReactNode } from "react";

// Reads the Clerk user and injects it into AppUserContext
// so all children can use useAppUser() regardless of auth mode
export function ClerkUserBridge({ children }: { children: ReactNode }) {
  const { user } = useUser();
  return (
    <AppUserContext.Provider
      value={{
        id: user?.id ?? "",
        fullName: user?.fullName ?? "",
        firstName: user?.firstName ?? "",
      }}
    >
      {children}
    </AppUserContext.Provider>
  );
}
