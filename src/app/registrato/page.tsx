import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getCurrentViewer } from "@/app/social-actions";
import { isAppOpen } from "@/app/release-actions";
import { BrandCrest } from "@/components/BrandLogo";
import SignOutButton from "./SignOutButton";

// Pagina "grazie / in arrivo" mostrata agli amici dopo la registrazione,
// finché l'app è in modalità "in arrivo". L'admin e (a rilascio fatto) tutti
// vengono mandati direttamente all'app.
export default async function RegistratoPage() {
  const [viewer, open] = await Promise.all([getCurrentViewer(), isAppOpen()]);
  if (!viewer) redirect("/sign-in");
  // app già aperta, oppure sei l'admin → vai dritto all'app
  if (open || viewer.isAdmin) redirect("/trofei");
  // non hai ancora completato l'onboarding → fallo prima (così raccogliamo i dati)
  if (!viewer.hasProfile) redirect("/onboarding");

  const cu = await currentUser();
  const name = cu?.firstName || viewer.displayName || "";

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden pitch-bg">
      <div className="relative z-10 flex flex-col items-center gap-7 max-w-sm w-full text-center">
        <BrandCrest size={120} style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.45))" }} />

        <div className="flex flex-col items-center gap-3">
          <span
            className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }}
          >
            In arrivo
          </span>
          <h1 className="text-white font-bold text-2xl leading-tight">
            Grazie{name ? `, ${name}` : ""}! 🎉
          </h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-[19rem]">
            La tua registrazione è andata a buon fine. L&apos;app è ancora in fase di
            sviluppo e verrà rilasciata a breve: appena è pronta potrai accedere con
            questo stesso account.
          </p>
        </div>

        <div className="w-full rounded-2xl px-4 py-3 text-sm text-white/55"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>
          I tuoi dati sono salvati. Ci vediamo al fischio d&apos;inizio! ⚽
        </div>

        <div className="w-full mt-1">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
