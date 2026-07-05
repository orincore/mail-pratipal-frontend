import React from "react";
import { cookies } from "next/headers";
import { Plus, FileCode, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

export default async function TemplatesPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("pratipal_session")?.value;

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
  const res = await fetch(`${backendUrl}/api/templates`, {
    headers: {
      Cookie: `pratipal_session=${sessionCookie}`,
    },
    next: { revalidate: 0 }
  });

  if (!res.ok) {
    throw new Error("Failed to load templates from backend");
  }

  const templates: any[] = await res.json();

  return (
    <div className="space-y-6 text-left">
      {/* Title Panel Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Email Templates</h1>
          <p className="text-slate-500 text-sm mt-1">Design, customize and save reusable templates.</p>
        </div>
        <div>
          <Link
            href="/templates/builder"
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" /> Design Template
          </Link>
        </div>
      </div>

      {/* Grid of Stored Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((tpl) => (
          <div
            key={tpl.id || tpl._id}
            className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
          >
            {/* Header / Thumbnail Placeholders */}
            <div className="p-6 pb-4 bg-slate-55/40 border-b border-slate-100 flex items-center justify-center relative min-h-[140px]">
              <div className="text-slate-300 group-hover:text-emerald-500/20 group-hover:scale-110 transition-all duration-300">
                <FileCode className="h-16 w-16" />
              </div>
              <span className="absolute top-3.5 right-3.5 px-2 py-0.5 bg-slate-200/80 text-slate-600 text-[9px] font-bold uppercase rounded">
                {tpl.type}
              </span>
            </div>

            {/* Template Info Body */}
            <div className="p-6 flex-1 flex flex-col justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base group-hover:text-emerald-600 transition-colors">
                  {tpl.name}
                </h3>
                <p className="text-slate-400 text-xs mt-1 truncate" title={tpl.subject}>
                  Subject: {tpl.subject || "No default subject"}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 border-t border-slate-50 pt-4 mt-auto">
                <Link
                  href={`/templates/builder?id=${tpl.id || tpl._id}`}
                  className="flex-1 inline-flex justify-center items-center gap-1 py-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 font-semibold rounded-xl text-xs text-slate-700 transition-all cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit Template
                </Link>
                <button
                  // Delete function will be connected dynamically in the builder/CRUD actions
                  className="p-2 border border-slate-100 hover:border-rose-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                  title="Delete Template"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
