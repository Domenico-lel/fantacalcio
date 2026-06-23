import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandCrest, BrandWordmark } from "@/components/BrandLogo";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/trofei");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden pitch-bg">
      <div className="relative z-10 flex flex-col items-center gap-7 max-w-sm w-full">
        <BrandCrest size={132} style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.45))" }} />

        <div className="flex flex-col items-center gap-3 -mt-1">
          <BrandWordmark />
          <p className="text-white/55 text-center text-sm leading-relaxed max-w-[17rem]">
            La lega più scatenata del fantacalcio. Schiera, sfida gli amici e domina la classifica.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {["Formazioni", "Classifiche", "Bacheca", "Mercato"].map((f) => (
            <span
              key={f}
              className="text-xs text-white/70 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              {f}
            </span>
          ))}
        </div>

        <div className="w-full flex flex-col gap-3 mt-1">
          <Link
            href="/sign-up"
            className="w-full py-4 text-center rounded-2xl text-lg font-bold shadow-lg transition-transform active:scale-95"
            style={{ background: "#34d399", color: "#04241a" }}
          >
            Entra nel club
          </Link>
          <Link
            href="/sign-in"
            className="w-full py-4 text-center rounded-2xl text-base font-semibold text-white border border-white/20 backdrop-blur transition-colors"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            Accedi
          </Link>
        </div>
      </div>
    </main>
  );
}
