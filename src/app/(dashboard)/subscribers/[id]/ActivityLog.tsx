"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Mail, MousePointerClick, Send, XCircle, AlertOctagon, UserMinus } from "lucide-react";
import { WhatsAppIcon } from "@/lib/brand-icons";

interface EventRow {
  id?: string;
  _id?: string;
  event_type: string;
  channel?: string;
  timestamp: string;
  campaign_id?: { id?: string; name: string } | null;
  reminder_id?: { id?: string; name: string } | null;
  details?: { error?: string };
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

export default function ActivityLog({ subscriberId }: { subscriberId: string }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState("");

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (type) params.set("type", type);
      const res = await fetch(`/api/subscribers/${subscriberId}/activity?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setTotalPages(data.pages || 1);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [subscriberId, page, type]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-800 text-base">Activity History</h2>
          <p className="text-slate-400 text-xs mt-0.5">{total.toLocaleString()} events recorded</p>
        </div>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white self-start"
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

      {loading ? (
        <div className="py-16 text-center">
          <div className="h-8 w-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : events.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm">No activity recorded for this subscriber yet.</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {events.map((ev) => {
            const Icon = TYPE_ICONS[ev.event_type] || Mail;
            const source = ev.campaign_id?.name || ev.reminder_id?.name;
            return (
              <li key={ev.id || ev._id} className="flex items-center gap-3 px-6 py-3.5">
                <div className={`p-2 rounded-full shrink-0 ${TYPE_COLORS[ev.event_type] || "bg-slate-100 text-slate-600"}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm capitalize">{ev.event_type}</span>
                    {ev.channel === "whatsapp" && <WhatsAppIcon className="h-3 w-3 text-emerald-500" />}
                  </div>
                  {source && <p className="text-slate-400 text-xs truncate">{source}</p>}
                  {ev.details?.error && <p className="text-rose-500 text-[11px] truncate mt-0.5">{ev.details.error}</p>}
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {new Date(ev.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </li>
            );
          })}
        </ul>
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
