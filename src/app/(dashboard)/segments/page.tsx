"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Filter,
  Trash2,
  Pencil,
  X,
  Users,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Clock,
  Tags,
  ShieldCheck,
} from "lucide-react";
import { useRole } from "../RoleProvider";

interface SegmentRule {
  field: string;
  operator: "is" | "is_not";
  value: string;
}

interface Segment {
  id: string;
  name: string;
  description?: string;
  match: "all" | "any";
  rules: SegmentRule[];
  subscriber_count?: number;
}

const FIELD_OPTIONS: { value: string; label: string; kind: "select" | "text" | "days" }[] = [
  { value: "status", label: "Subscription Status", kind: "select" },
  { value: "list", label: "List Membership", kind: "text" },
  { value: "tag", label: "Tag", kind: "text" },
  { value: "opened_last_days", label: "Opened an email in the last N days", kind: "days" },
  { value: "clicked_last_days", label: "Clicked a link in the last N days", kind: "days" },
  { value: "not_opened_last_days", label: "Has NOT opened in the last N days", kind: "days" },
  { value: "created_last_days", label: "Joined in the last N days", kind: "days" },
];

const STATUS_VALUES = ["subscribed", "unsubscribed", "bounced", "complained", "pending"];

const emptyRule = (): SegmentRule => ({ field: "status", operator: "is", value: "subscribed" });

export default function SegmentsPage() {
  const { canWrite } = useRole();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showBuilder, setShowBuilder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [match, setMatch] = useState<"all" | "any">("all");
  const [rules, setRules] = useState<SegmentRule[]>([emptyRule()]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [preview, setPreview] = useState<{ count: number; sample: any[] } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/segments");
      if (res.ok) {
        setSegments(await res.json());
      }
    } catch {
      showNotification("Failed to load segments", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, []);

  const runPreview = useCallback(async () => {
    setPreviewing(true);
    try {
      const res = await fetch("/api/segments/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match, rules }),
      });
      const data = await res.json();
      if (res.ok) {
        setPreview(data);
      } else {
        setPreview(null);
      }
    } catch {
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  }, [match, rules]);

  useEffect(() => {
    if (!showBuilder) return;
    const validRules = rules.filter((r) => r.value && String(r.value).trim());
    if (validRules.length === 0) {
      setPreview(null);
      return;
    }
    const t = setTimeout(runPreview, 400);
    return () => clearTimeout(t);
  }, [showBuilder, rules, match, runPreview]);

  const openNewBuilder = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setMatch("all");
    setRules([emptyRule()]);
    setPreview(null);
    setFormError("");
    setShowBuilder(true);
  };

  const openEditBuilder = (seg: Segment) => {
    setEditingId(seg.id);
    setName(seg.name);
    setDescription(seg.description || "");
    setMatch(seg.match);
    setRules(seg.rules.length > 0 ? seg.rules.map((r) => ({ ...r })) : [emptyRule()]);
    setPreview(null);
    setFormError("");
    setShowBuilder(true);
  };

  const updateRule = (idx: number, patch: Partial<SegmentRule>) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRule = () => setRules((prev) => [...prev, emptyRule()]);
  const removeRule = (idx: number) => setRules((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError("Segment name is required");
      return;
    }
    const cleanRules = rules.filter((r) => r.value && String(r.value).trim());
    if (cleanRules.length === 0) {
      setFormError("Add at least one rule with a value");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/segments", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          name: name.trim(),
          description,
          match,
          rules: cleanRules,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(editingId ? "Segment updated" : "Segment created");
        setShowBuilder(false);
        fetchSegments();
      } else {
        setFormError(data.error || "Failed to save segment");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (seg: Segment) => {
    if (!confirm(`Delete segment "${seg.name}"?`)) return;
    try {
      const res = await fetch(`/api/segments?id=${encodeURIComponent(seg.id)}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showNotification("Segment deleted");
        fetchSegments();
      } else {
        showNotification(data.error || "Failed to delete segment", "error");
      }
    } catch {
      showNotification("Network error", "error");
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white py-4 px-5 rounded-3xl border border-slate-200 shadow-surface gap-4">
        <div>
          <h1 className="text-[15px] font-semibold text-slate-900">Smart segments</h1>
          <p className="text-slate-500 text-[12.5px] mt-0.5">Dynamic audience rules you can reuse across campaigns.</p>
        </div>
        {canWrite && (
          <button
            onClick={openNewBuilder}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full text-[12.5px] transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" /> New segment
          </button>
        )}
      </div>

      {/* What is a segment? */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-surface p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-slate-900">What is a segment, and why use one?</h2>
            <p className="text-slate-500 text-[13px] mt-1 leading-relaxed max-w-2xl">
              A segment is a saved rule — or combination of rules — that matches a live slice of your subscriber
              list. Instead of manually tagging people or picking a static list, you describe the audience once
              (e.g. "subscribed AND opened in the last 30 days") and it stays current automatically as people's
              behavior changes. Pick a segment as the audience when launching a campaign, in place of a fixed list or tag.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-slate-50">
            <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[12.5px] font-medium text-slate-700 block">Re-engagement</span>
              <span className="text-[11.5px] text-slate-400 block mt-0.5">Target subscribers who haven't opened an email in 30+ days.</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-slate-50">
            <Tags className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[12.5px] font-medium text-slate-700 block">Precise targeting</span>
              <span className="text-[11.5px] text-slate-400 block mt-0.5">Combine a list or tag with an engagement rule, e.g. "Webinar Attendees" who clicked recently.</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-slate-50">
            <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[12.5px] font-medium text-slate-700 block">Always current</span>
              <span className="text-[11.5px] text-slate-400 block mt-0.5">Only currently-subscribed contacts ever match — no manual list cleanup needed.</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="h-8 w-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : segments.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-16 flex flex-col items-center justify-center text-center gap-3">
          <div className="p-4 bg-slate-50 rounded-2xl text-slate-300">
            <Filter className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-[14px]">No segments yet</h3>
            <p className="text-slate-400 text-[13px] mt-1 max-w-xs">
              Build your first smart segment to target campaigns at a precise audience.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((seg) => (
            <div key={seg.id} className="bg-white rounded-3xl border border-slate-200 shadow-surface shadow-surface-hover p-5 flex flex-col justify-between gap-4 transition-shadow">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 text-[14px] truncate">{seg.name}</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10.5px] font-medium shrink-0">
                    <Users className="h-3 w-3" /> {(seg.subscriber_count ?? 0).toLocaleString()}
                  </span>
                </div>
                {seg.description && <p className="text-slate-400 text-[12px] mt-1">{seg.description}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {seg.rules.map((r, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10.5px] font-medium">
                      {FIELD_OPTIONS.find((f) => f.value === r.field)?.label || r.field} {r.operator === "is_not" ? "≠" : "="} {r.value}
                    </span>
                  ))}
                </div>
                <p className="text-[10.5px] text-slate-400 mt-2.5 font-medium">
                  Match {seg.match === "all" ? "all rules" : "any rule"}
                </p>
              </div>
              {canWrite && (
                <div className="flex gap-2 border-t border-slate-100 pt-3.5">
                  <button
                    onClick={() => openEditBuilder(seg)}
                    className="flex-1 inline-flex justify-center items-center gap-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 font-medium rounded-full text-[12px] text-slate-700 transition-colors cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(seg)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                    title="Delete segment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-100 shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? "Edit Segment" : "New Segment"}</h2>
              <button onClick={() => setShowBuilder(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError && (
                <div className="p-3.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Segment Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Engaged Webinar Attendees"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Description (optional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short internal note"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500">Rules</label>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setMatch("all")}
                      className={`px-3 py-1 rounded-md font-semibold text-[10px] transition-all cursor-pointer ${match === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                    >
                      Match ALL (AND)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatch("any")}
                      className={`px-3 py-1 rounded-md font-semibold text-[10px] transition-all cursor-pointer ${match === "any" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                    >
                      Match ANY (OR)
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {rules.map((rule, idx) => {
                    const fieldMeta = FIELD_OPTIONS.find((f) => f.value === rule.field)!;
                    return (
                      <div key={idx} className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <select
                          value={rule.field}
                          onChange={(e) => {
                            const meta = FIELD_OPTIONS.find((f) => f.value === e.target.value)!;
                            updateRule(idx, {
                              field: e.target.value,
                              operator: "is",
                              value: meta.kind === "select" ? STATUS_VALUES[0] : "",
                            });
                          }}
                          className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white flex-1 min-w-[180px]"
                          style={{ color: "#0f172a" }}
                        >
                          {FIELD_OPTIONS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>

                        {["status", "list", "tag"].includes(rule.field) && (
                          <select
                            value={rule.operator}
                            onChange={(e) => updateRule(idx, { operator: e.target.value as "is" | "is_not" })}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white w-20"
                            style={{ color: "#0f172a" }}
                          >
                            <option value="is">is</option>
                            <option value="is_not">is not</option>
                          </select>
                        )}

                        {fieldMeta.kind === "select" ? (
                          <select
                            value={rule.value}
                            onChange={(e) => updateRule(idx, { value: e.target.value })}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white flex-1 min-w-[140px]"
                            style={{ color: "#0f172a" }}
                          >
                            {STATUS_VALUES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : fieldMeta.kind === "days" ? (
                          <input
                            type="number"
                            min={1}
                            value={rule.value}
                            onChange={(e) => updateRule(idx, { value: e.target.value })}
                            placeholder="e.g. 30"
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white w-24"
                            style={{ color: "#0f172a" }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={rule.value}
                            onChange={(e) => updateRule(idx, { value: e.target.value })}
                            placeholder={rule.field === "list" ? "List name" : "Tag name"}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white flex-1 min-w-[140px]"
                            style={{ color: "#0f172a" }}
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => removeRule(idx)}
                          disabled={rules.length === 1}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addRule}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-300 hover:border-emerald-400 hover:text-emerald-600 text-slate-500 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Rule
                </button>
              </div>

              {/* Live Preview */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Live Audience Preview</span>
                  {previewing && <span className="text-[10px] text-indigo-400">Calculating...</span>}
                </div>
                {preview ? (
                  <>
                    <p className="text-2xl font-black text-indigo-800 mt-1">{preview.count.toLocaleString()} subscribers match</p>
                    {preview.sample.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {preview.sample.slice(0, 5).map((s: any) => (
                          <span key={s.email} className="px-2 py-0.5 bg-white text-slate-600 rounded text-[10px] font-mono border border-indigo-100">{s.email}</span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-indigo-400 mt-1">Add a rule with a value to preview the matching audience.</p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5 sticky bottom-0">
              <button
                onClick={() => setShowBuilder(false)}
                className="px-4.5 py-2.5 border border-slate-200 hover:bg-slate-55 font-semibold rounded-xl text-sm transition-all cursor-pointer text-slate-700 bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Segment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
