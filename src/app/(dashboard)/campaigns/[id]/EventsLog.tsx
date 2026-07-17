"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Mail, MousePointerClick, Send, XCircle, AlertOctagon, UserMinus } from "lucide-react";

interface EventRow {
  id?: string;
  _id?: string;
  recipient_email: string;
  event_type: string;
  timestamp: string;
  details?: { variant?: string; error?: string };
  device_type?: string;
  browser?: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sent: Send,
  open: Mail,
  click: MousePointerClick,
  bounce: XCircle,
  complaint: AlertOctagon,
  failed: XCircle,
  unsubscribe: UserMinus,
};

const TYPE_COLORS: Record<string, string> = {
  sent: "bg-slate-100 text-slate-600 border-slate-200",
  open: "bg-emerald-50 text-emerald-700 border-emerald-100",
  click: "bg-indigo-50 text-indigo-700 border-indigo-100",
  bounce: "bg-rose-50 text-rose-700 border-rose-100",
  complaint: "bg-amber-50 text-amber-700 border-amber-100",
  failed: "bg-rose-50 text-rose-700 border-rose-100",
  unsubscribe: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function EventsLog({ campaignId }: { campaignId: string }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (type) params.set("type", type);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/campaigns/${campaignId}/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setTotalPages(data.pages || 1);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, type, search]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-800 text-base">Recipient Event Log</h2>
          <p className="text-slate-400 text-xs mt-0.5">{total.toLocaleString()} events recorded</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search recipient email"
              className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs w-56 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-slate-900"
            />
          </div>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
            style={{ color: "#0f172a" }}
          >
            <option value="">All event types</option>
            <option value="sent">Sent</option>
            <option value="open">Opened</option>
            <option value="click">Clicked</option>
            <option value="bounce">Bounced</option>
            <option value="complaint">Complaint</option>
            <option value="failed">Failed</option>
            <option value="unsubscribe">Unsubscribed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="h-8 w-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : events.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm">No events match this filter.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-6">Recipient</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Variant</th>
                <th className="py-3 px-4">Device / Browser</th>
                <th className="py-3 px-6 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {events.map((ev) => {
                const Icon = TYPE_ICONS[ev.event_type] || Mail;
                return (
                  <tr key={ev.id || ev._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-6 font-medium text-slate-800">{ev.recipient_email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${TYPE_COLORS[ev.event_type] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        <Icon className="h-3 w-3" /> {ev.event_type}
                      </span>
                      {ev.details?.error && <div className="text-[10px] text-rose-500 mt-1 max-w-xs truncate">{ev.details.error}</div>}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">{ev.details?.variant || "-"}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {ev.device_type || ev.browser ? `${ev.device_type || "-"} / ${ev.browser || "-"}` : "-"}
                    </td>
                    <td className="py-3 px-6 text-right text-xs text-slate-400 font-mono">
                      {new Date(ev.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <span className="text-[10px] text-slate-400 font-semibold">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 border border-slate-200 hover:bg-white bg-white rounded-lg text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 border border-slate-200 hover:bg-white bg-white rounded-lg text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
