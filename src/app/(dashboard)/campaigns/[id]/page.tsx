import React from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Mail,
  MousePointerClick,
  XCircle,
  AlertOctagon,
  UserMinus,
  Smartphone,
  Monitor,
  Link2,
  FlaskConical,
} from "lucide-react";
import EventsLog from "./EventsLog";

async function fetchJSON(url: string, cookieHeader: string) {
  const res = await fetch(url, {
    headers: { Cookie: cookieHeader },
    next: { revalidate: 0 },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function CampaignAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("pratipal_session")?.value;
  const cookieHeader = `pratipal_session=${sessionCookie}`;

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
  const analytics = await fetchJSON(`${backendUrl}/api/campaigns/${id}/analytics`, cookieHeader);

  if (!analytics) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
        <p className="text-slate-500 font-semibold">Campaign not found or analytics unavailable.</p>
        <Link href="/campaigns" className="text-emerald-600 hover:underline text-sm mt-2 inline-block">
          Back to Campaigns
        </Link>
      </div>
    );
  }

  const { campaign, totals, timeline, devices, browsers, topLinks, variants } = analytics;

  const sent = totals.sent || 0;
  const openRate = sent ? (totals.uniqueOpens / sent) * 100 : 0;
  const clickRate = sent ? (totals.uniqueClicks / sent) * 100 : 0;
  const bounceRate = sent ? ((totals.bounces || 0) / sent) * 100 : 0;

  const statCards = [
    { label: "Sent", value: sent, icon: Send, color: "bg-slate-100 text-slate-600" },
    { label: "Unique Opens", value: totals.uniqueOpens, sub: `${openRate.toFixed(1)}%`, icon: Mail, color: "bg-emerald-50 text-emerald-600" },
    { label: "Unique Clicks", value: totals.uniqueClicks, sub: `${clickRate.toFixed(1)}%`, icon: MousePointerClick, color: "bg-indigo-50 text-indigo-600" },
    { label: "Bounces", value: totals.bounces || 0, sub: `${bounceRate.toFixed(1)}%`, icon: XCircle, color: "bg-rose-50 text-rose-600" },
    { label: "Complaints", value: totals.complaints || 0, icon: AlertOctagon, color: "bg-amber-50 text-amber-600" },
    { label: "Unsubscribed", value: totals.unsubscribed || 0, icon: UserMinus, color: "bg-slate-100 text-slate-600" },
  ];

  const maxTimelineVal = Math.max(...timeline.map((t: any) => Math.max(t.sent, t.opens, t.clicks)), 1);

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <Link
          href="/campaigns"
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer bg-white shrink-0"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800 truncate">{campaign.name}</h1>
          <p className="text-slate-500 text-sm mt-0.5 truncate">
            {campaign.channel === "whatsapp" ? `WhatsApp: ${campaign.whatsapp_template}` : campaign.subject}
          </p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-[10px] font-bold uppercase border shrink-0 ${
          campaign.status === "sent" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
          campaign.status === "sending" ? "bg-blue-50 text-blue-600 border-blue-100" :
          "bg-slate-100 text-slate-500 border-slate-200"
        }`}>
          {campaign.status}
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-full ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{s.label}</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900">{s.value.toLocaleString()}</span>
              {s.sub && <span className="text-[10px] text-slate-400 font-semibold">{s.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* A/B Variant Comparison */}
      {campaign.ab_test?.enabled && variants && variants.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="h-4.5 w-4.5 text-indigo-500" />
            <h2 className="font-bold text-slate-800 text-base">A/B Variant Performance</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {variants.map((v: any) => (
              <div key={v.variant} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 text-sm">Variant {v.variant}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{v.sent.toLocaleString()} sent</span>
                </div>
                {v.variant === "B" && campaign.ab_test.subject_b && (
                  <p className="text-xs text-slate-500 mb-2 truncate">Subject: {campaign.ab_test.subject_b}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-emerald-50 rounded-lg p-2 text-center">
                    <div className="font-bold text-emerald-700">{(v.openRate * 100).toFixed(1)}%</div>
                    <div className="text-[10px] text-slate-500">Open rate</div>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-2 text-center">
                    <div className="font-bold text-indigo-700">{(v.clickRate * 100).toFixed(1)}%</div>
                    <div className="text-[10px] text-slate-500">Click rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-bold text-slate-800 text-base mb-4">Delivery Timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-slate-400 text-sm">No timeline data yet.</p>
        ) : (
          <div className="flex items-end gap-1.5 h-32 overflow-x-auto pb-1">
            {timeline.map((t: any) => (
              <div key={t.label} className="flex items-end gap-0.5 shrink-0 h-full" title={`${t.label} — Sent: ${t.sent}, Opens: ${t.opens}, Clicks: ${t.clicks}`}>
                <div
                  className="w-2 bg-slate-200 hover:bg-slate-300 rounded-sm transition-colors"
                  style={{ height: `${Math.max(2, (t.sent / maxTimelineVal) * 100)}%` }}
                />
                <div
                  className="w-2 bg-emerald-400 hover:bg-emerald-500 rounded-sm transition-colors"
                  style={{ height: `${Math.max(2, (t.opens / maxTimelineVal) * 100)}%` }}
                />
                <div
                  className="w-2 bg-indigo-400 hover:bg-indigo-500 rounded-sm transition-colors"
                  style={{ height: `${Math.max(2, (t.clicks / maxTimelineVal) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-4 mt-3 text-[10px] font-bold text-slate-500">
          <div className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-sm bg-slate-200 block" /> Sent</div>
          <div className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-sm bg-emerald-400 block" /> Opens</div>
          <div className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-sm bg-indigo-400 block" /> Clicks</div>
        </div>
      </div>

      {/* Device / Browser / Top Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="h-4.5 w-4.5 text-slate-500" />
            <h2 className="font-bold text-slate-800 text-sm">Device Breakdown</h2>
          </div>
          {devices.length === 0 ? (
            <p className="text-slate-400 text-xs">No open events with device data yet.</p>
          ) : (
            <ul className="space-y-2">
              {devices.map((d: any) => (
                <li key={d.device} className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 capitalize">{d.device || "Unknown"}</span>
                  <span className="font-bold text-slate-800">{d.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="h-4.5 w-4.5 text-slate-500" />
            <h2 className="font-bold text-slate-800 text-sm">Browser Breakdown</h2>
          </div>
          {browsers.length === 0 ? (
            <p className="text-slate-400 text-xs">No open events with browser data yet.</p>
          ) : (
            <ul className="space-y-2">
              {browsers.map((b: any) => (
                <li key={b.browser} className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">{b.browser || "Unknown"}</span>
                  <span className="font-bold text-slate-800">{b.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="h-4.5 w-4.5 text-slate-500" />
            <h2 className="font-bold text-slate-800 text-sm">Top Clicked Links</h2>
          </div>
          {topLinks.length === 0 ? (
            <p className="text-slate-400 text-xs">No link clicks recorded yet.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {topLinks.map((l: any) => (
                <li key={l.url} className="text-xs">
                  <div className="text-slate-600 truncate" title={l.url}>{l.url}</div>
                  <div className="text-[10px] text-slate-400">{l.clicks} clicks &middot; {l.uniqueClickers} unique</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recipient Event Log */}
      <EventsLog campaignId={id} />
    </div>
  );
}
