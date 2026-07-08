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
 * Async version of API authentication checking.
 * Checks the backend auth endpoint and falls back to local JWT token parsing.
 */
export async function checkApiAuthAsync(req: NextRequest): Promise<AuthenticatedUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
    const authRes = await fetch(`${backendUrl}/api/auth/me`, {
      headers: {
        Cookie: `${COOKIE_NAME}=${token}`,
      },
    });
    if (authRes.ok) {
      const data = await authRes.json();
      if (data.user && data.user.role === "admin") {
        return {
          id: data.user.id || data.user._id || "",
          email: data.user.email,
          role: data.user.role,
          full_name: data.user.full_name || null,
        };
      }
    }
  } catch (e) {
    console.error("checkApiAuthAsync backend fetch failed:", e);
  }

  // Fallback to local token verification
  const payload = verifyToken(token);
  if (payload && payload.role === "admin") {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      full_name: payload.full_name,
    };
  }

  return null;
}

/**
 * Returns the URL to redirect to for admin login in the main application.
 */
export function getLoginRedirectUrl(requestUrl: string): string {
  const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3000";
  return `${mainAppUrl}/admin/login?redirect=${encodeURIComponent(requestUrl)}`;
}
