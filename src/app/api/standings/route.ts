import { NextResponse } from "next/server";
import { fetchFantacalcioStandings } from "@/lib/fantacalcio-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const standings = await fetchFantacalcioStandings();
  return NextResponse.json(standings, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
