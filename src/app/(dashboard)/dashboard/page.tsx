import React from "react";
import { cookies } from "next/headers";
import {
  Users,
  Mail,
  MessageCircle,
  MousePointerClick,
  ArrowUpRight,
  Gauge,
} from "lucide-react";
import Link from "next/link";
import TimeframeFilter from "./TimeframeFilter";
import FailedDeliveriesCard from "./FailedDeliveriesCard";
import PerformanceChart from "./PerformanceChart";

interface DashboardStat {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
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
    totalBounces,
    totalComplaints,
    totalFailed = 0,
    totalWhatsappSent = 0,
    totalWhatsappFailed = 0,
    totalWhatsappOpens = 0,
    recentCampaigns,
    recentReminders = [],
    dailyStats,
    quota,
  } = await statsRes.json();

  const quotaUsagePct = quota?.dailyLimit ? Math.min(100, (quota.used24h / quota.dailyLimit) * 100) : 0;

  const openRate = totalSent ? (totalOpens / totalSent) * 100 : 0;
  const deliveryRate = totalSent ? ((totalSent - totalBounces) / totalSent) * 100 : 100;
  const whatsappDeliveryRate = totalWhatsappSent ? ((totalWhatsappSent - totalWhatsappFailed) / totalWhatsappSent) * 100 : 100;
  const whatsappOpenRate = totalWhatsappSent ? (totalWhatsappOpens / totalWhatsappSent) * 100 : 0;

  const timeframeLabel = timeframe === "daily" ? "today" : timeframe === "monthly" ? "this month" : "this week";

  const tints: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    sky: "bg-sky-50 text-sky-600",
    teal: "bg-teal-50 text-teal-600",
    violet: "bg-violet-50 text-violet-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  const stats: DashboardStat[] = [
    {
      label: "Active subscribers",
      value: totalSubscribers.toLocaleString(),
      detail: "on your list",
      icon: Users,
      tint: "emerald",
    },
    {
      label: "Emails dispatched",
      value: totalSent.toLocaleString(),
      detail: `${deliveryRate.toFixed(1)}% delivered`,
      icon: Mail,
      tint: "sky",
    },
    {
      label: "Email open rate",
      value: `${openRate.toFixed(1)}%`,
      detail: `${totalOpens.toLocaleString()} opens`,
      icon: MousePointerClick,
      tint: "teal",
    },
    {
      label: "WhatsApp sent",
      value: totalWhatsappSent.toLocaleString(),
      detail: `${whatsappDeliveryRate.toFixed(1)}% delivered`,
      icon: MessageCircle,
      tint: "violet",
    },
    {
      label: "WhatsApp open rate",
      value: `${whatsappOpenRate.toFixed(1)}%`,
      detail: `${totalWhatsappOpens.toLocaleString()} opens`,
      icon: MousePointerClick,
      tint: "indigo",
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in text-slate-800 pb-2">

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white py-4 px-5 rounded-3xl border border-slate-200 shadow-surface">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">Overview</h2>
          <p className="text-slate-500 text-[12.5px] mt-0.5">Sending activity and engagement, {timeframeLabel}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <TimeframeFilter />
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full text-[12.5px] transition-colors shrink-0"
          >
            New campaign <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-3xl border border-slate-200 shadow-surface shadow-surface-hover p-5 flex flex-col justify-between min-h-[130px] transition-shadow"
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${tints[stat.tint]}`}>
              <stat.icon className="h-[18px] w-[18px]" />
            </div>
            <div className="mt-4">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block">{stat.label}</span>
              <span className="text-[26px] font-semibold text-slate-900 tracking-tight tabular-nums block mt-1 leading-none">
                {stat.value}
              </span>
              <span className="text-[11.5px] text-slate-400 font-medium mt-2 block">{stat.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ops row: quota + failures */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-surface p-6 flex flex-col justify-center">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Gauge className="h-[18px] w-[18px]" />
              </div>
              <div>
                <span className="text-[13px] font-semibold text-slate-800 block">Daily send quota</span>
                <span className="text-[11.5px] text-slate-400">Rolling 24h window · {quota?.maxSendRatePerSecond ?? "-"}/sec max rate</span>
              </div>
            </div>
            <span className="text-[15px] font-semibold text-slate-900 tabular-nums">
              {(quota?.used24h ?? 0).toLocaleString()}
              <span className="text-slate-400 font-medium"> / {(quota?.dailyLimit ?? 0).toLocaleString()}</span>
            </span>
          </div>

          <div className="mt-4 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                quotaUsagePct >= 90 ? "bg-rose-500" : quotaUsagePct >= 70 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.max(quotaUsagePct, 1.5)}%` }}
            />
          </div>
          <span className="text-[11.5px] text-slate-400 font-medium mt-2">
            {quotaUsagePct.toFixed(1)}% of today's quota used
          </span>
        </div>

        <FailedDeliveriesCard
          totalBounces={totalBounces}
          totalComplaints={totalComplaints}
          totalFailed={totalFailed}
        />
      </div>

      {/* Performance chart */}
      <PerformanceChart dailyStats={dailyStats} />

      {/* Recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-surface p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[14px] font-semibold text-slate-900">Recent campaigns</h2>
            <Link href="/campaigns" className="text-[12px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentCampaigns.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-[12.5px]">No recent campaigns yet.</div>
            ) : (
              recentCampaigns.slice(0, 5).map((camp: any) => {
                const isWhatsapp = camp.channel === "whatsapp";
                return (
                  <div key={camp._id || camp.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${isWhatsapp ? "bg-violet-50 text-violet-600" : "bg-sky-50 text-sky-600"}`}>
                        {isWhatsapp ? <MessageCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-slate-800 text-[13px] block truncate leading-tight">
                          {camp.name}
                        </span>
                        <span className="text-[11.5px] text-slate-400 block truncate mt-0.5">
                          {isWhatsapp ? "WhatsApp template" : camp.subject || "No subject"}
                        </span>
                      </div>
                    </div>

                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10.5px] font-medium capitalize ${
                      camp.status === "sent" ? "bg-emerald-50 text-emerald-700" :
                      camp.status === "scheduled" ? "bg-amber-50 text-amber-700" :
                      camp.status === "sending" ? "bg-sky-50 text-sky-700" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {camp.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-surface p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[14px] font-semibold text-slate-900">Recent reminders</h2>
            <Link href="/webinars" className="text-[12px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentReminders.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-[12.5px]">No recent reminders yet.</div>
            ) : (
              recentReminders.map((rem: any) => {
                const isWhatsapp = rem.channel === "whatsapp";
                const sendDate = rem.computed_send_at ? new Date(rem.computed_send_at) : null;
                const sendDateLabel =
                  sendDate && !Number.isNaN(sendDate.getTime())
                    ? sendDate.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                    : "Not scheduled";
                const title = [rem.name, rem.webinar_id?.title].filter(Boolean).join(" · ") || "Webinar reminder";
                return (
                  <div key={rem._id || rem.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${isWhatsapp ? "bg-violet-50 text-violet-600" : "bg-sky-50 text-sky-600"}`}>
                        {isWhatsapp ? <MessageCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-slate-800 text-[13px] block truncate leading-tight">
                          {title}
                        </span>
                        <span className="text-[11.5px] text-slate-400 block truncate mt-0.5">
                          {sendDateLabel}
                        </span>
                      </div>
                    </div>

                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10.5px] font-medium capitalize ${
                      rem.dispatch_status === "sent" ? "bg-emerald-50 text-emerald-700" :
                      rem.dispatch_status === "pending" ? "bg-amber-50 text-amber-700" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {rem.dispatch_status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
