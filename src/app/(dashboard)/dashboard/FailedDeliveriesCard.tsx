"use client";

import React, { useState } from "react";
import { AlertOctagon, X, Loader2, CheckCircle2, ArrowUpRight } from "lucide-react";

interface FailedDeliveriesCardProps {
  totalBounces: number;
  totalComplaints: number;
  totalFailed?: number;
}

export default function FailedDeliveriesCard({
  totalBounces,
  totalComplaints,
  totalFailed: totalFailedSends = 0,
}: FailedDeliveriesCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setShowModal(true);
    setLoading(true);
    try {
      const res = await fetch("/api/failed-events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data || []);
      } else {
        console.error("Failed to load failed events, status:", res.status);
      }
    } catch (e) {
      console.error("Failed to load undelivered events", e);
    } finally {
      setLoading(false);
    }
  };

  const totalFailed = totalBounces + totalComplaints + totalFailedSends;
  const isHealthy = totalFailed === 0;

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full text-left bg-white rounded-3xl border border-slate-200 shadow-surface shadow-surface-hover p-5 flex flex-col justify-between transition-shadow min-h-[168px] cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
      >
        <div className="flex items-start justify-between w-full">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isHealthy ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            {isHealthy ? <CheckCircle2 className="h-5 w-5" /> : <AlertOctagon className="h-5 w-5" />}
          </div>
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">
            View log <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>

        <div className="mt-4">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block">Failed deliveries</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[28px] font-semibold text-slate-900 tracking-tight tabular-nums leading-none">{totalFailed.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
              isHealthy ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}>
              {isHealthy ? "All clear" : "Needs review"}
            </span>
          </div>
        </div>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center animate-fade-in text-slate-800 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] relative animate-scale-up overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertOctagon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900">Undelivered mail</h3>
                  <p className="text-slate-500 text-[12.5px] mt-0.5">Bounces, complaints, and send failures.</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-50 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {loading ? (
                <div className="py-14 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                  <span className="text-slate-500 text-[13px] font-medium">Loading failure logs…</span>
                </div>
              ) : events.length === 0 ? (
                <div className="py-14 flex flex-col items-center justify-center gap-2 text-center">
                  <CheckCircle2 className="h-9 w-9 text-emerald-500" />
                  <span className="text-slate-800 font-semibold text-[14px]">No undelivered mail found</span>
                  <span className="text-slate-400 text-[12.5px] max-w-sm">Every recent dispatch went through cleanly.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {events.map((ev, idx) => {
                    const campName = ev.campaign_id?.name || ev.reminder_id?.name || "Test / manual send";
                    const isComplaint = ev.event_type === "complaint";
                    const isFailed = ev.event_type === "failed";

                    let reason = "Delivery attempt rejected by server.";
                    if (isComplaint) {
                      reason = "Recipient reported this email as spam.";
                    } else if (ev.details?.error) {
                      reason = ev.details.error;
                    } else if (ev.details?.bounceType) {
                      reason = `${ev.details.bounceType} bounce (${ev.details.bounceSubType || "general"})`;
                    } else if (isFailed) {
                      reason = "Send attempt failed — infra/provider error, not a recipient bounce.";
                    }

                    return (
                      <div key={ev.id || idx} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-[12.5px] hover:bg-slate-50/60 transition-colors">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800 truncate">{ev.recipient_email}</span>
                            <span className={`px-1.5 py-0.5 rounded-md font-medium uppercase text-[9.5px] ${
                              isComplaint ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                            }`}>
                              {ev.event_type}
                            </span>
                          </div>
                          <div className="text-slate-500">
                            {campName} <span className="text-slate-300">·</span>{" "}
                            {new Date(ev.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                          </div>
                        </div>
                        <div className="sm:text-right max-w-xs w-full sm:w-auto shrink-0">
                          <span className="text-slate-600 leading-relaxed block bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-left">{reason}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 border border-slate-200 hover:bg-white font-medium rounded-full text-[13px] transition-all cursor-pointer text-slate-700 bg-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
