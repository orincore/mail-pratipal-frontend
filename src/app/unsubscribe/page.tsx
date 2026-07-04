"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const campaignId = searchParams.get("campaignId") || "";

  const [status, setStatus] = useState<"loading" | "unsubscribed" | "resubscribed" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const handleUnsubscribe = async (isResubscribe = false) => {
    setStatus("loading");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          campaignId,
          resubscribe: isResubscribe,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus(isResubscribe ? "resubscribed" : "unsubscribed");
      } else {
        setStatus("error");
        setErrorMessage(data.error || "An error occurred");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  };

  useEffect(() => {
    if (email) {
      handleUnsubscribe(false);
    } else {
      setStatus("error");
      setErrorMessage("No email address provided in link.");
    }
  }, [email]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-center text-white relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
          <div className="inline-flex p-3 bg-white/10 backdrop-blur-md rounded-full mb-4 ring-4 ring-white/5 animate-pulse">
            <Mail className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Email Preferences</h1>
          <p className="text-emerald-100 text-sm mt-1">Pratipal Healing & Wellness</p>
        </div>

        <div className="p-8">
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="h-10 w-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mb-4" />
              <p className="text-slate-600 font-medium animate-pulse">Processing request...</p>
            </div>
          )}

          {status === "unsubscribed" && (
            <div className="text-center space-y-5 py-2">
              <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-full">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">You're unsubscribed</h2>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                  We've successfully removed <span className="font-semibold text-slate-700">{email}</span> from our campaign list. You will no longer receive marketing emails.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-3">Made a mistake?</p>
                <button
                  onClick={() => handleUnsubscribe(true)}
                  className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-emerald-600 text-emerald-600 font-semibold rounded-xl text-sm hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                >
                  Resubscribe {email && `(${email})`}
                </button>
              </div>
            </div>
          )}

          {status === "resubscribed" && (
            <div className="text-center space-y-5 py-2">
              <div className="inline-flex p-3 bg-teal-50 text-teal-600 rounded-full">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">You're back!</h2>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                  We've resubscribed <span className="font-semibold text-slate-700">{email}</span> to our newsletters. Welcome back to the community!
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={() => handleUnsubscribe(false)}
                  className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-slate-800 text-white font-semibold rounded-xl text-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/20 transition-all cursor-pointer"
                >
                  Unsubscribe Again
                </button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-5 py-2">
              <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-full">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Unable to process</h2>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                  {errorMessage || "We encountered an error processing your request."}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                <a
                  href="https://pratipal.in"
                  className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200 transition-all"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Pratipal
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="h-10 w-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
