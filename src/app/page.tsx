import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/news");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden pitch-bg">
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
            Fanta<span className="text-emerald-400">Calcio</span>
          </h1>
          <p className="text-white/60 text-center text-sm leading-relaxed">
            Gestisci la tua squadra, sfida gli amici e diventa il campione del fantacalcio
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {["🏟️ Formazioni", "📊 Classifiche", "📅 Calendario", "🔄 Mercato"].map((f) => (
            <span key={f} className="text-xs bg-white/10 text-white/70 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur">
              {f}
            </span>
          ))}
        </div>

        <div className="w-full flex flex-col gap-3">
          <Link
            href="/sign-up"
            className="w-full py-4 bg-emerald-400 hover:bg-emerald-300 text-gray-900 font-bold text-center rounded-2xl transition-colors shadow-lg text-lg"
          >
            Inizia gratis
          </Link>
          <Link
            href="/sign-in"
            className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-semibold text-center rounded-2xl transition-colors border border-white/20 backdrop-blur"
          >
            Accedi
          </Link>
        </div>
      </div>
    </main>
  );
}
