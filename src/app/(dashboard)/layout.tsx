import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import SidebarNav from "./SidebarNav";
import HeaderControls from "./HeaderControls";
import { BRAND_NAME, BRAND_LOGO_URL } from "@/lib/branding";
import { RoleProvider, type UserRole } from "./RoleProvider";

const VALID_ROLES: UserRole[] = ["admin", "editor", "viewer"];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("pratipal_session")?.value;

  let userPayload: any = null;

  if (token) {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
      const authRes = await fetch(`${backendUrl}/api/auth/me`, {
        headers: {
          Cookie: `pratipal_session=${token}`,
        },
        next: { revalidate: 0 }
      });
      if (authRes.ok) {
        const data = await authRes.json();
        userPayload = data.user || null;
      }
    } catch (e) {
      console.error("Failed to verify auth session on backend", e);
    }
  }

  // Double-verify the session is valid at the page level — any recognized
  // role (admin/editor/viewer) may enter; the backend enforces per-request
  // write restrictions for non-admin roles, this is just the entry gate.
  if (!userPayload || !VALID_ROLES.includes(userPayload.role)) {
    const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3000";

    // Deliberately NOT derived from request headers (host/x-forwarded-host)
    // — behind the reverse proxy those can still resolve to this server's
    // own internal bind address rather than the real public domain (see
    // middleware.ts for the same issue and fuller explanation). A literal
    // hardcoded "http://localhost:3001/dashboard" here previously sent every
    // production login through to localhost instead of crm.pratipal.in.
    const selfUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");

    redirect(`${mainAppUrl}/admin/login?redirect=${encodeURIComponent(`${selfUrl}/dashboard`)}`);
  }

  const adminName = userPayload.full_name || "Administrator";
  const userRole: UserRole = userPayload.role;
  const initials = adminName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join("");

  return (
    <RoleProvider role={userRole}>
      <div className="flex h-screen bg-[#f3f5f0] overflow-hidden font-sans p-4 gap-5">
        {/* Sidebar Navigation */}
        <aside className="w-[76px] bg-white flex flex-col items-center pt-4 pb-5 rounded-3xl border border-slate-200/70 shadow-surface shrink-0">
          <div className="h-11 w-11 rounded-2xl overflow-hidden flex items-center justify-center mb-7 shrink-0 bg-slate-50 border border-slate-100 p-1.5">
            <img src={BRAND_LOGO_URL} alt={`${BRAND_NAME} Logo`} className="max-h-full max-w-full object-contain" />
          </div>
          <SidebarNav />
          <div className="mt-auto pt-4 flex flex-col items-center gap-2">
            <div
              title={`${adminName} · ${userRole}`}
              className="h-9 w-9 rounded-full bg-slate-900 text-white text-[11px] font-semibold flex items-center justify-center select-none"
            >
              {initials || "A"}
            </div>
          </div>
        </aside>

        {/* Main Panel Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header Panel */}
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 pb-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[22px] font-semibold text-slate-900 tracking-[-0.01em] leading-none">
                  Welcome back, {adminName.split(" ")[0]}
                </h1>
                {userRole !== "admin" && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                    {userRole}
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-[13px] mt-1.5">
                Here's what's happening across your campaigns today.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full lg:w-auto">
              <HeaderControls />
              <a
                href={`${process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3000"}/admin`}
                className="hidden sm:inline-flex items-center text-[12.5px] font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm px-4 py-2.5 rounded-full transition-colors shrink-0"
              >
                ← Admin Portal
              </a>
            </div>
          </header>

          {/* Content Port */}
          <main className="flex-1 overflow-y-auto pr-1 -mr-1">
            {children}
          </main>
        </div>
      </div>
    </RoleProvider>
  );
}
