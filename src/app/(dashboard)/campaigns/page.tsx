"use client";

import React, { useState, useEffect } from "react";
import { 
  Send, 
  Plus, 
  Trash2, 
  Pause, 
  Play, 
  XSquare, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Eye,
  Calendar,
  X,
  RotateCcw,
  MessageCircle
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  subject?: string;
  sender_name?: string;
  sender_email?: string;
  reply_to?: string;
  template_id?: { id: string; name: string } | string;
  channel: "email" | "whatsapp" | "both";
  whatsapp_template?: string;
  audience: {
    lists: string[];
    tags: string[];
    all: boolean;
  };
  status: "draft" | "scheduled" | "sending" | "sent" | "paused" | "cancelled";
  dispatch_status: "pending" | "sending" | "sent" | "skipped";
  whatsapp_dispatch_status: "pending" | "sending" | "sent" | "skipped";
  schedule_type: "immediate" | "scheduled";
  scheduled_at?: string;
  sent_at?: string;
  stats: {
    sent: number;
    delivered: number;
    opens: number;
    clicks: number;
    bounces: number;
    complaints: number;
    unsubscribed: number;
    whatsapp_sent?: number;
    whatsapp_failed?: number;
  };
  created_at: string;
}

interface TemplateOption {
  id: string;
  name: string;
  subject?: string;
  html_content?: string;
}

interface SenderOption {
  id: string;
  email: string;
  verification_status: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [senders, setSenders] = useState<SenderOption[]>([]);
  const [lists, setLists] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard Modal
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formSenderName, setFormSenderName] = useState("Pratipal");
  const [formSenderEmail, setFormSenderEmail] = useState("contact@notifications.pratipal.in");
  const [formReplyTo, setFormReplyTo] = useState("");
  const [formTemplateId, setFormTemplateId] = useState("");
  
  // WhatsApp Fields
  const [channel, setChannel] = useState<"email" | "whatsapp" | "both">("email");
  const [whatsappTemplate, setWhatsappTemplate] = useState("");
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);

  // Test Send States
  const [showTestModal, setShowTestModal] = useState(false);
  const [testCampaignId, setTestCampaignId] = useState<string | null>(null);
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // WhatsApp Test Send States
  const [testWhatsappCampaign, setTestWhatsappCampaign] = useState<Campaign | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [sendingWhatsappTest, setSendingWhatsappTest] = useState(false);
  
  const [audienceAll, setAudienceAll] = useState(true);
  const [audienceListsText, setAudienceListsText] = useState("");
  const [audienceTagsText, setAudienceTagsText] = useState("");
  
  const [scheduleType, setScheduleType] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledAt, setScheduledAt] = useState("");

  // Detailed Info Modal state
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Rerun States
  const [showRerunModal, setShowRerunModal] = useState(false);
  const [rerunCampaignId, setRerunCampaignId] = useState<string | null>(null);
  const [rerunCampaignName, setRerunCampaignName] = useState("");
  const [rerunScheduleType, setRerunScheduleType] = useState<"immediate" | "scheduled">("immediate");
  const [rerunScheduledAt, setRerunScheduledAt] = useState("");
  const [rerunning, setRerunning] = useState(false);

  const [dateFilter, setDateFilter] = useState<"all" | "week" | "month" | "6months" | "year">("all");

  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter campaigns by date
  const filteredCampaigns = campaigns.filter((camp) => {
    if (dateFilter === "all") return true;
    const createdAt = new Date(camp.created_at);
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (dateFilter === "week") return diffDays <= 7;
    if (dateFilter === "month") return diffDays <= 30;
    if (dateFilter === "6months") return diffDays <= 180;
    if (dateFilter === "year") return diffDays <= 365;
    return true;
  });

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data || []);
      }
    } catch {
      showNotification("Failed to fetch campaigns", "error");
    }
  };

  const fetchFormOptions = async () => {
    try {
      // 1. Fetch templates
      const tRes = await fetch("/api/templates");
      if (tRes.ok) {
        const tData = await tRes.json();
        setTemplates(tData || []);
      }

      // 2. Fetch verified email identities
      const sRes = await fetch("/api/senders");
      if (sRes.ok) {
        const sData = await sRes.json();
        const verifiedSenders = (sData || []).filter((s: any) => s.verification_status === "verified");
        setSenders(verifiedSenders);
      }

      // 3. Fetch list and tag options from subscribers endpoint
      const subRes = await fetch("/api/subscribers");
      if (subRes.ok) {
        const subData = await subRes.json();
        setLists(subData.lists || []);
        setTags(subData.tags || []);
      }

      // 4. Fetch WhatsApp templates
      const wRes = await fetch("/api/campaigns/meta/whatsapp-templates");
      if (wRes.ok) {
        const wData = await wRes.json();
        setWhatsappTemplates(wData.templates || []);
      }
    } catch {
      showNotification("Failed to load campaign helpers", "error");
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchCampaigns(), fetchFormOptions()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCampaignAction = async (id: string, action: "pause" | "resume" | "cancel") => {
    try {
      const res = await fetch("/api/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });

      const data = await res.json();
      if (res.ok) {
        showNotification(`Campaign successfully ${action}d`);
        fetchCampaigns();
      } else {
        showNotification(data.error || "Action failed", "error");
      }
    } catch {
      showNotification("Network error", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    try {
      const res = await fetch(`/api/campaigns?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showNotification("Campaign deleted successfully");
        fetchCampaigns();
      } else {
        showNotification("Failed to delete campaign", "error");
      }
    } catch {
      showNotification("Network error", "error");
    }
  };

  const handleSendCampaignTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCampaignId || !testRecipientEmail) return;

    setSendingTest(true);
    try {
      const res = await fetch(`/api/campaigns/${testCampaignId}/test-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testRecipientEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Test email sent successfully to your inbox!");
        setShowTestModal(false);
        setTestRecipientEmail("");
      } else {
        showNotification(data.error || "Failed to send test email", "error");
      }
    } catch {
      showNotification("Network error occurred", "error");
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendWhatsappTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testWhatsappCampaign || !testPhone.trim()) return;

    setSendingWhatsappTest(true);
    try {
      const res = await fetch(`/api/campaigns/${testWhatsappCampaign.id}/test-send-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testPhone.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Test WhatsApp message sent to ${testPhone.trim()}!`);
        setTestWhatsappCampaign(null);
        setTestPhone("");
      } else {
        showNotification(data.error || "Failed to send test WhatsApp message", "error");
      }
    } catch {
      showNotification("Network error occurred", "error");
    } finally {
      setSendingWhatsappTest(false);
    }
  };

  const handleRerunSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rerunCampaignId) return;

    setRerunning(true);
    try {
      const res = await fetch(`/api/campaigns/${rerunCampaignId}/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule_type: rerunScheduleType,
          scheduled_at: rerunScheduleType === "scheduled" ? rerunScheduledAt : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showNotification("Campaign cloned and scheduled/sent successfully!");
        setShowRerunModal(false);
        fetchCampaigns();
      } else {
        showNotification(data.error || "Failed to rerun campaign", "error");
      }
    } catch {
      showNotification("Network error occurred", "error");
    } finally {
      setRerunning(false);
    }
  };

  // Submit wizard campaign creation
  const handleWizardSubmit = async () => {
    const needsEmail = channel !== "whatsapp";
    const needsWhatsapp = channel !== "email";

    if (!formName) {
      setFormError("Campaign Name is required");
      return;
    }
    if (needsEmail && (!formSubject || !formSenderEmail || !formTemplateId)) {
      setFormError("Missing required parameters in email configuration");
      return;
    }
    if (needsWhatsapp && !whatsappTemplate) {
      setFormError("Please select a WhatsApp template");
      return;
    }

    setSubmitting(true);
    setFormError("");

    const payload = {
      name: formName,
      subject: needsEmail ? formSubject : undefined,
      sender_name: needsEmail ? formSenderName : undefined,
      sender_email: needsEmail ? formSenderEmail : undefined,
      reply_to: (needsEmail && formReplyTo) ? formReplyTo : undefined,
      template_id: needsEmail ? formTemplateId : undefined,
      channel,
      whatsapp_template: needsWhatsapp ? whatsappTemplate : undefined,
      audience: {
        all: audienceAll,
        lists: audienceAll ? [] : audienceListsText.split(",").map(l => l.trim()).filter(Boolean),
        tags: audienceAll ? [] : audienceTagsText.split(",").map(t => t.trim()).filter(Boolean),
      },
      schedule_type: scheduleType,
      scheduled_at: scheduleType === "scheduled" ? scheduledAt : undefined,
    };

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        showNotification(scheduleType === "immediate" ? "Campaign sending queue initialized!" : "Campaign scheduled successfully");
        setShowWizard(false);
        resetWizard();
        fetchCampaigns();
      } else {
        setFormError(data.error || "Failed to save campaign");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setWizardStep(1);
    setFormName("");
    setFormSubject("");
    setFormSenderName("Pratipal");
    setFormSenderEmail("contact@notifications.pratipal.in");
    setFormReplyTo("");
    setFormTemplateId("");
    setChannel("email");
    setWhatsappTemplate("");
    setAudienceAll(true);
    setAudienceListsText("");
    setAudienceTagsText("");
    setScheduleType("immediate");
    setScheduledAt("");
    setFormError("");
  };

  // Quick auto-populate subject if template is selected
  const handleTemplateChange = (id: string) => {
    setFormTemplateId(id);
    const selected = templates.find(t => t.id === id);
    if (selected?.subject) {
      setFormSubject(selected.subject);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notification && (
        <div className={`fixed bottom-4 right-4 z-[9999] p-4 rounded-xl shadow-lg border text-sm flex items-center gap-2 animate-bounce ${
          notification.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          {notification.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Campaign Management</h1>
          <p className="text-slate-500 text-sm mt-1">Deploy newsletter campaigns, follow-ups, and track deliveries.</p>
        </div>
        <div>
          <button
            onClick={() => {
              resetWizard();
              setShowWizard(true);
            }}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" /> Start Campaign
          </button>
        </div>
      </div>

      {/* Campaign Lists */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Date Filter Bar */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filter by Date:</span>
          {([
            { value: "all", label: "All Time" },
            { value: "week", label: "Last Week" },
            { value: "month", label: "Last Month" },
            { value: "6months", label: "Last 6 Months" },
            { value: "year", label: "Last Year" },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                dateFilter === opt.value
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {dateFilter !== "all" && (
            <span className="ml-auto text-[10px] text-slate-400 font-medium">
              {filteredCampaigns.length} of {campaigns.length} campaigns
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="h-8 w-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            {campaigns.length === 0
              ? 'No email campaigns created yet. Click "Start Campaign" to build your first email sequence.'
              : `No campaigns found for the selected time period.`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-4 px-6">Campaign Info</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-right">Dispatched</th>
                  <th className="py-4 px-4 text-right">Unique Opens</th>
                  <th className="py-4 px-4 text-right">Unique Clicks</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredCampaigns.map((camp) => {
                  const isEmailChannel = camp.channel !== "whatsapp";
                  const isWhatsappChannel = camp.channel !== "email";
                  
                  const tplName = camp.channel === "whatsapp"
                    ? `WA: ${camp.whatsapp_template}`
                    : (typeof camp.template_id === "object" ? camp.template_id.name : "Custom Template");
                  
                  const openPct = camp.stats.sent ? ((camp.stats.opens / camp.stats.sent) * 100).toFixed(1) : "0";
                  const clickPct = camp.stats.sent ? ((camp.stats.clicks / camp.stats.sent) * 100).toFixed(1) : "0";
                  
                  return (
                    <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{camp.name}</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                            camp.channel === "whatsapp" ? "bg-emerald-100 text-emerald-800" :
                            camp.channel === "both" ? "bg-indigo-100 text-indigo-800" :
                            "bg-sky-100 text-sky-800"
                          }`}>
                            {camp.channel || "email"}
                          </span>
                        </div>
                        {isEmailChannel ? (
                          <div className="text-slate-400 text-xs mt-0.5">Subject: {camp.subject}</div>
                        ) : (
                          <div className="text-slate-400 text-xs mt-0.5">Template: {camp.whatsapp_template}</div>
                        )}
                        <div className="flex gap-2 mt-1.5 text-[10px] text-slate-505 items-center">
                          {isEmailChannel && (
                            <>
                              <span>Template: <span className="font-semibold">{tplName}</span></span>
                              <span className="h-1 w-1 bg-slate-300 rounded-full" />
                              <span>Sender: <span className="font-mono">{camp.sender_email}</span></span>
                            </>
                          )}
                          {!isEmailChannel && (
                            <span>Sender: <span className="font-semibold">WhatsApp Gateway</span></span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                          camp.status === "sent" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          camp.status === "sending" ? "bg-blue-50 text-blue-600 border-blue-100 animate-pulse" :
                          camp.status === "scheduled" ? "bg-amber-50 text-amber-600 border-amber-100" :
                          camp.status === "paused" ? "bg-slate-100 text-slate-500 border-slate-200" :
                          "bg-rose-50 text-rose-600 border-rose-100"
                        }`}>
                          {camp.status}
                        </span>
                        {camp.status === "scheduled" && camp.scheduled_at && (
                          <span className="text-[10px] text-slate-400 block mt-1">
                            {new Date(camp.scheduled_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">
                        {camp.channel === "both" ? (
                          <div className="text-xs">
                            <div>E: {camp.stats.sent.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-450 font-normal">W: {(camp.stats.whatsapp_sent || 0).toLocaleString()}</div>
                          </div>
                        ) : camp.channel === "whatsapp" ? (
                          <span>{(camp.stats.whatsapp_sent || 0).toLocaleString()} WA</span>
                        ) : (
                          <span>{camp.stats.sent.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-slate-800">
                        {isEmailChannel ? (
                          <>
                            <div className="font-bold">{camp.stats.opens.toLocaleString()}</div>
                            <div className="text-slate-400 text-xs">{openPct}%</div>
                          </>
                        ) : (
                          <span className="text-slate-350">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-slate-800">
                        {isEmailChannel ? (
                          <>
                            <div className="font-bold">{camp.stats.clicks.toLocaleString()}</div>
                            <div className="text-slate-400 text-xs">{clickPct}%</div>
                          </>
                        ) : (
                          <span className="text-slate-350">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setSelectedCampaign(camp);
                            setShowDetailsModal(true);
                          }}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition-all inline-flex cursor-pointer border border-slate-150"
                          title="View Campaign Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {isEmailChannel && (
                          <button
                            onClick={() => {
                              setTestCampaignId(camp.id);
                              setShowTestModal(true);
                              setTestRecipientEmail("");
                            }}
                            className="p-1.5 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-lg transition-all inline-flex cursor-pointer border border-emerald-100"
                            title="Send Test Email"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {isWhatsappChannel && (
                          <button
                            onClick={() => {
                              setTestWhatsappCampaign(camp);
                              setTestPhone("");
                            }}
                            className="p-1.5 hover:bg-emerald-55/35 text-slate-500 hover:text-emerald-600 rounded-lg transition-all inline-flex cursor-pointer border border-emerald-105"
                            title="Send Test WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setRerunCampaignId(camp.id);
                            setRerunCampaignName(camp.name);
                            setRerunScheduleType("immediate");
                            setRerunScheduledAt("");
                            setShowRerunModal(true);
                          }}
                          className="p-1.5 hover:bg-emerald-55/35 text-slate-500 hover:text-emerald-600 rounded-lg transition-all inline-flex cursor-pointer border border-emerald-100"
                          title="Rerun Campaign"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        {camp.status === "sending" && (
                          <button
                            onClick={() => handleCampaignAction(camp.id, "pause")}
                            className="p-1.5 bg-slate-100 hover:bg-amber-50 text-slate-500 hover:text-amber-600 rounded-lg transition-all inline-flex cursor-pointer"
                            title="Pause dispatching"
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                        )}
                        {camp.status === "paused" && (
                          <button
                            onClick={() => handleCampaignAction(camp.id, "resume")}
                            className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-lg transition-all inline-flex cursor-pointer"
                            title="Resume dispatching"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        {(camp.status === "sending" || camp.status === "scheduled" || camp.status === "paused") && (
                          <button
                            onClick={() => handleCampaignAction(camp.id, "cancel")}
                            className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-all inline-flex cursor-pointer"
                            title="Cancel campaign run"
                          >
                            <XSquare className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(camp.id)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all inline-flex cursor-pointer"
                          title="Delete campaign"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Creation Wizard Slide-Out Overlay */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end animate-fade-in">
          <div className="bg-white max-w-lg w-full h-full border-l border-slate-100 shadow-2xl flex flex-col justify-between animate-slide-in">
            {/* Header info */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Launch New Campaign</h2>
                  <p className="text-slate-400 text-xs">Step {wizardStep} of 3</p>
                </div>
              </div>
              <button onClick={() => setShowWizard(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Wizard Body Steps */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5">
              {formError && (
                <div className="p-3.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* STEP 1: Campaign details */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Campaign Name (Internal Reference) *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. July Newsletter, Oil Workshop Remainder"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Send via</label>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      {(["email", "whatsapp", "both"] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setChannel(c)}
                          className={`flex-1 py-1.5 rounded-md font-semibold text-xs cursor-pointer capitalize ${
                            channel === c ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {channel !== "whatsapp" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500">Email Subject Line *</label>
                        <input
                          type="text"
                          required
                          value={formSubject}
                          onChange={(e) => setFormSubject(e.target.value)}
                          placeholder="e.g. Discover nature's secrets..."
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-slate-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500">Reply-To Address (Optional)</label>
                        <input
                          type="email"
                          value={formReplyTo}
                          onChange={(e) => setFormReplyTo(e.target.value)}
                          placeholder="e.g. reply@yourdomain.com"
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-slate-900"
                        />
                      </div>
                    </>
                  )}

                  {channel !== "email" && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">WhatsApp Template *</label>
                      <select
                        required
                        value={whatsappTemplate}
                        onChange={(e) => setWhatsappTemplate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 bg-white"
                      >
                        <option value="" disabled>Select an approved template</option>
                        {whatsappTemplates.map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      {whatsappTemplate && (
                        <p className="text-[10px] text-slate-405 mt-1">
                          {whatsappTemplates.find((t) => t.name === whatsappTemplate)?.description}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        Only subscribers with a WhatsApp number on file will receive this — others are skipped automatically.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Select Template */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  {channel === "whatsapp" ? (
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                      <MessageCircle className="h-10 w-10 text-emerald-600 mx-auto" />
                      <p className="font-bold text-slate-800 text-sm">WhatsApp Campaign</p>
                      <p className="text-xs text-slate-500 leading-normal">
                        No email template design is required since this campaign will only deliver via WhatsApp. Click Next to continue.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Select Template Design *</label>
                      <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-1">
                        {templates.map((tpl) => (
                          <div
                            key={tpl.id}
                            onClick={() => handleTemplateChange(tpl.id)}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center ${
                              formTemplateId === tpl.id 
                                ? "border-emerald-600 bg-emerald-50/20" 
                                : "border-slate-200 hover:border-slate-350"
                            }`}
                          >
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{tpl.name}</p>
                              {tpl.subject && <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[300px]">Sub: {tpl.subject}</p>}
                            </div>
                            {formTemplateId === tpl.id && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Audience and Schedule */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  {/* Audience Section */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Recipient Audience</span>
                    
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setAudienceAll(true)}
                        className={`flex-1 py-1.5 rounded-md font-semibold text-xs transition-all cursor-pointer ${audienceAll ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                      >
                        All Subscribers
                      </button>
                      <button
                        type="button"
                        onClick={() => setAudienceAll(false)}
                        className={`flex-1 py-1.5 rounded-md font-semibold text-xs transition-all cursor-pointer ${!audienceAll ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                      >
                        Segment/Filter
                      </button>
                    </div>

                    {!audienceAll && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 animate-fade-in">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter by List</label>
                          <select
                            value={audienceListsText}
                            onChange={(e) => setAudienceListsText(e.target.value)}
                            className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 appearance-none"
                            style={{ color: "#0f172a" }}
                          >
                            <option value="">-- No List Filter --</option>
                            {lists.map((l) => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter by Tag</label>
                          <select
                            value={audienceTagsText}
                            onChange={(e) => setAudienceTagsText(e.target.value)}
                            className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 appearance-none"
                            style={{ color: "#0f172a" }}
                          >
                            <option value="">-- No Tag Filter --</option>
                            {tags.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Schedule Section */}
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Dispatch Schedule</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        onClick={() => setScheduleType("immediate")}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-1.5 ${
                          scheduleType === "immediate" ? "border-emerald-600 bg-emerald-50/20 text-emerald-700" : "border-slate-200 hover:border-slate-350 text-slate-600"
                        }`}
                      >
                        <Send className="h-5 w-5" />
                        <span className="font-bold text-xs">Send Immediately</span>
                      </div>
                      <div
                        onClick={() => setScheduleType("scheduled")}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-1.5 ${
                          scheduleType === "scheduled" ? "border-emerald-600 bg-emerald-50/20 text-emerald-700" : "border-slate-200 hover:border-slate-350 text-slate-600"
                        }`}
                      >
                        <Calendar className="h-5 w-5" />
                        <span className="font-bold text-xs">Schedule for Later</span>
                      </div>
                    </div>

                    {scheduleType === "scheduled" && (
                      <div className="space-y-1 animate-fade-in">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Choose Dispatch Date & Time *</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="datetime-local"
                            required
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                            style={{ color: "#0f172a" }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!scheduledAt) return;
                              showNotification(`Campaign scheduled for ${new Date(scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`, "success");
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm shrink-0"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    )}
                  </div>                  {/* Test Dispatch Section */}
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Test Campaign Delivery</span>
                    
                    {channel !== "whatsapp" && (
                      <div className="space-y-2">
                        <p className="text-slate-505 text-xs leading-relaxed">
                          Send a single test run of this campaign's selected email template to check its layout and deliverability.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            placeholder="you@example.com"
                            value={testRecipientEmail}
                            onChange={(e) => setTestRecipientEmail(e.target.value)}
                            className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-slate-900"
                          />
                          <button
                            type="button"
                            disabled={sendingTest}
                            onClick={async () => {
                              if (!testRecipientEmail) {
                                showNotification("Please enter a test recipient email address", "error");
                                return;
                              }
                              const selectedTemplate = templates.find(t => t.id === formTemplateId);
                              if (!selectedTemplate) {
                                showNotification("Please go back and select a template first", "error");
                                return;
                              }
                              setSendingTest(true);
                              try {
                                const res = await fetch("/api/test-send", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    to: testRecipientEmail,
                                    subject: `[TEST] ${formSubject}`,
                                    html: selectedTemplate.html_content,
                                    fromName: formSenderName,
                                    fromEmail: formSenderEmail,
                                  }),
                                });
                                const data = await res.json();
                                if (res.ok) {
                                  showNotification("Test email sent successfully!");
                                } else {
                                  showNotification(data.error || "Failed to send test", "error");
                                }
                              } catch {
                                showNotification("Network error occurred", "error");
                              } finally {
                                setSendingTest(false);
                              }
                            }}
                            className="px-4 py-2 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 font-semibold rounded-xl text-xs transition-colors border border-slate-200 hover:border-emerald-250 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                          >
                            {sendingTest ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            Send Test Email
                          </button>
                        </div>
                      </div>
                    )}

                    {channel !== "email" && (
                      <div className="space-y-2 pt-2">
                        <p className="text-slate-550 text-xs leading-relaxed">
                          Send a test WhatsApp template message using MSG91 configuration.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            placeholder="+919876543210"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-slate-900"
                          />
                          <button
                            type="button"
                            disabled={sendingWhatsappTest}
                            onClick={async () => {
                              if (!testPhone.trim()) {
                                showNotification("Please enter a test phone number", "error");
                                return;
                              }
                              if (!whatsappTemplate) {
                                showNotification("Please select a WhatsApp template first", "error");
                                return;
                              }
                              setSendingWhatsappTest(true);
                              try {
                                const res = await fetch("/api/test-send/whatsapp", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    to: testPhone.trim(),
                                    templateName: whatsappTemplate,
                                    eventName: formName || "Test Campaign",
                                  }),
                                });
                                const data = await res.json();
                                if (res.ok) {
                                  showNotification(`Test WhatsApp sent successfully to ${testPhone.trim()}!`);
                                } else {
                                  showNotification(data.error || "Failed to send test WhatsApp", "error");
                                }
                              } catch {
                                showNotification("Network error occurred", "error");
                              } finally {
                                setSendingWhatsappTest(false);
                              }
                            }}
                            className="px-4 py-2 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 font-semibold rounded-xl text-xs transition-colors border border-slate-200 hover:border-emerald-250 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                          >
                            {sendingWhatsappTest ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                            Send Test WhatsApp
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (wizardStep > 1) setWizardStep(wizardStep - 1);
                  else setShowWizard(false);
                }}
                className="px-4.5 py-2.5 border border-slate-200 hover:bg-slate-55 font-semibold rounded-xl text-sm transition-all cursor-pointer text-slate-700"
              >
                {wizardStep > 1 ? "Back" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (wizardStep < 3) {
                    const needsEmail = channel !== "whatsapp";
                    const needsWhatsapp = channel !== "email";
                    if (wizardStep === 1) {
                      if (!formName) {
                        setFormError("Campaign Name is required");
                        return;
                      }
                      if (needsEmail && (!formSubject || !formSenderEmail)) {
                        setFormError("Please fill out all required email fields.");
                        return;
                      }
                      if (needsWhatsapp && !whatsappTemplate) {
                        setFormError("Please select a WhatsApp template.");
                        return;
                      }
                    }
                    if (wizardStep === 2 && needsEmail && !formTemplateId) {
                      setFormError("Please select an email template to proceed.");
                      return;
                    }
                    setFormError("");
                    setWizardStep(wizardStep + 1);
                  } else {
                    handleWizardSubmit();
                  }
                }}
                disabled={submitting}
                className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {wizardStep < 3 ? "Next Step" : (submitting ? "Deploying..." : "Launch Campaign")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Campaign View Modal */}
      {showDetailsModal && selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-slate-100 shadow-2xl flex flex-col justify-between animate-scale-up">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-emerald-600" />
                <div>
                  <h2 className="text-base font-bold text-slate-800">Campaign Detailed Info</h2>
                  <p className="text-slate-400 text-xs">{selectedCampaign.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCampaign(null);
                }} 
                className="p-1.5 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                           {/* Properties Grid */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {selectedCampaign.channel === "whatsapp" ? "WhatsApp Template" : "Email Subject"}
                  </span>
                  <p className="font-semibold text-slate-800 leading-normal">
                    {selectedCampaign.channel === "whatsapp" ? selectedCampaign.whatsapp_template : selectedCampaign.subject}
                  </p>
                </div>
                
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Sender Identity</span>
                  <p className="font-semibold text-slate-800">
                    {selectedCampaign.channel === "whatsapp" ? "WhatsApp Gateway" : selectedCampaign.sender_name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {selectedCampaign.channel === "whatsapp" ? "Active Channel: WhatsApp" : selectedCampaign.sender_email}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Template</span>
                  <p className="font-semibold text-slate-800">
                    {selectedCampaign.channel === "whatsapp" 
                      ? `WhatsApp: ${selectedCampaign.whatsapp_template}` 
                      : (typeof selectedCampaign.template_id === "object" 
                        ? selectedCampaign.template_id.name 
                        : "HTML Template")}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Audience Segment</span>
                  <p className="font-semibold text-slate-800">
                    {selectedCampaign.audience.all ? "All Subscribers" : "Segmented Filter"}
                  </p>
                  {!selectedCampaign.audience.all && (
                    <div className="text-[10px] text-slate-505 space-y-0.5 mt-1">
                      {selectedCampaign.audience.lists.length > 0 && (
                        <div>Lists: <span className="bg-slate-200 px-1 py-0.5 rounded font-mono">{selectedCampaign.audience.lists.join(", ")}</span></div>
                      )}
                      {selectedCampaign.audience.tags.length > 0 && (
                        <div>Tags: <span className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-mono">{selectedCampaign.audience.tags.join(", ")}</span></div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Status & Schedule</span>
                  <p className="mt-0.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                      selectedCampaign.status === "sent" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      selectedCampaign.status === "sending" ? "bg-blue-50 text-blue-600 border-blue-100 animate-pulse" :
                      selectedCampaign.status === "scheduled" ? "bg-amber-50 text-amber-600 border-amber-100" :
                      selectedCampaign.status === "paused" ? "bg-slate-100 text-slate-500 border-slate-200" :
                      "bg-rose-50 text-rose-600 border-rose-100"
                    }`}>
                      {selectedCampaign.status}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {selectedCampaign.schedule_type === "immediate" ? "Immediate send" : "Scheduled send"}
                  </p>
                  {selectedCampaign.scheduled_at && (
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                      Run: {new Date(selectedCampaign.scheduled_at).toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              </div>

              {/* Metrics Grid */}
              {selectedCampaign.channel !== "whatsapp" && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Email Campaign Performance Metrics</span>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="border border-teal-100 p-3 rounded-xl text-center bg-teal-50/30">
                      <span className="text-[9px] font-bold text-teal-600 uppercase block">Delivered</span>
                      <span className="font-mono text-base font-bold text-slate-800 mt-1 block">
                        {Math.max(0, (selectedCampaign.stats.sent || 0) - (selectedCampaign.stats.bounces || 0) - (selectedCampaign.stats.complaints || 0))}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {selectedCampaign.stats.sent
                          ? (((Math.max(0, (selectedCampaign.stats.sent || 0) - (selectedCampaign.stats.bounces || 0) - (selectedCampaign.stats.complaints || 0))) / selectedCampaign.stats.sent) * 100).toFixed(1)
                          : "0"}%
                      </span>
                    </div>

                    <div className="border border-rose-100 p-3 rounded-xl text-center bg-rose-50/30">
                      <span className="text-[9px] font-bold text-rose-500 uppercase block">Unsuccessful</span>
                      <span className="font-mono text-base font-bold text-slate-800 mt-1 block">
                        {(selectedCampaign.stats.bounces || 0) + (selectedCampaign.stats.complaints || 0)}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {selectedCampaign.stats.sent
                          ? ((((selectedCampaign.stats.bounces || 0) + (selectedCampaign.stats.complaints || 0)) / selectedCampaign.stats.sent) * 100).toFixed(1)
                          : "0"}%
                      </span>
                    </div>

                    <div className="border border-slate-150 p-3 rounded-xl text-center bg-slate-50/30">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Unsubscribed</span>
                      <span className="font-mono text-base font-bold text-slate-800 mt-1 block">
                        {selectedCampaign.stats.unsubscribed || 0}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {selectedCampaign.stats.sent
                          ? (((selectedCampaign.stats.unsubscribed || 0) / selectedCampaign.stats.sent) * 100).toFixed(1)
                          : "0"}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedCampaign.channel !== "email" && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block">WhatsApp Campaign Delivery Metrics</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-teal-100 p-3 rounded-xl text-center bg-teal-50/30">
                      <span className="text-[9px] font-bold text-teal-600 uppercase block">Dispatched</span>
                      <span className="font-mono text-base font-bold text-slate-800 mt-1 block">
                        {(selectedCampaign.stats.whatsapp_sent || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="border border-rose-100 p-3 rounded-xl text-center bg-rose-50/30">
                      <span className="text-[9px] font-bold text-rose-500 uppercase block">Failed</span>
                      <span className="font-mono text-base font-bold text-slate-800 mt-1 block">
                        {(selectedCampaign.stats.whatsapp_failed || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCampaign(null);
                }}
                className="px-5 py-2 border border-slate-200 hover:bg-slate-100 font-semibold rounded-xl text-xs transition-all cursor-pointer text-slate-700 bg-white"
              >
                Close Info Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in text-slate-800">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl p-6 relative animate-scale-up">
            <button 
              onClick={() => {
                setShowTestModal(false);
                setTestCampaignId(null);
                setTestRecipientEmail("");
              }}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-800">Send Test Email</h3>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                Test the email layout and delivery using your active AWS SES connection. The subject line will be prefixed with <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">[TEST]</code>.
              </p>

              <form onSubmit={handleSendCampaignTest} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Recipient Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. you@example.com"
                    value={testRecipientEmail}
                    onChange={(e) => setTestRecipientEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                    style={{ color: "#0f172a" }}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTestModal(false);
                      setTestCampaignId(null);
                      setTestRecipientEmail("");
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 font-semibold rounded-xl text-xs transition-colors cursor-pointer text-slate-600 bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingTest}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    {sendingTest ? (
                      <>
                        <Clock className="h-3 w-3 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3" /> Send Test
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Rerun Campaign Modal */}
      {showRerunModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in text-slate-800">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl p-6 relative animate-scale-up">
            <button 
              onClick={() => {
                setShowRerunModal(false);
                setRerunCampaignId(null);
                setRerunCampaignName("");
              }}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-800">Rerun Campaign</h3>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                You are about to duplicate and rerun the campaign <span className="font-semibold text-slate-700">"{rerunCampaignName}"</span>. Choose when to dispatch the copied campaign below.
              </p>

              <form onSubmit={handleRerunSubmit} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 block">Dispatch Schedule</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRerunScheduleType("immediate")}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer text-center transition-all ${
                        rerunScheduleType === "immediate"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Send Immediately
                    </button>
                    <button
                      type="button"
                      onClick={() => setRerunScheduleType("scheduled")}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer text-center transition-all ${
                        rerunScheduleType === "scheduled"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Schedule for Later
                    </button>
                  </div>
                </div>

                {rerunScheduleType === "scheduled" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Scheduled Date &amp; Time *</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="datetime-local"
                        required
                        value={rerunScheduledAt}
                        onChange={(e) => setRerunScheduledAt(e.target.value)}
                        className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-slate-800"
                        style={{ color: "#0f172a" }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!rerunScheduledAt) return;
                          showNotification(`Campaign scheduled for ${new Date(rerunScheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`, "success");
                        }}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm shrink-0"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRerunModal(false);
                      setRerunCampaignId(null);
                      setRerunCampaignName("");
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 font-semibold rounded-xl text-xs transition-colors cursor-pointer text-slate-600 bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rerunning}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    {rerunning ? (
                      <>
                        <Clock className="h-3 w-3 animate-spin" /> Launching...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3 w-3" /> Run Campaign
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Test WhatsApp Modal */}
      {testWhatsappCampaign && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in text-slate-800">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl p-6 relative animate-scale-up">
            <button 
              onClick={() => {
                setTestWhatsappCampaign(null);
                setTestPhone("");
              }}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-800">Send Test WhatsApp</h3>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                Test the WhatsApp delivery using your MSG91 WhatsApp integration. This will send the approved template <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-600">"{testWhatsappCampaign.whatsapp_template}"</code>.
              </p>

              <form onSubmit={handleSendWhatsappTest} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Recipient Phone (with country code)</label>
                  <input
                    type="tel"
                    required
                    autoFocus
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTestWhatsappCampaign(null);
                      setTestPhone("");
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-55 font-semibold rounded-xl text-xs transition-colors cursor-pointer text-slate-600 bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingWhatsappTest}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    {sendingWhatsappTest ? (
                      <>
                        <Clock className="h-3 w-3 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-3 w-3" /> Send Test
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
