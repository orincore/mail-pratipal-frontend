"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";

export default function TimeframeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeframe = searchParams.get("timeframe") || "weekly";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    router.push(`/dashboard?timeframe=${val}`);
  };

  return (
    <div className="relative inline-flex items-center">
      <Calendar className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
      <select
        value={timeframe}
        onChange={handleChange}
        className="pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-slate-700 appearance-none shadow-sm cursor-pointer hover:border-slate-350 transition-colors"
        style={{ color: "#334155" }}
      >
        <option value="daily">Today (Daily)</option>
        <option value="weekly">Last 7 Days (Weekly)</option>
        <option value="monthly">Last 30 Days (Monthly)</option>
      </select>
      <div className="absolute right-3 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-400 h-0 w-0" />
    </div>
  );
}
