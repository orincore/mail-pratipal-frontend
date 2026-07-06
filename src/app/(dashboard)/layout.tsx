import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  LayoutDashboard,
  Users,
  Send,
  FileCode,
  LogOut,
  Mail,
  Video
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Subscribers", href: "/subscribers", icon: Users },
  { label: "Campaigns", href: "/campaigns", icon: Send },
  { label: "Templates", href: "/templates", icon: FileCode },
  { label: "Reminders", href: "/webinars", icon: Video },
];

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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shadow-md">
        <div>
          {/* Logo Brand Panel */}
          <div className="h-16 flex items-center px-6 bg-slate-950 gap-2.5 border-b border-slate-800/50">
            <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-white tracking-wide text-sm block leading-none">Pratipal Mailer</span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Campaign Console</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-slate-800 hover:text-white group"
              >
                <item.icon className="h-4.5 w-4.5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* User Info / Logout Panel */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="h-9 w-9 bg-emerald-600/10 text-emerald-400 rounded-xl flex items-center justify-center font-bold text-sm border border-emerald-500/20">
              {adminName[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate leading-snug">{adminName}</p>
              <p className="text-[10px] text-slate-500 truncate">{adminEmail}</p>
            </div>
          </div>
          <a
            href={`${process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3000"}/api/auth/logout`}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-rose-950/30 hover:text-rose-400 text-xs font-semibold text-slate-400 rounded-xl transition-all border border-slate-850"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout Session
          </a>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Panel */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 shadow-sm z-10">
          <div />

          <div className="flex items-center gap-4">
            <a
              href={`${process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3000"}/admin`}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-lg transition-all"
            >
              ← Back to main admin panel
            </a>
          </div>
        </header>

        {/* Content Port */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
