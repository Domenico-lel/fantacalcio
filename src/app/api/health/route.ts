import { NextResponse } from "next/server";
import { isSupabaseConfigured, createAdminClient } from "@/lib/supabase-server";

export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();

  if (!supabaseConfigured) {
    return NextResponse.json({
      status: "demo",
      supabase: "not configured",
      clerk: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    });
  }

  try {
    const db = createAdminClient();
    // Ping: lista tabelle presenti
    const { data, error } = await db
      .from("fanta_profiles")
      .select("count", { count: "exact", head: true });

    if (error) throw error;

    return NextResponse.json({
      status: "ok",
      supabase: "connected",
      clerk: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      fanta_profiles_count: data,
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        supabase: "error",
        detail: String(e),
        clerk: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      },
      { status: 500 }
    );
  }
}
