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
    <div className="relative inline-flex items-center shrink-0">
      <Calendar className="absolute left-3.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
      <select
        value={timeframe}
        onChange={handleChange}
        className="pl-9 pr-8 py-2 bg-white hover:bg-slate-50 border border-slate-200/50 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 bg-white text-slate-650 appearance-none shadow-sm cursor-pointer transition-colors"
      >
        <option value="daily">Today's Data</option>
        <option value="weekly">This Week</option>
        <option value="monthly">This Month</option>
      </select>
      <div className="absolute right-3.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-400 h-0 w-0" />
    </div>
  );
}
