"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Video,
  Users,
  Bell,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useRole } from "../RoleProvider";

interface WebinarReminderSummary {
  id: string;
  dispatch_status: "pending" | "sending" | "sent" | "skipped";
  whatsapp_dispatch_status?: "pending" | "sending" | "sent" | "skipped";
}

interface WebinarListItem {
  id: string;
  title: string;
  slug: string;
  starts_at: string;
  timezone: string;
  status: "upcoming" | "completed" | "cancelled";
  registrant_count: number;
  reminders: WebinarReminderSummary[];
}

function formatInZone(iso: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export default function WebinarsListPage() {
  const { canWrite } = useRole();
  const [webinars, setWebinars] = useState<WebinarListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  async function loadWebinars() {
    try {
      const res = await fetch("/api/webinars");
      if (!res.ok) throw new Error("Failed to load webinars");
      const data = await res.json();
      setWebinars(data.webinars ?? []);
    } catch (err: any) {
      showNotification(err.message || "Failed to load webinars", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWebinars();
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/webinars/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Sync failed");
      }
      if (!data.synced) {
        showNotification(
          "Synced, but no webinars found — flag a landing page as a webinar (with a start date) on the website first."
        );
      } else {
        showNotification(`Synced ${data.synced} webinar${data.synced === 1 ? "" : "s"} from the website`);
      }
      await loadWebinars();
    } catch (err: any) {
      showNotification(err.message || "Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6 text-left">
      {notification && (
        <div
          className={`fixed bottom-4 right-4 z-[9999] p-4 rounded-xl shadow-lg border text-sm flex items-center gap-2 ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {notification.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span>{notification.text}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Synced from registration windows on the main website — set up automated email reminders.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-6 w-6 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : webinars.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 shadow-sm text-center flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
            <Video className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No reminders yet</h3>
          <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
            Sync landing page registration windows to set up automated email reminders.
          </p>
          {canWrite && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" /> Sync Now
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {webinars.map((w) => {
            const sentCount = w.reminders.filter(
              (r) => r.dispatch_status === "sent" || r.whatsapp_dispatch_status === "sent"
            ).length;
            return (
              <Link
                key={w.id}
                href={`/webinars/${w.id}`}
                className="bg-white rounded-2xl border border-gray-200 hover:border-emerald-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group"
              >
                <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />
                <div className="p-5 space-y-4 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate text-[15px] leading-tight">{w.title}</h3>
                      <p className="text-xs text-gray-400 font-mono mt-1 truncate">/{w.slug}</p>
                    </div>
                    <span
                      className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        w.status === "upcoming"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : w.status === "cancelled"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600">{formatInZone(w.starts_at, w.timezone)}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {w.registrant_count} registered
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Bell className="h-3.5 w-3.5" /> {sentCount}/{w.reminders.length} sent
                    </span>
                  </div>
                </div>
                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                  Manage reminders <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
