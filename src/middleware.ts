import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require any authentication
const PUBLIC_ROUTES = ["/", "/api/auth", "/api/unsubscribe", "/api/debug"];

/**
 * Lightweight middleware that only checks cookie presence.
 *
 * We intentionally do NOT use NextAuth(authConfig) here because the middleware
 * runs in the Edge Runtime without a Prisma adapter. When NextAuth tries to
 * decode the database session token (a UUID) as a JWT, it throws a
 * JWTSessionError and then DELETES the session cookie — breaking every
 * subsequent request.
 *
 * Full session validation (role, onboardingComplete) happens inside each
 * server component and API route via `await auth()`, which has access to
 * Prisma and can query the database.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public routes and NextAuth's own API
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // NextAuth v5 uses "authjs.session-token" (HTTP dev) or
  // "__Secure-authjs.session-token" (HTTPS prod)
  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Authenticated — let the request through.
  // Server components and API routes handle detailed checks (role, onboarding).
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
