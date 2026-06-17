import Link from "next/link";

const DEMO_MODE = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_DEMO === "true";

export default async function LandingPage() {
  if (!DEMO_MODE) {
    const { auth } = await import("@clerk/nextjs/server");
    const { redirect } = await import("next/navigation");
    const { userId } = await auth();
    if (userId) redirect("/news");
  }

  return (
    <main className="min-h-screen pitch-bg flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Field lines */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-10">
        <div className="w-64 h-64 rounded-full border-2 border-white" />
        <div className="absolute w-full h-0.5 bg-white top-1/2" />
        <div className="absolute w-24 h-24 rounded-full border-2 border-white" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur flex items-center justify-center text-6xl shadow-2xl border border-white/20">
            ⚽
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Fanta<span className="text-field-300">Calcio</span>
          </h1>
          <p className="text-field-200 text-center text-sm leading-relaxed">
            Gestisci la tua squadra, sfida gli amici e diventa il campione del fantacalcio
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {["🏟️ Formazioni", "📊 Classifiche", "📅 Calendario", "🔄 Mercato"].map((f) => (
            <span key={f} className="text-xs bg-white/10 text-field-100 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur">
              {f}
            </span>
          ))}
        </div>

        <div className="w-full flex flex-col gap-3">
          <Link
            href={DEMO_MODE ? "/onboarding" : "/sign-up"}
            className="w-full py-4 bg-field-300 hover:bg-field-200 text-field-900 font-bold text-center rounded-2xl transition-colors shadow-lg text-lg"
          >
            {DEMO_MODE ? "Prova la demo 🚀" : "Inizia gratis"}
          </Link>
          <Link
            href={DEMO_MODE ? "/news" : "/sign-in"}
            className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-semibold text-center rounded-2xl transition-colors border border-white/20 backdrop-blur"
          >
            {DEMO_MODE ? "Vai alle notizie" : "Accedi"}
          </Link>
        </div>

        {DEMO_MODE && (
          <p className="text-yellow-400/70 text-xs text-center bg-yellow-400/10 px-4 py-2 rounded-xl border border-yellow-400/20">
            ⚡ Modalità demo — configura le chiavi Clerk in .env.local per l&apos;auth completa
          </p>
        )}

        <p className="text-field-300 text-xs opacity-60">
          Dati stagione Serie A 2024/25
        </p>
      </div>
    </main>
  );
}
