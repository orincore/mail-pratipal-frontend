import React from "react";
import { cookies } from "next/headers";
import { 
  Users, 
  Mail, 
  CheckCircle, 
  MousePointerClick, 
  AlertOctagon, 
  Calendar,
  Layers,
  ArrowUpRight,
  MessageCircle
} from "lucide-react";
import Link from "next/link";
import FailedDeliveriesCard from "./FailedDeliveriesCard";
import TimeframeFilter from "./TimeframeFilter";

interface DashboardStat {
  label: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
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
    next: { revalidate: 0 }
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
    dailyStats,
    emailProvider
  } = await statsRes.json();

  // Calculate engagement and delivery rates
  const openRate = totalSent ? ((totalOpens / totalSent) * 100) : 0;
  const clickRate = totalSent ? ((totalClicks / totalSent) * 100) : 0;
  const bounceRate = totalSent ? ((totalBounces / totalSent) * 100) : 0;
  const deliveryRate = totalSent ? (((totalSent - totalBounces) / totalSent) * 100) : 100;
  const whatsappDeliveryRate = totalWhatsappSent ? (((totalWhatsappSent - totalWhatsappFailed) / totalWhatsappSent) * 100) : 100;
  const whatsappOpenRate = totalWhatsappSent ? ((totalWhatsappOpens / totalWhatsappSent) * 100) : 0;

  // Calculate SVG Chart Dimensions
  const chartHeight = 200;
  const chartWidth = 500;
  const maxVal = Math.max(...dailyStats.map((d: any) => Math.max(d.sent, d.opens, d.whatsappSent || 0, 10)));
  const padding = 30;

  const pointsSent = dailyStats.map((stat: any, idx: number) => {
    const x = padding + (idx * (chartWidth - padding * 2)) / (dailyStats.length - 1);
    const y = chartHeight - padding - (stat.sent * (chartHeight - padding * 2)) / maxVal;
    return `${x},${y}`;
  }).join(" ");

  const pointsOpens = dailyStats.map((stat: any, idx: number) => {
    const x = padding + (idx * (chartWidth - padding * 2)) / (dailyStats.length - 1);
    const y = chartHeight - padding - (stat.opens * (chartHeight - padding * 2)) / maxVal;
    return `${x},${y}`;
  }).join(" ");

  const pointsWhatsapp = dailyStats.map((stat: any, idx: number) => {
    const x = padding + (idx * (chartWidth - padding * 2)) / (dailyStats.length - 1);
    const y = chartHeight - padding - ((stat.whatsappSent || 0) * (chartHeight - padding * 2)) / maxVal;
    return `${x},${y}`;
  }).join(" ");

  const stats: DashboardStat[] = [
    {
      label: "Active Subscribers",
      value: totalSubscribers.toLocaleString(),
      description: "Active subscribers on file",
      icon: Users,
      color: "from-emerald-500 to-teal-500",
    },
    {
      label: "Emails Dispatched",
      value: totalSent.toLocaleString(),
      description: `${deliveryRate.toFixed(1)}% delivery success`,
      icon: Mail,
      color: "from-blue-500 to-indigo-500",
    },
    {
      label: "WhatsApp Sent",
      value: totalWhatsappSent.toLocaleString(),
      description: `${whatsappDeliveryRate.toFixed(1)}% delivery success`,
      icon: MessageCircle,
      color: "from-purple-500 to-violet-500",
    },
    {
      label: "Email Open Rate",
      value: `${openRate.toFixed(1)}%`,
      description: `${totalOpens.toLocaleString()} open events`,
      icon: Layers,
      color: "from-teal-500 to-cyan-500",
    },
    {
      label: "WhatsApp Open Rate",
      value: `${whatsappOpenRate.toFixed(1)}%`,
      description: `${totalWhatsappOpens.toLocaleString()} open events`,
      icon: MessageCircle,
      color: "from-orange-500 to-amber-500",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* Title & Top Banner */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Console Analytics</h1>
          <p className="text-slate-505 text-sm mt-1">Overview of delivery metrics and list growth.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <TimeframeFilter />
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
          >
            Create Campaign <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Numerical Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all group"
          >
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{stat.label}</span>
              <span className="text-2xl font-bold text-slate-800 block tracking-tight">{stat.value}</span>
              <span className="text-xs text-slate-500 block">{stat.description}</span>
            </div>
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-sm shadow-indigo-500/5 group-hover:scale-105 transition-transform duration-300`}>
              <stat.icon className="h-6 w-6" />
            </div>
          </div>
        ))}
        <FailedDeliveriesCard 
          totalBounces={totalBounces} 
          totalComplaints={totalComplaints} 
          sessionCookie={sessionCookie} 
        />
      </div>

      {/* SVG Analytics Chart and Schedule panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Middle: SVG Performance Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            {timeframe === "daily" ? "Today's Dispatch Performance" :
             timeframe === "monthly" ? "30-Day Dispatch Performance" :
             "7-Day Dispatch Performance"}
          </h2>
          
          <div className="w-full flex justify-center">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full max-w-xl h-auto"
            >
              {/* Grid Lines */}
              <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#f1f5f9" strokeWidth="1" />
              <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="#f1f5f9" strokeWidth="1" />
              <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Area Under Sent Path (soft tint) */}
              <polygon
                points={`${padding},${chartHeight - padding} ${pointsSent} ${chartWidth - padding},${chartHeight - padding}`}
                fill="url(#sentGrad)"
                opacity="0.15"
              />

              {/* Sent Line */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsSent}
              />

              {/* Opened Line */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsOpens}
              />

              {/* WhatsApp Line */}
              <polyline
                fill="none"
                stroke="#a855f7"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsWhatsapp}
              />

              {/* Gradients */}
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* X Axis Labels */}
              {dailyStats.map((stat: any, idx: number) => {
                const x = padding + (idx * (chartWidth - padding * 2)) / (dailyStats.length - 1);
                
                const showLabel = 
                  dailyStats.length <= 7 || 
                  (dailyStats.length === 24 && idx % 4 === 0) || 
                  (dailyStats.length === 30 && idx % 5 === 0) ||
                  idx === dailyStats.length - 1;

                if (!showLabel) return null;

                return (
                  <text
                    key={idx}
                    x={x}
                    y={chartHeight - 10}
                    textAnchor="middle"
                    className="text-[10px] font-semibold fill-slate-400"
                  >
                    {stat.dateLabel}
                  </text>
                );
              })}
            </svg>
          </div>

          <div className="flex justify-center gap-6 mt-4 border-t border-slate-50 pt-4 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-blue-500 block" />
              <span className="text-slate-650">Emails Sent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-emerald-500 block" />
              <span className="text-slate-650">Emails Opened</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-purple-50 block" style={{ backgroundColor: "#a855f7" }} />
              <span className="text-slate-650">WhatsApp Sent</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Upcoming Scheduled campaigns count / Action list */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-800">Job Scheduler</h2>
            </div>
            <p className="text-slate-505 text-xs leading-relaxed">
              We found <span className="font-bold text-emerald-600">{activeSchedules}</span> campaigns currently scheduled to run. Ensure the background daemon process is running to dispatch these jobs.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Campaign Lists */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Recent Campaigns</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="pb-3">Campaign Name</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-right">Dispatched</th>
                <th className="pb-3 text-right">Opens</th>
                <th className="pb-3 text-right">Clicks</th>
                <th className="pb-3 text-right">Unsubs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
              {recentCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 font-medium">
                    No campaigns created yet. Click "Create Campaign" to begin.
                  </td>
                </tr>
              ) : (
                recentCampaigns.map((camp: any) => {
                  const isEmailChannel = camp.channel !== "whatsapp";
                  const openPct = camp.stats.sent ? ((camp.stats.opens / camp.stats.sent) * 100).toFixed(1) : "0";
                  const clickPct = camp.stats.sent ? ((camp.stats.clicks / camp.stats.sent) * 100).toFixed(1) : "0";

                  return (
                    <tr key={camp.id || camp._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span>{camp.name}</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                            camp.channel === "whatsapp" ? "bg-emerald-105 text-emerald-800" :
                            camp.channel === "both" ? "bg-indigo-100 text-indigo-800" :
                            "bg-sky-100 text-sky-800"
                          }`}>
                            {camp.channel || "email"}
                          </span>
                        </div>
                        {isEmailChannel ? (
                          <span className="text-[10px] text-slate-400 block font-normal">{camp.subject}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 block font-normal">Template: {camp.whatsapp_template}</span>
                        )}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          camp.status === "sent" ? "bg-emerald-50 text-emerald-600" :
                          camp.status === "sending" ? "bg-blue-50 text-blue-600" :
                          camp.status === "scheduled" ? "bg-amber-50 text-amber-600" :
                          "bg-slate-100 text-slate-500"
                        }`}>
                          {camp.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-mono font-medium">
                        {camp.channel === "both" ? (
                          <div className="text-xs">
                            <div>E: {camp.stats.sent.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-450 font-normal">W: {(camp.stats.whatsapp_sent || 0).toLocaleString()}</div>
                          </div>
                        ) : camp.channel === "whatsapp" ? (
                          <span>{(camp.stats.whatsapp_sent || 0).toLocaleString()} WA</span>
                        ) : (
                          <span>{camp.stats.sent.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right font-mono font-medium">
                        {isEmailChannel ? (
                          <>
                            {camp.stats.opens.toLocaleString()} 
                            <span className="text-[10px] text-slate-400 block font-normal">
                              ({openPct}%)
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-350">-</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right font-mono font-medium">
                        {isEmailChannel ? (
                          <>
                            {camp.stats.clicks.toLocaleString()}
                            <span className="text-[10px] text-slate-400 block font-normal">
                              ({clickPct}%)
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-350">-</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right font-mono text-slate-500 font-medium">
                        {isEmailChannel ? camp.stats.unsubscribed : <span className="text-slate-350">-</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
