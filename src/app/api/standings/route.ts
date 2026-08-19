import { NextResponse } from "next/server";
import { fetchFantacalcioStandings } from "@/lib/fantacalcio-api";

export async function GET() {
  const standings = await fetchFantacalcioStandings();
  return NextResponse.json(standings, { headers: { "Cache-Control": "no-store" } });
}
