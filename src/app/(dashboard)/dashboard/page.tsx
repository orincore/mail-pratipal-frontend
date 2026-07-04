import React from "react";
import connectDB from "@/lib/mongodb";
import EmailSubscriber from "@/models/EmailSubscriber";
import EmailCampaign from "@/models/EmailCampaign";
import EmailEvent from "@/models/EmailEvent";
import { 
  Users, 
  Mail, 
  CheckCircle, 
  MousePointerClick, 
  AlertOctagon, 
  Calendar,
  Layers,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";

interface DashboardStat {
  label: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export default async function DashboardPage() {
  await connectDB();

  // 1. Fetch metrics from MongoDB
  const totalSubscribers = await EmailSubscriber.countDocuments({ status: "subscribed" });
  const totalSent = await EmailEvent.countDocuments({ event_type: "sent" });
  const totalOpens = await EmailEvent.countDocuments({ event_type: "open" });
  const totalClicks = await EmailEvent.countDocuments({ event_type: "click" });
  const totalBounces = await EmailEvent.countDocuments({ event_type: "bounce" });
  const totalComplaints = await EmailEvent.countDocuments({ event_type: "complaint" });
  
  const activeSchedules = await EmailCampaign.countDocuments({ status: "scheduled" });

  // 2. Calculate engagement and delivery rates
  const openRate = totalSent ? ((totalOpens / totalSent) * 100) : 0;
  const clickRate = totalSent ? ((totalClicks / totalSent) * 100) : 0;
  const bounceRate = totalSent ? ((totalBounces / totalSent) * 100) : 0;
  const complaintRate = totalSent ? ((totalComplaints / totalSent) * 100) : 0;
  const deliveryRate = totalSent ? (((totalSent - totalBounces) / totalSent) * 100) : 100;

  // 3. Fetch recent and upcoming campaigns
  const recentCampaigns = await EmailCampaign.find()
    .sort({ created_at: -1 })
    .limit(5)
    .populate("template_id", "name");

  // 4. Generate data points for past 7 days to draw the SVG chart
  const pastSevenDays = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - idx));
    return d;
  });

  const dailyStats = [];
  for (const day of pastSevenDays) {
    const startOfDay = new Date(day.setHours(0, 0, 0, 0));
    const endOfDay = new Date(day.setHours(23, 59, 59, 999));

    const sent = await EmailEvent.countDocuments({
      event_type: "sent",
      timestamp: { $gte: startOfDay, $lte: endOfDay },
    });

    const opens = await EmailEvent.countDocuments({
      event_type: "open",
      timestamp: { $gte: startOfDay, $lte: endOfDay },
    });

    dailyStats.push({
      dateLabel: day.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      sent,
      opens,
    });
  }

  // Calculate SVG Chart Dimensions
  const chartHeight = 200;
  const chartWidth = 500;
  const maxVal = Math.max(...dailyStats.map(d => Math.max(d.sent, d.opens, 10)));
  const padding = 30;

  const pointsSent = dailyStats.map((stat, idx) => {
    const x = padding + (idx * (chartWidth - padding * 2)) / (dailyStats.length - 1);
    const y = chartHeight - padding - (stat.sent * (chartHeight - padding * 2)) / maxVal;
    return `${x},${y}`;
  }).join(" ");

  const pointsOpens = dailyStats.map((stat, idx) => {
    const x = padding + (idx * (chartWidth - padding * 2)) / (dailyStats.length - 1);
    const y = chartHeight - padding - (stat.opens * (chartHeight - padding * 2)) / maxVal;
    return `${x},${y}`;
  }).join(" ");

  const stats: DashboardStat[] = [
    {
      label: "Active Subscribers",
      value: totalSubscribers.toLocaleString(),
      description: "Active subscribers",
      icon: Users,
      color: "from-emerald-500 to-teal-500",
    },
    {
      label: "Emails Dispatched",
      value: totalSent.toLocaleString(),
      description: "Total campaigns sent",
      icon: Mail,
      color: "from-blue-500 to-indigo-500",
    },
    {
      label: "Delivered",
      value: `${deliveryRate.toFixed(1)}%`,
      description: `${(totalSent - totalBounces).toLocaleString()} delivered`,
      icon: CheckCircle,
      color: "from-teal-500 to-cyan-500",
    },
    {
      label: "Open Rate",
      value: `${openRate.toFixed(1)}%`,
      description: `${totalOpens.toLocaleString()} open events`,
      icon: Layers,
      color: "from-purple-500 to-violet-500",
    },
    {
      label: "Click Rate",
      value: `${clickRate.toFixed(1)}%`,
      description: `${totalClicks.toLocaleString()} link clicks`,
      icon: MousePointerClick,
      color: "from-orange-500 to-amber-500",
    },
    {
      label: "Bounce / Complaint",
      value: `${bounceRate.toFixed(1)}% / ${complaintRate.toFixed(1)}%`,
      description: `${totalBounces} bounce / ${totalComplaints} complaint`,
      icon: AlertOctagon,
      color: "from-rose-500 to-pink-500",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title & Top Banner */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Console Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Overview of delivery metrics and list growth.</p>
        </div>
        <div className="flex gap-3">
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
      </div>

      {/* SVG Analytics Chart and Schedule panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Middle: SVG 7-Day Performance Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4">7-Day Dispatch Performance</h2>
          
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

              {/* Gradients */}
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* X Axis Labels */}
              {dailyStats.map((stat, idx) => {
                const x = padding + (idx * (chartWidth - padding * 2)) / (dailyStats.length - 1);
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
              <span className="text-slate-600">Emails Sent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-emerald-500 block" />
              <span className="text-slate-600">Emails Opened</span>
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
            <p className="text-slate-500 text-xs leading-relaxed">
              We found <span className="font-bold text-emerald-600">{activeSchedules}</span> email campaigns currently scheduled to run. Ensure the background daemon process is running to dispatch these jobs.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-6 mt-6 space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">System Diagnostics</span>
            <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Worker Status</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                  <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" /> Active
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Target Driver</span>
                <span className="font-mono text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded text-[10px] uppercase">
                  {process.env.EMAIL_PROVIDER || "Mock/Auto"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Campaign Lists */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Recent Email Campaigns</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="pb-3">Campaign Name</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-right">Sent</th>
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
                recentCampaigns.map((camp) => (
                  <tr key={camp._id.toString()} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 font-semibold text-slate-800">
                      <div>
                        <span>{camp.name}</span>
                        <span className="text-[10px] text-slate-400 block font-normal">{camp.subject}</span>
                      </div>
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
                    <td className="py-3.5 text-right font-mono font-medium">{camp.stats.sent.toLocaleString()}</td>
                    <td className="py-3.5 text-right font-mono font-medium">
                      {camp.stats.opens.toLocaleString()} 
                      <span className="text-[10px] text-slate-400 block font-normal">
                        ({camp.stats.sent ? ((camp.stats.opens / camp.stats.sent) * 100).toFixed(1) : 0}%)
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-mono font-medium">
                      {camp.stats.clicks.toLocaleString()}
                      <span className="text-[10px] text-slate-400 block font-normal">
                        ({camp.stats.sent ? ((camp.stats.clicks / camp.stats.sent) * 100).toFixed(1) : 0}%)
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-mono text-slate-500 font-medium">{camp.stats.unsubscribed}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
