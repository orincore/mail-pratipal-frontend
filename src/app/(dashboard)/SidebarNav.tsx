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
  Filter,
  ShieldOff,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Subscribers", href: "/subscribers", icon: Users },
  { label: "Segments", href: "/segments", icon: Filter },
  { label: "Campaigns", href: "/campaigns", icon: Send },
  { label: "Templates", href: "/templates", icon: FileCode },
  { label: "Reminders", href: "/webinars", icon: Video },
  { label: "Suppressions", href: "/suppressions", icon: ShieldOff },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col items-center gap-1.5 w-full px-2.5">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className="group relative flex items-center justify-center w-full"
          >
            {/* Active indicator bar */}
            <span
              className={`absolute -left-2.5 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-emerald-600 transition-all duration-200 ${
                isActive ? "opacity-100 scale-100" : "opacity-0 scale-50"
              }`}
            />
            <span
              className={`flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200 ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 2} />
            </span>

            {/* Tooltip */}
            <div className="absolute left-[calc(100%+10px)] scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-150 origin-left bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none z-50 whitespace-nowrap">
              {item.label}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
