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
    path.startsWith("/unsubscribe")
  ) {
    return NextResponse.next();
  }

  // 2. Check for existence of the admin session cookie
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
    "/((?!_next/static|_next/image|favicon.ico|api/track|api/jobs|unsubscribe).*)",
  ],
};
