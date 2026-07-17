"use client";

import React, { useMemo, useState } from "react";

interface DailyStat {
  dateLabel: string;
  sent: number;
  emailOpens: number;
  whatsappSent: number;
  whatsappOpens: number;
}

const CHANNELS = [
  { key: "email", label: "Email", sentKey: "sent", openKey: "emailOpens", color: "#059669", light: "#a7f3d0" },
  { key: "whatsapp", label: "WhatsApp", sentKey: "whatsappSent", openKey: "whatsappOpens", color: "#7c3aed", light: "#ddd6fe" },
] as const;

const WIDTH = 760;
const HEIGHT = 220;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PAD_LEFT = 34;
const PAD_RIGHT = 12;

/** Evenly-spaced, non-duplicate tick values ending at a "nice" round max. */
function niceTicks(max: number, targetCount = 4): number[] {
  if (max <= 0) return [0, 1];
  const rawStep = max / targetCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  const rawStepNice = residual > 5 ? 10 * magnitude : residual > 2 ? 5 * magnitude : residual > 1 ? 2 * magnitude : magnitude;
  // These are always integer counts — a sub-1 step would round multiple
  // distinct values down to the same integer and produce duplicate ticks.
  const step = Math.max(1, rawStepNice);
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= niceMax + step / 1e6; v += step) ticks.push(Math.round(v));
  return ticks;
}

export default function PerformanceChart({ dailyStats }: { dailyStats: DailyStat[] }) {
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]["key"]>("email");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const active = CHANNELS.find((c) => c.key === channel)!;

  const areaY = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const areaX = WIDTH - PAD_LEFT - PAD_RIGHT;
  const n = Math.max(dailyStats.length, 1);
  const colWidth = areaX / n;

  const rawMax = useMemo(() => {
    return Math.max(...dailyStats.map((d) => Math.max(d[active.sentKey] || 0, d[active.openKey] || 0)), 1);
  }, [dailyStats, active]);

  const ticks = useMemo(() => niceTicks(rawMax), [rawMax]);
  const maxVal = ticks[ticks.length - 1];

  const pointX = (i: number) => PAD_LEFT + colWidth * i + colWidth / 2;
  const pointY = (v: number) => HEIGHT - PAD_BOTTOM - (v / maxVal) * areaY;

  const sentPoints = dailyStats.map((d, i) => [pointX(i), pointY(d[active.sentKey] || 0)]);
  const openPoints = dailyStats.map((d, i) => [pointX(i), pointY(d[active.openKey] || 0)]);

  const linePath = (pts: number[][]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

  const areaPath =
    openPoints.length > 0
      ? `${linePath(openPoints)} L${openPoints[openPoints.length - 1][0].toFixed(1)},${(HEIGHT - PAD_BOTTOM).toFixed(1)} L${openPoints[0][0].toFixed(1)},${(HEIGHT - PAD_BOTTOM).toFixed(1)} Z`
      : "";

  const showLabelAt = (idx: number) => {
    if (dailyStats.length <= 7) return true;
    if (dailyStats.length === 24) return idx % 4 === 0;
    if (dailyStats.length === 30) return idx % 5 === 0;
    return idx === dailyStats.length - 1;
  };

  const hovered = hoverIdx !== null ? dailyStats[hoverIdx] : null;
  const hoverSent = hovered ? hovered[active.sentKey] || 0 : 0;
  const hoverOpens = hovered ? hovered[active.openKey] || 0 : 0;
  const hoverRate = hoverSent ? Math.round((hoverOpens / hoverSent) * 100) : 0;

  const gradientId = `chart-gradient-${channel}`;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-surface p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-1">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">Delivery performance</h2>
          <p className="text-slate-500 text-[12.5px] mt-0.5">Sent vs. opened, by channel</p>
        </div>
        <div className="inline-flex items-center gap-0.5 bg-slate-100 p-1 rounded-full self-start">
          {CHANNELS.map((c) => (
            <button
              key={c.key}
              onClick={() => {
                setChannel(c.key);
                setHoverIdx(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-all cursor-pointer ${
                channel === c.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-3">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={active.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={active.color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y axis grid */}
          {ticks.map((val) => {
            const y = HEIGHT - PAD_BOTTOM - (val / maxVal) * areaY;
            return (
              <g key={val}>
                <line x1={PAD_LEFT} y1={y} x2={WIDTH - PAD_RIGHT} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={PAD_LEFT - 8} y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-medium tabular-nums">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Hover columns (invisible hit targets) */}
          {dailyStats.map((_, i) => (
            <rect
              key={i}
              x={PAD_LEFT + colWidth * i}
              y={PAD_TOP}
              width={colWidth}
              height={areaY}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          ))}

          {/* Area fill under "opened" */}
          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

          {/* Sent line (muted) */}
          <path d={linePath(sentPoints)} fill="none" stroke="#cbd5e1" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />

          {/* Opened line (bold) */}
          <path d={linePath(openPoints)} fill="none" stroke={active.color} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />

          {/* Hover guideline + markers */}
          {hoverIdx !== null && (
            <g pointerEvents="none">
              <line
                x1={pointX(hoverIdx)}
                y1={PAD_TOP}
                x2={pointX(hoverIdx)}
                y2={HEIGHT - PAD_BOTTOM}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx={sentPoints[hoverIdx][0]} cy={sentPoints[hoverIdx][1]} r="3.5" fill="#fff" stroke="#94a3b8" strokeWidth="1.75" />
              <circle cx={openPoints[hoverIdx][0]} cy={openPoints[hoverIdx][1]} r="3.5" fill="#fff" stroke={active.color} strokeWidth="2" />
            </g>
          )}

          {/* X axis labels */}
          {dailyStats.map((d, i) =>
            showLabelAt(i) ? (
              <text
                key={i}
                x={pointX(i)}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="text-[9.5px] font-medium fill-slate-400"
              >
                {d.dateLabel}
              </text>
            ) : null
          )}
        </svg>

        {/* Floating tooltip */}
        {hovered && (
          <div
            className="absolute top-2 -translate-x-1/2 bg-slate-900 text-white rounded-xl px-3.5 py-2.5 shadow-xl pointer-events-none z-10 whitespace-nowrap"
            style={{ left: `${(pointX(hoverIdx!) / WIDTH) * 100}%` }}
          >
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{hovered.dateLabel}</div>
            <div className="flex items-center gap-3 mt-1 text-[12px]">
              <span className="tabular-nums">
                <span className="text-slate-400">Sent</span> <span className="font-semibold">{hoverSent.toLocaleString()}</span>
              </span>
              <span className="tabular-nums">
                <span className="text-slate-400">Opened</span> <span className="font-semibold">{hoverOpens.toLocaleString()}</span>
              </span>
              <span className="tabular-nums font-semibold" style={{ color: active.color }}>
                {hoverRate}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 pt-3 border-t border-slate-100 text-[11.5px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-slate-300 block" />
          Sent
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full block" style={{ backgroundColor: active.color }} />
          Opened
        </div>
      </div>
    </div>
  );
}
