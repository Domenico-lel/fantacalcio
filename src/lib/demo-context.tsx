"use client";

import { createContext, useContext, ReactNode } from "react";

interface DemoUser {
  id: string;
  fullName: string;
  firstName: string;
}

const DemoContext = createContext<DemoUser>({
  id: "demo-user",
  fullName: "Marco Rossi",
  firstName: "Marco",
});

export function DemoProvider({ children }: { children: ReactNode }) {
  return (
    <DemoContext.Provider value={{ id: "demo-user", fullName: "Marco Rossi", firstName: "Marco" }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoUser() {
  return useContext(DemoContext);
}
