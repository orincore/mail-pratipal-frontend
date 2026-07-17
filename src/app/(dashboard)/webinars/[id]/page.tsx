"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRole } from "../../RoleProvider";
import { BRAND_NAME, BRAND_SUPPORT_EMAIL } from "@/lib/branding";
import { WhatsAppIcon } from "@/lib/brand-icons";
import {
  ArrowLeft,
  Users,
  Bell,
  Plus,
  Trash2,
  Pause,
  Play,
  X,
  CheckCircle,
  AlertCircle,
  Ban,
  RotateCcw,
  Send,
  Mail,
} from "lucide-react";

interface WebinarDetail {
  id: string;
  title: string;
  slug: string;
  starts_at: string;
  timezone: string;
  status: "upcoming" | "completed" | "cancelled";
  registrant_count: number;
}

type Channel = "email" | "whatsapp" | "both";
type DispatchStatus = "pending" | "sending" | "sent" | "skipped";

interface Reminder {
  id: string;
  name: string;
  offset_type: "days_before" | "hours_before" | "minutes_before" | "at_start" | "custom";
  offset_value?: number;
  custom_at?: string;
  channel: Channel;
  subject?: string;
  sender_name?: string;
  sender_email?: string;
  whatsapp_template?: string;
  status: "active" | "paused" | "cancelled";
  computed_send_at: string;
  dispatch_status: DispatchStatus;
  whatsapp_dispatch_status: DispatchStatus;
  stats: {
    sent: number; delivered: number; opens: number; clicks: number; bounces: number;
    whatsapp_sent: number; whatsapp_failed: number;
  };
}

interface Registrant {
  email: string;
  first_name?: string;
  status: string;
  created_at: string;
}

interface TemplateOption {
  id: string;
  name: string;
  subject?: string;
}

interface WhatsappTemplateOption {
  name: string;
  label: string;
  description: string;
  hasButton: boolean;
}

// The one verified SES sender — hardcoded so the form doesn't expose it.
const VERIFIED_SENDER_NAME = BRAND_NAME;
const VERIFIED_SENDER_EMAIL = BRAND_SUPPORT_EMAIL;

const PRESETS: { key: string; label: string }[] = [
  { key: "3_days_before", label: "3 days before" },
  { key: "2_days_before", label: "2 days before" },
  { key: "1_day_before", label: "1 day before" },
  { key: "30_min_before", label: "30 minutes before" },
  { key: "at_start", label: "At webinar start" },
];

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

function describeOffset(r: Reminder) {
  if (r.offset_type === "at_start") return "At webinar start";
  if (r.offset_type === "custom") return "Custom date/time";
  const unit = r.offset_type.replace("_before", "");
  return `${r.offset_value} ${unit}${r.offset_value === 1 ? "" : "s"} before`;
}

// Same wall-clock<->zoned-instant approach used by the website's webinar editor,
// since a custom reminder date must be interpreted in the *webinar's* timezone.
function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUTC - date.getTime()) / 60000;
}

function zonedDatetimeLocalToISO(datetimeLocal: string, timeZone: string): string {
  const [datePart, timePart] = datetimeLocal.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart || "00:00").split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60000).toISOString();
}

export default function WebinarDetailPage() {
  const { canWrite } = useRole();
  const params = useParams();
  const router = useRouter();
  const webinarId = params.id as string;

  const [webinar, setWebinar] = useState<WebinarDetail | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsappTemplateOption[]>([]);
  const [defaultWhatsappForPreset, setDefaultWhatsappForPreset] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalPreset, setModalPreset] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState<"relative" | "absolute">("relative");
  const [customAmount, setCustomAmount] = useState(1);
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours" | "days">("hours");
  const [customAbsolute, setCustomAbsolute] = useState("");
  const [pickerDate, setPickerDate] = useState("");
  const [pickerTime, setPickerTime] = useState("09:00");
  const [reminderName, setReminderName] = useState("");
  const [channel, setChannel] = useState<Channel>("email");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [whatsappTemplate, setWhatsappTemplate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [testReminder, setTestReminder] = useState<Reminder | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const [testWhatsappReminder, setTestWhatsappReminder] = useState<Reminder | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [sendingWhatsappTest, setSendingWhatsappTest] = useState(false);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/webinars/${webinarId}`);
      if (!res.ok) throw new Error("Failed to load webinar");
      const data = await res.json();
      setWebinar(data.webinar);
      setReminders(data.reminders ?? []);
      setRegistrants(data.registrants ?? []);
    } catch (err: any) {
      showNotification(err.message || "Failed to load webinar", "error");
      router.push("/webinars");
    } finally {
      setLoading(false);
    }
  }, [webinarId, router]);

  const loadFormOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) setTemplates((await res.json()) || []);
    } catch {
      // non-fatal
    }
    try {
      const res = await fetch("/api/webinars/meta/whatsapp-templates");
      if (res.ok) {
        const data = await res.json();
        setWhatsappTemplates(data.templates ?? []);
        setDefaultWhatsappForPreset(data.defaultForPreset ?? {});
      }
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    loadDetail();
    loadFormOptions();
  }, [loadDetail, loadFormOptions]);

  function openModal(preset: string | null) {
    setModalPreset(preset);
    setReminderName("");
    setCustomMode("relative");
    setCustomAmount(1);
    setCustomUnit("hours");
    setCustomAbsolute("");
    setPickerDate("");
    setPickerTime("09:00");
    setChannel("email");
    setTemplateId("");
    setSubject("");
    setWhatsappTemplate(preset ? defaultWhatsappForPreset[preset] || "" : "");
    setShowModal(true);
  }

  const needsEmail = channel !== "whatsapp";
  const needsWhatsapp = channel !== "email";

  async function handleCreateReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!webinar) return;
    if (needsEmail && (!templateId || !subject)) return;
    if (needsWhatsapp && !whatsappTemplate) return;
    setSubmitting(true);

    const body: any = {
      name: reminderName,
      channel,
      ...(needsEmail ? {
        template_id: templateId,
        subject,
        sender_name: VERIFIED_SENDER_NAME,
        sender_email: VERIFIED_SENDER_EMAIL,
      } : {}),
      ...(needsWhatsapp ? { whatsapp_template: whatsappTemplate } : {}),
    };

    if (modalPreset) {
      body.preset = modalPreset;
    } else if (customMode === "relative") {
      body.offset_type = `${customUnit}_before`;
      body.offset_value = customAmount;
    } else {
      if (!customAbsolute) {
        setSubmitting(false);
        return;
      }
      body.offset_type = "custom";
      body.custom_at = zonedDatetimeLocalToISO(customAbsolute, webinar.timezone);
    }

    try {
      const res = await fetch(`/api/webinars/${webinar.id}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create reminder");
      }
      showNotification("Reminder scheduled");
      setShowModal(false);
      loadDetail();
    } catch (err: any) {
      showNotification(err.message || "Failed to create reminder", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleReminderStatus(reminder: Reminder) {
    const newStatus = reminder.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/webinars/${webinarId}/reminders/${reminder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update reminder");
      loadDetail();
    } catch (err: any) {
      showNotification(err.message || "Failed to update reminder", "error");
    }
  }

  async function deleteReminder(reminder: Reminder) {
    if (!confirm(`Delete reminder "${reminder.name}"?`)) return;
    try {
      const res = await fetch(`/api/webinars/${webinarId}/reminders/${reminder.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete reminder");
      showNotification("Reminder deleted");
      loadDetail();
    } catch (err: any) {
      showNotification(err.message || "Failed to delete reminder", "error");
    }
  }

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testReminder || !testEmail.trim()) return;
    setSendingTest(true);
    try {
      const res = await fetch(`/api/webinars/${webinarId}/reminders/${testReminder.id}/test-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send test email");
      }
      showNotification(`Test email sent to ${testEmail.trim()}`);
      setTestReminder(null);
      setTestEmail("");
    } catch (err: any) {
      showNotification(err.message || "Failed to send test email", "error");
    } finally {
      setSendingTest(false);
    }
  }

  async function handleSendWhatsappTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testWhatsappReminder || !testPhone.trim()) return;
    setSendingWhatsappTest(true);
    try {
      const res = await fetch(`/api/webinars/${webinarId}/reminders/${testWhatsappReminder.id}/test-send-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testPhone.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send test WhatsApp message");
      }
      showNotification(`Test WhatsApp message sent to ${testPhone.trim()}`);
      setTestWhatsappReminder(null);
      setTestPhone("");
    } catch (err: any) {
      showNotification(err.message || "Failed to send test WhatsApp message", "error");
    } finally {
      setSendingWhatsappTest(false);
    }
  }

  async function toggleWebinarCancelled() {
    if (!webinar) return;
    const newStatus = webinar.status === "cancelled" ? "upcoming" : "cancelled";
    try {
      const res = await fetch(`/api/webinars/${webinar.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update webinar");
      showNotification(newStatus === "cancelled" ? "Webinar cancelled — pending reminders skipped" : "Webinar reactivated");
      loadDetail();
    } catch (err: any) {
      showNotification(err.message || "Failed to update webinar", "error");
    }
  }

  if (loading || !webinar) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  const dispatchBadge = (status: Reminder["dispatch_status"]) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      sending: "bg-blue-50 text-blue-700 border-blue-200",
      sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
      skipped: "bg-slate-100 text-slate-500 border-slate-200",
    };
    return (
      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[status]}`}>
        {status}
      </span>
    );
  };

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

      <Link href="/webinars" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to webinars
      </Link>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{webinar.title}</h1>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                webinar.status === "upcoming"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : webinar.status === "cancelled"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {webinar.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {formatInZone(webinar.starts_at, webinar.timezone)} ({webinar.timezone})
          </p>
          <p className="text-xs text-slate-400 inline-flex items-center gap-1 mt-1">
            <Users className="h-3.5 w-3.5" /> {webinar.registrant_count} registered
          </p>
        </div>
        {canWrite && (
          <button
            onClick={toggleWebinarCancelled}
            className={`inline-flex items-center gap-1.5 px-4 py-2 font-semibold rounded-xl text-sm transition-all cursor-pointer ${
              webinar.status === "cancelled"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
            }`}
          >
            {webinar.status === "cancelled" ? (
              <>
                <RotateCcw className="h-4 w-4" /> Reactivate
              </>
            ) : (
              <>
                <Ban className="h-4 w-4" /> Cancel Webinar
              </>
            )}
          </button>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 inline-flex items-center gap-2">
            <Bell className="h-4.5 w-4.5 text-emerald-600" /> Reminders
          </h2>
        </div>

        {canWrite && (
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => openModal(p.key)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-lg text-xs font-semibold text-slate-700 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> {p.label}
              </button>
            ))}
            <button
              onClick={() => openModal(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Custom Reminder
            </button>
          </div>
        )}

        {reminders.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No reminders configured yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {reminders.map((r) => {
              const showEmail = r.channel !== "whatsapp";
              const showWhatsapp = r.channel !== "email";
              const busy =
                (showEmail && ["sent", "sending"].includes(r.dispatch_status)) ||
                (showWhatsapp && ["sent", "sending"].includes(r.whatsapp_dispatch_status));
              return (
                <div key={r.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-800">{r.name}</p>
                    <p className="text-xs text-slate-400">
                      {describeOffset(r)} · sends {formatInZone(r.computed_send_at, webinar.timezone)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {showEmail && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3 text-slate-400" />
                        {dispatchBadge(r.dispatch_status)}
                      </span>
                    )}
                    {showWhatsapp && (
                      <span className="inline-flex items-center gap-1">
                        <WhatsAppIcon className="h-3 w-3 text-slate-400" />
                        {dispatchBadge(r.whatsapp_dispatch_status)}
                      </span>
                    )}
                    {canWrite && showEmail && (
                      <button
                        onClick={() => {
                          setTestReminder(r);
                          setTestEmail("");
                        }}
                        className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                        title="Send a test email to see exactly how this looks"
                      >
                        <Send className="h-3.5 w-3.5" /> Test
                      </button>
                    )}
                    {canWrite && showWhatsapp && (
                      <button
                        onClick={() => {
                          setTestWhatsappReminder(r);
                          setTestPhone("");
                        }}
                        className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold cursor-pointer"
                        title="Send a test WhatsApp message to see exactly how this looks"
                      >
                        <WhatsAppIcon className="h-3.5 w-3.5" /> Test
                      </button>
                    )}
                    {canWrite && (
                      <button
                        onClick={() => toggleReminderStatus(r)}
                        disabled={busy}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                        title={r.status === "active" ? "Pause" : "Resume"}
                      >
                        {r.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    {canWrite && (
                      <button
                        onClick={() => deleteReminder(r)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {registrants.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-gray-900 inline-flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-emerald-600" /> Registrants ({registrants.length})
          </h2>
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {registrants.map((r) => (
              <div key={r.email} className="py-2 flex items-center justify-between text-sm">
                <span className="text-slate-700">{r.first_name || "—"}</span>
                <span className="text-slate-400 font-mono text-xs">{r.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full overflow-hidden animate-fadeIn text-left max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-slate-800 text-base">
                {modalPreset ? PRESETS.find((p) => p.key === modalPreset)?.label : "Custom Reminder"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateReminder} className="p-6 space-y-4">
              {!modalPreset && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">When</label>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setCustomMode("relative")}
                      className={`flex-1 py-1.5 rounded-md font-semibold text-xs cursor-pointer ${
                        customMode === "relative" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                      }`}
                    >
                      Amount before
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomMode("absolute")}
                      className={`flex-1 py-1.5 rounded-md font-semibold text-xs cursor-pointer ${
                        customMode === "absolute" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                      }`}
                    >
                      Specific date/time
                    </button>
                  </div>

                  {customMode === "relative" ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        required
                        value={customAmount}
                        onChange={(e) => setCustomAmount(Number(e.target.value))}
                        className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 bg-white"
                      />
                      <select
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value as any)}
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 bg-white"
                      >
                        <option value="minutes">Minutes before</option>
                        <option value="hours">Hours before</option>
                        <option value="days">Days before</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Date</label>
                          <input
                            type="date"
                            value={pickerDate}
                            onChange={(e) => setPickerDate(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 bg-white cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Time</label>
                          <input
                            type="time"
                            value={pickerTime}
                            onChange={(e) => setPickerTime(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 bg-white cursor-pointer"
                          />
                        </div>
                      </div>
                      {customAbsolute ? (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                          <span className="text-xs font-semibold text-emerald-700">
                            Set to: {new Date(customAbsolute.replace("T", " ")).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                          <button
                            type="button"
                            onClick={() => { setCustomAbsolute(""); setPickerDate(""); setPickerTime("09:00"); }}
                            className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold cursor-pointer"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!pickerDate || !pickerTime}
                          onClick={() => {
                            if (pickerDate && pickerTime) {
                              setCustomAbsolute(`${pickerDate}T${pickerTime}`);
                            }
                          }}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                        >
                          ✓ Confirm Date &amp; Time
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400">Interpreted in the webinar's timezone: {webinar.timezone}</p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Reminder Name</label>
                <input
                  value={reminderName}
                  onChange={(e) => setReminderName(e.target.value)}
                  placeholder={modalPreset ? PRESETS.find((p) => p.key === modalPreset)?.label : "e.g. Day-before reminder"}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Send via</label>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  {(["email", "whatsapp", "both"] as Channel[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setChannel(c);
                        if (c !== "email" && !whatsappTemplate && modalPreset) {
                          setWhatsappTemplate(defaultWhatsappForPreset[modalPreset] || "");
                        }
                      }}
                      className={`flex-1 py-1.5 rounded-md font-semibold text-xs cursor-pointer capitalize ${
                        channel === c ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {needsEmail && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Email Template *</label>
                    <select
                      required
                      value={templateId}
                      onChange={(e) => {
                        setTemplateId(e.target.value);
                        const tpl = templates.find((t) => t.id === e.target.value);
                        if (tpl?.subject) setSubject(tpl.subject);
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="" disabled>Select a template</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Subject *</label>
                    <input
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Your webinar is starting soon!"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </>
              )}

              {needsWhatsapp && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">WhatsApp Template *</label>
                  <select
                    required
                    value={whatsappTemplate}
                    onChange={(e) => setWhatsappTemplate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="" disabled>Select an approved template</option>
                    {whatsappTemplates.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {whatsappTemplate && (
                    <p className="text-[10px] text-slate-400">
                      {whatsappTemplates.find((t) => t.name === whatsappTemplate)?.description}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    Only registrants with a WhatsApp number on file will receive this — others are skipped automatically.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer"
              >
                {submitting ? "Scheduling..." : "Schedule Reminder"}
              </button>
            </form>
          </div>
        </div>
      )}

      {testReminder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden animate-fadeIn text-left">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base">Send Test Email</h3>
              <button onClick={() => setTestReminder(null)} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSendTest} className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Sends "<span className="font-semibold text-slate-700">{testReminder.name}</span>" using its real
                template and subject — merge tags like <code className="text-[11px] bg-slate-100 px-1 rounded">{"{{webinar}}"}</code>{" "}
                are filled with this webinar's actual title so you see exactly what registrants will get.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Send test to</label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={sendingTest}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {sendingTest ? "Sending..." : "Send Test Email"}
              </button>
            </form>
          </div>
        </div>
      )}

      {testWhatsappReminder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden animate-fadeIn text-left">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base">Send Test WhatsApp Message</h3>
              <button onClick={() => setTestWhatsappReminder(null)} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSendWhatsappTest} className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Sends "<span className="font-semibold text-slate-700">{testWhatsappReminder.name}</span>" using its
                real approved template — filled with this webinar's actual title/date/time so you see exactly what
                registrants will get.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Send test to (with country code)</label>
                <input
                  type="tel"
                  required
                  autoFocus
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={sendingWhatsappTest}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                {sendingWhatsappTest ? "Sending..." : "Send Test WhatsApp Message"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
