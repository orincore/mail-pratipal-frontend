import React from "react";
import { cookies } from "next/headers";
import {
  Users,
  Mail,
  Layers,
  ArrowUpRight,
  MessageCircle,
  MoreHorizontal
} from "lucide-react";
import Link from "next/link";
import TimeframeFilter from "./TimeframeFilter";

interface DashboardStat {
  label: string;
  value: string | number;
  growth: string;
  growthDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
}

export default async function DashboardPage(props: {
  searchParams: Promise<{ timeframe?: string }>
}) {
  const searchParams = await props.searchParams;
  const timeframe = searchParams.timeframe || "weekly";

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("pratipal_session")?.value;

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
  const statsRes = await fetch(`${backendUrl}/api/dashboard-stats?timeframe=${timeframe}`, {
    headers: {
      Cookie: `pratipal_session=${sessionCookie}`,
    },
    next: { revalidate: 0 },
    cache: "no-store"
  });

  if (!statsRes.ok) {
    throw new Error("Failed to load dashboard statistics from backend");
  }

  const {
    totalSubscribers,
    totalSent,
    totalOpens,
    totalClicks,
    totalBounces,
    totalComplaints,
    totalWhatsappSent = 0,
    totalWhatsappFailed = 0,
    totalWhatsappOpens = 0,
    activeSchedules,
    recentCampaigns,
    recentReminders = [],
    dailyStats,
  } = await statsRes.json();

  // Calculate engagement and delivery rates
  const openRate = totalSent ? ((totalOpens / totalSent) * 100) : 0;
  const deliveryRate = totalSent ? (((totalSent - totalBounces) / totalSent) * 100) : 100;
  const whatsappDeliveryRate = totalWhatsappSent ? (((totalWhatsappSent - totalWhatsappFailed) / totalWhatsappSent) * 100) : 100;
  const whatsappOpenRate = totalWhatsappSent ? ((totalWhatsappOpens / totalWhatsappSent) * 100) : 0;

  const stats: DashboardStat[] = [
    {
      label: "Active Subscribers",
      value: totalSubscribers.toLocaleString(),
      growth: "+8.2%",
      growthDesc: "vs last month",
      icon: Users,
      iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100/50",
    },
    {
      label: "Emails Dispatched",
      value: totalSent.toLocaleString(),
      growth: `${deliveryRate.toFixed(1)}%`,
      growthDesc: "Delivery success",
      icon: Mail,
      iconBg: "bg-blue-50 text-blue-600 border border-blue-100/50",
    },
    {
      label: "WhatsApp Sent",
      value: totalWhatsappSent.toLocaleString(),
      growth: `${whatsappDeliveryRate.toFixed(1)}%`,
      growthDesc: "Delivery success",
      icon: MessageCircle,
      iconBg: "bg-purple-50 text-purple-650 border border-purple-100/50",
    },
    {
      label: "Email Open Rate",
      value: `${openRate.toFixed(1)}%`,
      growth: "+4.1%",
      growthDesc: `${totalOpens.toLocaleString()} open events`,
      icon: Layers,
      iconBg: "bg-teal-50 text-teal-600 border border-teal-100/50",
    },
    {
      label: "WhatsApp Open Rate",
      value: `${whatsappOpenRate.toFixed(1)}%`,
      growth: "+6.8%",
      growthDesc: `${totalWhatsappOpens.toLocaleString()} open events`,
      icon: MessageCircle,
      iconBg: "bg-orange-50 text-orange-600 border border-orange-100/50",
    },
  ];

  const topStats = stats.slice(0, 3);
  const leftStats = stats.slice(3, 5);

  // SVG Chart Config
  const chartHeight = 120;
  const chartWidth = 540;
  const paddingTop = 10;
  const paddingBottom = 12;
  const paddingLeft = 24;
  const paddingRight = 10;

  const chartAreaY = chartHeight - paddingTop - paddingBottom;
  const chartAreaX = chartWidth - paddingLeft - paddingRight;

  const maxVal = Math.max(...dailyStats.map((d: any) => Math.max(
    d.sent || 0,
    d.emailOpens || 0,
    d.whatsappSent || 0,
    d.whatsappOpens || 0
  )), 1) || 1;

  const colWidth = chartAreaX / dailyStats.length;

  // Note: recentReminders is now fetched directly from the backend dashboard-stats API
  return (
    <div className="space-y-4 animate-fade-in text-slate-800">

      {/* Action Title row */}
      <div className="flex justify-between items-center bg-white py-3 px-5 rounded-[28px] border border-[#e8ece6] shadow-sm">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight">Overview Dashboard</h2>
          <p className="text-slate-400 text-[10px] mt-0.5 font-medium">Real-time statistics of user interactions & list delivery rates</p>
        </div>
        <div className="flex items-center gap-2.5">
          <TimeframeFilter />
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-full text-[10px] transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
          >
            Create Campaign <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Bento Grid Stats Card Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topStats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-[28px] border border-[#e8ece6] p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all min-h-[115px] group relative"
          >
            <div className="flex items-center justify-between w-full">
              <div className={`w-9 h-9 rounded-full ${stat.iconBg} flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shrink-0`}>
                <stat.icon className="h-4.5 w-4.5" />
              </div>
              <button className="text-slate-400 hover:text-slate-655 p-1 hover:bg-slate-55 rounded-full transition-colors cursor-pointer shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">{stat.label}</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${stat.growth.startsWith("-") || stat.growth.includes("bounce") ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                  }`}>
                  {stat.growth}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">{stat.growthDesc}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Middle Row: Stacked Open Rates (Left) & Performance Chart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left column: Email & WhatsApp Open Rates stacked vertically */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          {leftStats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-[28px] border border-[#e8ece6] p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all flex-1 min-h-[115px] group relative"
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-9 h-9 rounded-full ${stat.iconBg} flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shrink-0`}>
                  <stat.icon className="h-4.5 w-4.5" />
                </div>
                <button className="text-slate-400 hover:text-slate-655 p-1 hover:bg-slate-55 rounded-full transition-colors cursor-pointer shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">{stat.label}</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${stat.growth.startsWith("-") || stat.growth.includes("bounce") ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                    }`}>
                    {stat.growth}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold">{stat.growthDesc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right column: SVG Comparison Chart (Email vs WhatsApp) */}
        <div className="lg:col-span-2 bg-white rounded-[28px] border border-[#e8ece6] p-4 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1.5">
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Email vs WhatsApp Channel Performance</h2>
              <p className="text-slate-400 text-[10px] mt-0.5 font-medium">Comparative delivery and response funnel metrics</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-slate-55 hover:bg-slate-100 text-slate-550 rounded-full text-[9px] font-bold border border-slate-200/50 cursor-pointer">
                {timeframe === "weekly" ? "Weekly" : timeframe === "daily" ? "Daily" : "Monthly"}
              </span>
            </div>
          </div>

          <div className="w-full flex-1 flex flex-col justify-between mt-1">
            <div className="w-full flex-1 flex items-center justify-center min-h-[110px]">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full overflow-visible"
              >
                <defs>
                  <filter id="shadow2" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
                  </filter>
                </defs>

                {/* Dynamic Y Axis Grid Lines & Markers */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const val = Math.round(maxVal * ratio);
                  const y = chartHeight - paddingBottom - chartAreaY * ratio;
                  return (
                    <g key={idx}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={chartWidth - paddingRight}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                        strokeDasharray={idx === 0 || idx === 4 ? "0" : "3 3"}
                      />
                      <text
                        x={paddingLeft - 5}
                        y={y + 3}
                        textAnchor="end"
                        className="text-[7.5px] font-bold fill-slate-400 font-sans"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Grouped bars: Email Sent, Email Opened, WhatsApp Sent, WhatsApp Opened */}
                {dailyStats.map((stat: any, idx: number) => {
                  const colX = paddingLeft + idx * colWidth;
                  const groupW = colWidth - 6;

                  // Calculate size of each of the 4 columns
                  const barW = Math.max(2, Math.floor((groupW - 6) / 4));

                  const emailSentVal = stat.sent || 0;
                  const emailOpenVal = stat.emailOpens || 0;
                  const waSentVal = stat.whatsappSent || 0;
                  const waOpenVal = stat.whatsappOpens || 0;

                  const emailSentH = emailSentVal > 0 ? (emailSentVal / maxVal) * chartAreaY : 2;
                  const emailOpenH = emailOpenVal > 0 ? (emailOpenVal / maxVal) * chartAreaY : 2;
                  const waSentH = waSentVal > 0 ? (waSentVal / maxVal) * chartAreaY : 2;
                  const waOpenH = waOpenVal > 0 ? (waOpenVal / maxVal) * chartAreaY : 2;

                  const esX = colX + 3;
                  const eoX = esX + barW + 1;
                  const wsX = eoX + barW + 1;
                  const woX = wsX + barW + 1;

                  const esY = chartHeight - paddingBottom - emailSentH;
                  const eoY = chartHeight - paddingBottom - emailOpenH;
                  const wsY = chartHeight - paddingBottom - waSentH;
                  const woY = chartHeight - paddingBottom - waOpenH;

                  return (
                    <g key={idx} className="group/bar cursor-pointer">
                      {/* Background column track to expand hover target */}
                      <rect
                        x={colX + 1}
                        y={paddingTop}
                        width={colWidth - 2}
                        height={chartAreaY}
                        fill="#f8fafc"
                        opacity="0"
                        className="hover:opacity-100 transition-opacity fill-slate-50/50"
                      />

                      {/* Email Sent (Light Green) */}
                      <rect x={esX} y={esY} width={barW} height={emailSentH} rx="1.5" ry="1.5" fill="#a7f3d0" />

                      {/* Email Opened (Dark Green) */}
                      <rect x={eoX} y={eoY} width={barW} height={emailOpenH} rx="1.5" ry="1.5" fill="#047857" />

                      {/* WhatsApp Sent (Light Indigo) */}
                      <rect x={wsX} y={wsY} width={barW} height={waSentH} rx="1.5" ry="1.5" fill="#c7d2fe" />

                      {/* WhatsApp Opened (Dark Indigo) */}
                      <rect x={woX} y={woY} width={barW} height={waOpenH} rx="1.5" ry="1.5" fill="#4f46e5" />

                      {/* Interactive Corporate Tooltip */}
                      <g className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 pointer-events-none" filter="url(#shadow2)">
                        <rect
                          x={colX + colWidth / 2 - 65}
                          y={Math.min(esY, eoY, wsY, woY) - 42}
                          width="130"
                          height="36"
                          rx="8"
                          fill="#0f172a"
                        />
                        <text x={colX + colWidth / 2} y={Math.min(esY, eoY, wsY, woY) - 30} textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
                          {stat.dateLabel} REPORT
                        </text>
                        <text x={colX + colWidth / 2} y={Math.min(esY, eoY, wsY, woY) - 21} textAnchor="middle" fill="#34d399" fontSize="6.5" fontWeight="black">
                          EMAIL: {emailOpenVal}/{emailSentVal} ({emailSentVal ? Math.round(emailOpenVal/emailSentVal*100) : 0}%)
                        </text>
                        <text x={colX + colWidth / 2} y={Math.min(esY, eoY, wsY, woY) - 13} textAnchor="middle" fill="#a5b4fc" fontSize="6.5" fontWeight="black">
                          WHATSAPP: {waOpenVal}/{waSentVal} ({waSentVal ? Math.round(waOpenVal/waSentVal*100) : 0}%)
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* X Axis Date Labels */}
                {dailyStats.map((stat: any, idx: number) => {
                  const x = paddingLeft + idx * colWidth + colWidth / 2;
                  const showLabel =
                    dailyStats.length <= 7 ||
                    (dailyStats.length === 24 && idx % 4 === 0) ||
                    (dailyStats.length === 30 && idx % 5 === 0) ||
                    idx === dailyStats.length - 1;
                  if (!showLabel) return null;
                  return (
                    <text key={idx} x={x} y={chartHeight - 2} textAnchor="middle" className="text-[8px] font-black fill-slate-450 uppercase tracking-wider">
                      {stat.dateLabel}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Chart Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-2 pb-0.5 text-[8.5px] font-bold text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-sm bg-[#a7f3d0] block" />
                <span>Email Sent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-sm bg-[#047857] block" />
                <span>Email Opened</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-sm bg-[#c7d2fe] block" />
                <span>WhatsApp Sent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-sm bg-[#4f46e5] block" />
                <span>WhatsApp Read</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Campaigns (50%) & Recent Reminders (50%) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Recent Campaigns (50%) */}
        <div className="bg-white rounded-[28px] border border-[#e8ece6] p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Recent Campaigns</h2>
              <Link href="/campaigns" className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer">
                See All
              </Link>
            </div>

            <div className="space-y-3">
              {recentCampaigns.length === 0 ? (
                <div className="py-6 text-center text-slate-400 font-bold text-[10px]">
                  No recent campaigns
                </div>
              ) : (
                recentCampaigns.slice(0, 5).map((camp: any) => {
                  const isWhatsapp = camp.channel === "whatsapp";
                  return (
                    <div key={camp._id || camp.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isWhatsapp ? "bg-purple-50 text-purple-655" : "bg-emerald-50 text-emerald-600"
                          }`}>
                          {isWhatsapp ? <MessageCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 text-xs block truncate leading-tight">
                            {camp.name}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">
                            {isWhatsapp ? `WhatsApp Template` : camp.subject || "No Subject"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${camp.status === "sent" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            camp.status === "scheduled" ? "bg-amber-50 text-amber-700 border-amber-100" :
                              "bg-slate-50 text-slate-600 border-slate-100"
                          }`}>
                          {camp.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Recent Reminders (50%) */}
        <div className="bg-white rounded-[28px] border border-[#e8ece6] p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Recent Reminders</h2>
              <Link href="/webinars" className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer">
                See All
              </Link>
            </div>

            <div className="space-y-3">
              {recentReminders.length === 0 ? (
                <div className="py-6 text-center text-slate-400 font-bold text-[10px]">
                  No recent reminders
                </div>
              ) : (
                recentReminders.map((rem: any) => {
                  const isWhatsapp = rem.channel === "whatsapp";
                  return (
                    <div key={rem._id || rem.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isWhatsapp ? "bg-purple-50 text-purple-655" : "bg-emerald-50 text-emerald-600"
                          }`}>
                          {isWhatsapp ? <MessageCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 text-xs block truncate leading-tight">
                            {rem.name} - {rem.webinar_id?.title || "Webinar"}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">
                            Scheduled: {new Date(rem.computed_send_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${rem.dispatch_status === "sent" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            rem.dispatch_status === "pending" ? "bg-amber-50 text-amber-700 border-amber-100" :
                              "bg-slate-50 text-slate-600 border-slate-100"
                          }`}>
                          {rem.dispatch_status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
