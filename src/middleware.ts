import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "pratipal_session";

/**
 * This app's own canonical origin. Deliberately NOT derived from
 * request.url/request.nextUrl behind the reverse proxy — Next.js middleware
 * can reflect the server's own internal bind address (e.g.
 * http://localhost:3000, the port `next start` listens on) rather than the
 * real external host, even with nginx forwarding Host/X-Forwarded-* headers
 * correctly. That previously sent every production login redirect to
 * localhost instead of crm.pratipal.in. Only the path+query (never
 * host-dependent) are taken from the request.
 */
function selfOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Bypass auth check for public endpoints: static assets, tracking pixels, webhook/job runners
  if (
    path.startsWith("/_next") ||
    path.startsWith("/favicon.ico") ||
    path.startsWith("/api/track") ||
    path.startsWith("/api/jobs") ||
    path.startsWith("/api/unsubscribe") ||
    path.startsWith("/api/webhooks") ||
    path.startsWith("/unsubscribe")
  ) {
    return NextResponse.next();
  }

  // 2. SSO Token Transfer Check (cross-subdomain redirect token handler —
  // the main site at pratipal.in redirects here with ?token=<jwt> after
  // login; we store it as our own first-party cookie for this host.)
  const tokenParam = request.nextUrl.searchParams.get("token");

  if (tokenParam) {
    const url = new URL(`${selfOrigin()}${request.nextUrl.pathname}${request.nextUrl.search}`);
    url.searchParams.delete("token");
    const response = NextResponse.redirect(url);
    // Secure cookies require HTTPS — only disable for local http:// dev.
    const isSecureContext = request.nextUrl.protocol === "https:";
    response.cookies.set(COOKIE_NAME, tokenParam, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      path: "/",
      secure: isSecureContext,
      sameSite: "lax",
    });
    return response;
  }

  // 3. Check for existence of the admin session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3000";
    const selfUrl = `${selfOrigin()}${request.nextUrl.pathname}${request.nextUrl.search}`;
    const redirectUrl = `${mainAppUrl}/admin/login?redirect=${encodeURIComponent(selfUrl)}`;
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all paths except the bypassed ones
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/track|api/jobs|api/unsubscribe|api/webhooks|unsubscribe).*)",
  ],
};
