import React from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, Calendar, Tag as TagIcon, FolderPlus } from "lucide-react";
import ActivityLog from "./ActivityLog";

async function fetchJSON(url: string, cookieHeader: string) {
  const res = await fetch(url, {
    headers: { Cookie: cookieHeader },
    next: { revalidate: 0 },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function SubscriberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("pratipal_session")?.value;
  const cookieHeader = `pratipal_session=${sessionCookie}`;

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
  const data = await fetchJSON(`${backendUrl}/api/subscribers/${id}`, cookieHeader);

  if (!data?.subscriber) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
        <p className="text-slate-500 font-semibold">Subscriber not found.</p>
        <Link href="/subscribers" className="text-emerald-600 hover:underline text-sm mt-2 inline-block">
          Back to Subscribers
        </Link>
      </div>
    );
  }

  const sub = data.subscriber;
  const fullName = sub.first_name ? `${sub.first_name} ${sub.last_name || ""}`.trim() : "Unnamed Subscriber";

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <Link
          href="/subscribers"
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer bg-white shrink-0"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800 truncate">{fullName}</h1>
          <p className="text-slate-500 text-sm mt-0.5 truncate">{sub.email || sub.whatsapp_number}</p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-[10px] font-bold uppercase border shrink-0 ${
          sub.status === "subscribed" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
          sub.status === "unsubscribed" ? "bg-amber-50 text-amber-600 border-amber-100" :
          "bg-rose-50 text-rose-600 border-rose-100"
        }`}>
          {sub.status}
        </span>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Email
          </span>
          <p className="text-sm font-semibold text-slate-800 mt-1">{sub.email || "—"}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </span>
          <p className="text-sm font-semibold text-slate-800 mt-1">{sub.whatsapp_number || "—"}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Joined
          </span>
          <p className="text-sm font-semibold text-slate-800 mt-1">
            {new Date(sub.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FolderPlus className="h-3.5 w-3.5" /> Lists
          </span>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(sub.lists || []).length === 0 ? (
              <span className="text-slate-400 text-xs">—</span>
            ) : (
              sub.lists.map((l: string) => (
                <span key={l} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">{l}</span>
              ))
            )}
          </div>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <TagIcon className="h-3.5 w-3.5" /> Tags
          </span>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(sub.tags || []).length === 0 ? (
              <span className="text-slate-400 text-xs">—</span>
            ) : (
              sub.tags.map((t: string) => (
                <span key={t} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold">{t}</span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <ActivityLog subscriberId={id} />
    </div>
  );
}
