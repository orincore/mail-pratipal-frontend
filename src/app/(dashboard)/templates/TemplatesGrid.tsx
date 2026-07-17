"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { FileCode, Pencil, Trash2, Copy, Plus, Search, Code2, Type } from "lucide-react";
import { useRole } from "../RoleProvider";

interface Template {
  id?: string;
  _id?: string;
  name: string;
  subject?: string;
  type?: string;
  updated_at?: string;
}

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tint: string }> = {
  builder: { label: "Visual", icon: FileCode, tint: "bg-emerald-50 text-emerald-600" },
  html: { label: "HTML", icon: Code2, tint: "bg-sky-50 text-sky-600" },
  text: { label: "Plain text", icon: Type, tint: "bg-slate-100 text-slate-500" },
};

export default function TemplatesGrid({ initialTemplates }: { initialTemplates: Template[] }) {
  const { canWrite } = useRole();
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const idOf = (t: Template) => (t.id || t._id) as string;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) => t.name?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q)
    );
  }, [templates, query]);

  const handleDelete = async (tpl: Template) => {
    const id = idOf(tpl);
    if (!confirm(`Delete "${tpl.name}"? This cannot be undone.`)) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/templates?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete template");
        return;
      }
      setTemplates((prev) => prev.filter((t) => idOf(t) !== id));
    } catch {
      setError("Network error while deleting template");
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (tpl: Template) => {
    const id = idOf(tpl);
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(id)}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to duplicate template");
        return;
      }
      setTemplates((prev) => [data.template, ...prev]);
    } catch {
      setError("Network error while duplicating template");
    } finally {
      setBusyId(null);
    }
  };

  if (templates.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-16 flex flex-col items-center justify-center text-center gap-3">
        <div className="p-4 bg-slate-50 rounded-2xl text-slate-300">
          <FileCode className="h-8 w-8" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-[14px]">No templates yet</h3>
          <p className="text-slate-400 text-[13px] mt-1 max-w-xs">
            Design your first reusable email template to start sending campaigns and reminders.
          </p>
        </div>
        {canWrite && (
          <Link
            href="/templates/builder"
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full text-[13px] transition-colors"
          >
            <Plus className="h-4 w-4" /> Design template
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-surface overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            className="pl-9 pr-3 py-2 w-full border border-slate-200 rounded-full text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-400 bg-white text-slate-800"
          />
        </div>
        <span className="text-[12px] text-slate-400 shrink-0">
          {filtered.length} of {templates.length}
        </span>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-[13px] rounded-xl">{error}</div>
      )}

      {filtered.length === 0 ? (
        <div className="py-14 text-center text-slate-400 text-[13px]">No templates match "{query}".</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filtered.map((tpl) => {
            const id = idOf(tpl);
            const busy = busyId === id;
            const meta = TYPE_META[tpl.type || "builder"] || TYPE_META.builder;
            return (
              <li key={id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors group">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${meta.tint}`}>
                  <meta.icon className="h-[18px] w-[18px]" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 text-[13.5px] truncate">{tpl.name}</span>
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[12px] truncate mt-0.5">
                    {tpl.subject || "No default subject"}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/templates/builder?id=${id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                  {canWrite && (
                    <button
                      onClick={() => handleDuplicate(tpl)}
                      disabled={busy}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                      title="Duplicate template"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canWrite && (
                    <button
                      onClick={() => handleDelete(tpl)}
                      disabled={busy}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                      title="Delete template"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
