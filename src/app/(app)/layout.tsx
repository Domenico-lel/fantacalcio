import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentViewer } from "@/app/social-actions";
import { isAppOpen } from "@/app/release-actions";
import AppShell from "./AppShell";

// Gate di accesso all'app. Finché l'app non è "aperta" (fanta_settings.app_open),
// solo l'admin entra nell'app vera; gli altri vengono mandati alla pagina "in
// arrivo" (o all'onboarding se non l'hanno ancora completato, così raccogliamo i dati).
export default async function AppLayout({ children }: { children: ReactNode }) {
  const [viewer, open] = await Promise.all([getCurrentViewer(), isAppOpen()]);
  if (!viewer) redirect("/sign-in");

  if (!open && !viewer.isAdmin) {
    redirect(viewer.hasProfile ? "/registrato" : "/onboarding");
  }

  return <AppShell>{children}</AppShell>;
}
