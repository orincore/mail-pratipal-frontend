"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldOff,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  XCircle,
  MailWarning,
  UserMinus,
} from "lucide-react";
import { useRole } from "../RoleProvider";

interface Suppression {
  id?: string;
  _id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  status: string;
  updated_at: string;
  last_event?: {
    event_type: string;
    timestamp: string;
    details?: { error?: string; bounceType?: string; bounceSubType?: string };
  } | null;
}

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "unsubscribed", label: "Unsubscribed" },
  { value: "bounced", label: "Bounced" },
  { value: "complained", label: "Complained" },
];

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  unsubscribed: UserMinus,
  bounced: XCircle,
  complained: MailWarning,
};

export default function SuppressionsPage() {
  const { canWrite } = useRole();
  const [items, setItems] = useState<Suppression[]>([]);
  const [counts, setCounts] = useState<{ bounced: number; complained: number; unsubscribed: number }>({ bounced: 0, complained: 0, unsubscribed: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchSuppressions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (status) params.set("status", status);
      const res = await fetch(`/api/subscribers/suppressions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.subscribers || []);
        setCounts(data.counts || { bounced: 0, complained: 0, unsubscribed: 0 });
        setTotalPages(data.pages || 1);
        setTotal(data.total || 0);
      }
    } catch {
      showNotification("Failed to load suppressions", "error");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    fetchSuppressions();
  }, [fetchSuppressions]);

  const handleReactivate = async (item: Suppression) => {
    const id = item.id || item._id!;
    setBusyId(id);
    try {
      const res = await fetch("/api/subscribers/suppressions/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`${item.email} reactivated`);
        setItems((prev) => prev.filter((i) => (i.id || i._id) !== id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        showNotification(data.error || "Failed to reactivate", "error");
      }
    } catch {
      showNotification("Network error", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {notification && (
        <div className={`fixed bottom-4 right-4 z-[9999] p-4 rounded-xl shadow-lg border text-sm flex items-center gap-2 animate-bounce ${
          notification.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          {notification.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span>{notification.text}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Suppression List</h1>
        <p className="text-slate-500 text-sm mt-1">
          Recipients excluded from future sends — unsubscribed, bounced, or complained.
        </p>
      </div>

      {/* Status count cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(["unsubscribed", "bounced", "complained"] as const).map((s) => {
          const Icon = STATUS_ICON[s];
          return (
            <div key={s} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-full">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{s}</span>
                <span className="text-xl font-black text-slate-900">{counts[s].toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                status === tab.value
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="h-8 w-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center gap-3">
            <div className="p-4 bg-slate-50 rounded-full text-slate-300">
              <ShieldOff className="h-10 w-10" />
            </div>
            <p className="text-slate-400 text-sm">No suppressed contacts in this category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-6">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Since</th>
                  {canWrite && <th className="py-3 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {items.map((item) => {
                  const id = item.id || item._id!;
                  let reason = "—";
                  if (item.last_event) {
                    if (item.last_event.event_type === "complaint") reason = "Reported as spam";
                    else if (item.last_event.details?.bounceType) reason = `${item.last_event.details.bounceType} bounce`;
                    else if (item.last_event.details?.error) reason = item.last_event.details.error;
                    else if (item.last_event.event_type === "unsubscribe") reason = "Manually unsubscribed";
                  }
                  return (
                    <tr key={id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800">
                          {item.first_name ? `${item.first_name} ${item.last_name || ""}` : "—"}
                        </div>
                        <div className="text-slate-400 text-xs mt-0.5">{item.email}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-100">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-500 max-w-xs truncate">{reason}</td>
                      <td className="py-4 px-4 text-xs text-slate-400 font-mono">
                        {new Date(item.updated_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </td>
                      {canWrite && (
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleReactivate(item)}
                            disabled={busyId === id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Reactivate
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-[10px] text-slate-400 font-semibold">
              Page {page} of {totalPages} &middot; {total.toLocaleString()} total
            </span>
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
    </div>
  );
}
