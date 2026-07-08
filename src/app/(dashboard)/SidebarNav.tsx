"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Send,
  FileCode,
  Video,
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

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col items-center gap-4 w-full px-2">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`group relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
              isActive
                ? "bg-[#0f172a] text-white shadow-md shadow-slate-900/10"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <item.icon className="h-5 w-5 transition-transform group-hover:scale-105" />
            
            {/* Elegant Tooltip */}
            <div className="absolute left-16 scale-0 group-hover:scale-100 transition-all duration-150 origin-left bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg pointer-events-none z-50 whitespace-nowrap">
              {item.label}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
