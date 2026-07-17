import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

// In production a missing secret is a hard failure — silently falling back
// to the known dev value would let anyone forge a session for the local
// JWT-verification fallback path below.
function resolveJwtSecret(): string {
  const value = process.env.AUTH_JWT_SECRET;
  if (value && value.trim().length > 0) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: AUTH_JWT_SECRET is not set. Refusing to start in production with an insecure fallback.");
  }
  return "fallback-dev-secret";
}

const JWT_SECRET = resolveJwtSecret();
const COOKIE_NAME = "pratipal_session";
const VALID_ROLES = ["admin", "editor", "viewer"];

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

  // Any recognized role may hold a session; per-request write restrictions
  // for editor/viewer are enforced by the backend, not here.
  if (!VALID_ROLES.includes(payload.role)) return null;

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
      if (data.user && VALID_ROLES.includes(data.user.role)) {
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
  if (payload && VALID_ROLES.includes(payload.role)) {
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
