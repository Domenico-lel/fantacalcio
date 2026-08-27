import { NextResponse } from "next/server";
import { ensureAllPredictionDrafts } from "@/lib/all-prediction-drafts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET non configurato" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Non autorizzato" }, { status: 401 });
  }

  const result = await ensureAllPredictionDrafts();
  const error = result.fantasy.error || result.serieA.error;
  return NextResponse.json(
    { ok: !error, ...result },
    { status: error ? 502 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
