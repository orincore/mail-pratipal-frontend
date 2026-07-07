import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "pratipal_session";

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

  // 2. SSO Token Transfer Check (cross-port redirect token handler)
  const tokenParam = request.nextUrl.searchParams.get("token");
  
  if (tokenParam) {
    const url = new URL(request.url);
    url.searchParams.delete("token");
    const response = NextResponse.redirect(url);
    response.cookies.set(COOKIE_NAME, tokenParam, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      path: "/",
    });
    return response;
  }

  // 3. Check for existence of the admin session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3000";
    const redirectUrl = `${mainAppUrl}/admin/login?redirect=${encodeURIComponent(request.url)}`;
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
