"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" },
] as const;

export default function TimeframeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeframe = searchParams.get("timeframe") || "weekly";

  return (
    <div className="inline-flex items-center gap-0.5 bg-slate-100 p-1 rounded-full shrink-0">
      {OPTIONS.map((opt) => {
        const active = timeframe === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => router.push(`/dashboard?timeframe=${opt.value}`)}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-all cursor-pointer ${
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
