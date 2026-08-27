import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/manifest.json",
  "/api/health",
  "/api/transfers",
  "/api/standings",
  "/api/market",
  "/api/cron/sync-rosters",
  "/api/cron/prepare-predictions",
]);

export default clerkMiddleware(async (auth, req) => {
  try {
    if (!isPublicRoute(req)) await auth.protect();
  } catch {
    // auth error — redirect to sign-in
    const { NextResponse } = await import("next/server");
    const signInUrl = new URL("/sign-in", req.url);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
