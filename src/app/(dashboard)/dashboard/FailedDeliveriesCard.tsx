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
        className="w-full text-left bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:border-rose-100 transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20"
      >
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Failed Deliveries</span>
          <span className="text-2xl font-bold text-slate-800 block tracking-tight">{totalFailed}</span>
          <span className="text-xs text-rose-500 font-medium block hover:underline">Click to view undelivered details</span>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-sm shadow-rose-500/5 group-hover:scale-105 transition-transform duration-300">
          <AlertOctagon className="h-6 w-6" />
        </div>
      </button>

      {/* Undelivered Mails Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in text-slate-800 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-100 shadow-2xl flex flex-col max-h-[85vh] relative animate-scale-up">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <AlertOctagon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Undelivered Mails</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Logs of permanent bounces, complaints, and delivery rejections.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
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
                  <span className="text-slate-600 font-bold text-sm">No undelivered emails found</span>
                  <span className="text-slate-400 text-xs max-w-sm">All sent dispatches are running cleanly with no recorded bounces or complaints!</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
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
                      <div key={ev.id || idx} className="p-4 flex flex-col sm:flex-row justify-between gap-3 text-xs">
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
                        <div className="sm:text-right max-w-xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Reason</span>
                          <span className="text-slate-600 font-medium leading-relaxed block bg-white px-2 py-1.5 rounded-lg border border-slate-100 shadow-sm">{reason}</span>
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
                className="px-5 py-2 border border-slate-200 hover:bg-slate-100 font-semibold rounded-xl text-xs transition-all cursor-pointer text-slate-700 bg-white"
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
