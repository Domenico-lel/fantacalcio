import { NextRequest, NextResponse } from "next/server";

const DEMO_MODE = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_DEMO === "true";

export async function middleware(request: NextRequest) {
  if (DEMO_MODE) return NextResponse.next();

  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
  const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/api/health", "/api/news", "/api/transfers"]);
  return clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) await auth.protect();
  })(request, {} as never);
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
