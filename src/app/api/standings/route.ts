import { NextResponse } from "next/server";
import { fetchFantacalcioStandings } from "@/lib/fantacalcio-api";
import { syncLeagueRostersIfStale } from "@/lib/roster-sync";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // Fallback del cron: al primo caricamento dopo 24 ore riallinea le rose.
  // Un errore della sincronizzazione non deve impedire la classifica.
  await syncLeagueRostersIfStale().catch((error) => {
    console.error("[roster-sync] Controllo giornaliero fallito", error);
  });
  const standings = await fetchFantacalcioStandings();
  return NextResponse.json(standings, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
