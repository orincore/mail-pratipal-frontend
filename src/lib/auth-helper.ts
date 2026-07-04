import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = process.env.AUTH_JWT_SECRET || "fallback-dev-secret";
const COOKIE_NAME = "pratipal_session";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  full_name: string | null;
  iat: number;
  exp: number;
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): AuthenticatedUser | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  
  const payload = verifyToken(token);
  if (!payload) return null;
  
  // Enforce role check for administrator access
  if (payload.role !== "admin") return null;

  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    full_name: payload.full_name,
  };
}

/**
 * Helper to wrap API handlers for authentication.
 * Returns true if authenticated, otherwise returns false and sends a 401 response.
 */
export function checkApiAuth(req: NextRequest): AuthenticatedUser | null {
  return getUserFromRequest(req);
}

/**
 * Returns the URL to redirect to for admin login in the main application.
 */
export function getLoginRedirectUrl(requestUrl: string): string {
  const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3000";
  return `${mainAppUrl}/admin/login?redirect=${encodeURIComponent(requestUrl)}`;
}
