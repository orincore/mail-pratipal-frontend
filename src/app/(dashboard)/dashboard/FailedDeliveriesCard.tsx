"use client";

import React, { useState } from "react";
import { AlertOctagon, X, Clock, AlertTriangle } from "lucide-react";

interface FailedDeliveriesCardProps {
  totalBounces: number;
  totalComplaints: number;
  sessionCookie?: string;
}

export default function FailedDeliveriesCard({
  totalBounces,
  totalComplaints,
  sessionCookie
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

  const totalFailed = totalBounces + totalComplaints;

  return (
    <>
      {/* Clickable Card wrapper */}
      <button
        onClick={handleOpen}
        className="w-full text-left bg-white rounded-[28px] border border-[#e8ece6] p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all min-h-[160px] cursor-pointer group focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shrink-0"
      >
        <div className="flex items-center justify-between w-full">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <AlertOctagon className="h-5.5 w-5.5" />
          </div>
          <div className="text-slate-400 hover:text-slate-650 p-1">
            <span className="text-[10px] font-bold bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded-full transition-all border border-slate-100">LOGS</span>
          </div>
        </div>

        <div className="mt-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Failed Deliveries</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{totalFailed}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              totalFailed > 0 ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
            }`}>
              {totalFailed > 0 ? "Needs Review" : "0% Failures"}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">Click to view bounce details</span>
          </div>
        </div>
      </button>

      {/* Undelivered Mails Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center animate-fade-in text-slate-800 p-4">
          <div className="bg-white rounded-[28px] max-w-2xl w-full border border-slate-200/50 shadow-2xl flex flex-col max-h-[85vh] relative animate-scale-up overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center">
                  <AlertOctagon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Undelivered Mails</h3>
                  <p className="text-slate-400 text-xs mt-0.5 font-medium">Logs of permanent bounces, complaints, and delivery rejections.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-50 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-650"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Clock className="h-8 w-8 text-slate-400 animate-spin" />
                  <span className="text-slate-500 text-sm font-semibold">Loading failure logs...</span>
                </div>
              ) : events.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
                  <AlertTriangle className="h-10 w-10 text-slate-300" />
                  <span className="text-slate-650 font-bold text-sm">No undelivered emails found</span>
                  <span className="text-slate-450 text-xs max-w-sm">All sent dispatches are running cleanly with no recorded bounces or complaints!</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200/50 rounded-2xl overflow-hidden bg-slate-50/50">
                  {events.map((ev, idx) => {
                    const campName = ev.campaign_id?.name || "System Dispatch / Automation";
                    const isComplaint = ev.event_type === "complaint";
                    
                    // Decode failure reason
                    let reason = "Delivery attempt rejected by server.";
                    if (isComplaint) {
                      reason = "Recipient reported email as SPAM/Junk.";
                    } else if (ev.details?.error) {
                      reason = ev.details.error;
                    } else if (ev.details?.bounceType) {
                      reason = `${ev.details.bounceType} Bounce (${ev.details.bounceSubType || "General"})`;
                    }

                    return (
                      <div key={ev.id || idx} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{ev.recipient_email}</span>
                            <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                              isComplaint ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                            }`}>
                              {ev.event_type}
                            </span>
                          </div>
                          <div className="text-slate-500">
                            Campaign: <span className="font-semibold text-slate-700">{campName}</span>
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            Logged on: {new Date(ev.timestamp).toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="sm:text-right max-w-xs w-full sm:w-auto">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Reason</span>
                          <span className="text-slate-600 font-medium leading-relaxed block bg-white px-3 py-1.5 rounded-xl border border-slate-200/50 shadow-sm text-left">{reason}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 border border-slate-200 hover:bg-slate-100 font-bold rounded-full text-xs transition-all cursor-pointer text-slate-700 bg-white"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
