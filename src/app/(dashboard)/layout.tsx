import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  Mail
} from "lucide-react";
import SidebarNav from "./SidebarNav";
import HeaderControls from "./HeaderControls";

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

  // Double-verify admin roles at the page level
  if (!userPayload || userPayload.role !== "admin") {
    const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3000";
    redirect(`${mainAppUrl}/admin/login?redirect=http://localhost:3001/dashboard`);
  }

  const adminName = userPayload.full_name || "Administrator";
  const adminEmail = userPayload.email;

  return (
    <div className="flex h-screen bg-[#f3f5f0] overflow-hidden font-sans pt-1.5 px-4 pb-4 gap-6">
      {/* Sidebar Navigation */}
      <aside className="w-20 bg-white flex flex-col justify-start items-center pt-3 pb-6 rounded-[28px] border border-[#e2e8f0]/40 shadow-sm shrink-0">
        <div className="flex flex-col items-center w-full">
          {/* Logo Brand Panel */}
          <div className="h-12 w-12 rounded-full overflow-hidden flex items-center justify-center mb-8 shrink-0 bg-white shadow-sm border border-slate-100/50 p-1">
            <img src="/logo.png" alt="Pratipal Logo" className="max-h-full max-w-full object-contain" />
          </div>

          {/* Navigation Links */}
          <SidebarNav />
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Panel */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 pb-2 mb-6 gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
              Hello, {adminName.split(" ")[0]}!
            </h1>
            <p className="text-slate-400 text-xs mt-1.5 font-medium">
              Explore information and activity about your campaign console
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <HeaderControls />

            {/* Back Link */}
            <a
              href={`${process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3000"}/admin`}
              className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/50 shadow-sm px-4 py-2.5 rounded-full transition-all shrink-0"
            >
              ← Admin Portal
            </a>
          </div>
        </header>

        {/* Content Port */}
        <main className="flex-1 overflow-y-auto pr-1">
          <div className="space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

