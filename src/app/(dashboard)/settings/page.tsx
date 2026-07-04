"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, 
  Mail, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  RefreshCw, 
  HelpCircle,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronDown
} from "lucide-react";

interface DomainRecord {
  id: string;
  domain: string;
  verification_token: string;
  verification_status: "pending" | "verified" | "failed";
  dkim_tokens: string[];
  dkim_status: "pending" | "verified" | "failed";
}

interface SenderRecord {
  id: string;
  email: string;
  verification_status: "pending" | "verified" | "failed";
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"domains" | "senders">("domains");
  
  // Data lists states
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [senders, setSenders] = useState<SenderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Actions states
  const [newDomain, setNewDomain] = useState("");
  const [newSender, setNewSender] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [addingSender, setAddingSender] = useState(false);
  const [domainError, setDomainError] = useState("");
  const [senderError, setSenderError] = useState("");

  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    showNotification(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const fetchDomains = async () => {
    try {
      const res = await fetch("/api/domains");
      if (res.ok) {
        const data = await res.json();
        setDomains(data || []);
      }
    } catch {
      showNotification("Failed to fetch domains", "error");
    }
  };

  const fetchSenders = async () => {
    try {
      const res = await fetch("/api/senders");
      if (res.ok) {
        const data = await res.json();
        setSenders(data || []);
      }
    } catch {
      showNotification("Failed to fetch sender email list", "error");
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchDomains(), fetchSenders()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Handle Domain Creation
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setDomainError("");
    if (!newDomain) return;

    setAddingDomain(true);
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Domain added successfully");
        setNewDomain("");
        fetchDomains();
      } else {
        setDomainError(data.error || "Failed to add domain");
      }
    } catch {
      setDomainError("Network error. Please try again.");
    } finally {
      setAddingDomain(false);
    }
  };

  // Handle Sender Email verification trigger
  const handleAddSender = async (e: React.FormEvent) => {
    e.preventDefault();
    setSenderError("");
    if (!newSender) return;

    setAddingSender(true);
    try {
      const res = await fetch("/api/senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newSender }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Verification email dispatched. Please check your inbox!");
        setNewSender("");
        fetchSenders();
      } else {
        setSenderError(data.error || "Failed to add sender email");
      }
    } catch {
      setSenderError("Network error. Please try again.");
    } finally {
      setAddingSender(false);
    }
  };

  // Delete Domain
  const handleDeleteDomain = async (id: string, domainName: string) => {
    if (!confirm(`Are you sure you want to delete the domain ${domainName}? This stops campaign sends from this domain.`)) return;
    try {
      const res = await fetch(`/api/domains?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showNotification("Domain deleted");
        fetchDomains();
      } else {
        showNotification("Failed to delete domain", "error");
      }
    } catch {
      showNotification("Network error", "error");
    }
  };

  // Delete Sender Email
  const handleDeleteSender = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete sender identity ${email}?`)) return;
    try {
      const res = await fetch(`/api/senders?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showNotification("Sender identity deleted");
        fetchSenders();
      } else {
        showNotification("Failed to delete identity", "error");
      }
    } catch {
      showNotification("Network error", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notification && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-sm flex items-center gap-2 animate-bounce ${
          notification.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          {notification.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sender Verification Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Configure DKIM keys, SPF policies, and verify sending email identities.</p>
        </div>
        <div>
          <button
            onClick={fetchAllData}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-all cursor-pointer bg-white"
          >
            <RefreshCw className="h-4 w-4" /> Sync Statuses
          </button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("domains")}
          className={`pb-3 font-semibold text-sm transition-all cursor-pointer relative ${
            activeTab === "domains" ? "text-emerald-600 font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Sending Domains
          {activeTab === "domains" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab("senders")}
          className={`pb-3 font-semibold text-sm transition-all cursor-pointer relative ${
            activeTab === "senders" ? "text-emerald-600 font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Sender Identities
          {activeTab === "senders" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />}
        </button>
      </div>

      {/* Loading state indicator */}
      {loading ? (
        <div className="h-[40vh] flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : activeTab === "domains" ? (
        /* DOMAINS TAB WORKSPACE */
        <div className="space-y-6">
          {/* Add Domain Card Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-emerald-600" /> Verify New Custom Domain
            </h2>
            <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  required
                  pattern="^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$"
                  placeholder="e.g. mail.pratipal.in"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                {domainError && <p className="text-xs text-rose-600 mt-1.5 font-medium">{domainError}</p>}
              </div>
              <button
                type="submit"
                disabled={addingDomain}
                className="inline-flex justify-center items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="h-4.5 w-4.5" /> {addingDomain ? "Adding..." : "Add Domain"}
              </button>
            </form>
          </div>

          {/* Domains Listings */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h2 className="text-base font-bold text-slate-800">Sending Domain List</h2>
            </div>
            
            {domains.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No sending domains registered yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {domains.map((dom) => (
                  <div key={dom.id} className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800 text-base">{dom.domain}</span>
                        
                        {/* Domain validation state badges */}
                        <div className="flex gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            dom.verification_status === "verified" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                            "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}>
                            SPF: {dom.verification_status}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            dom.dkim_status === "verified" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                            "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}>
                            DKIM: {dom.dkim_status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedDomain(expandedDomain === dom.id ? null : dom.id)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border border-slate-150"
                        >
                          DNS Keys <ChevronDown className={`h-4 w-4 transition-transform ${expandedDomain === dom.id ? "rotate-180" : ""}`} />
                        </button>
                        <button
                          onClick={() => handleDeleteDomain(dom.id, dom.domain)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all inline-flex cursor-pointer"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Domain Verification TXT & CNAME Keys Panel */}
                    {expandedDomain === dom.id && (
                      <div className="p-5 bg-slate-50 rounded-xl space-y-4 border border-slate-200/60 animate-fade-in text-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-700">How to verify your domain</p>
                          <p className="text-slate-500">Add the following DNS records to your domain provider (GoDaddy, Cloudflare, Namecheap, etc.) to complete verification:</p>
                        </div>

                        {/* TXT Verification Record */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                          <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">TXT Record (Domain Verification)</span>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div>
                              <p className="text-slate-400 font-semibold">Type</p>
                              <p className="font-bold text-slate-800 mt-0.5">TXT</p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-semibold">Host / Name</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-slate-700 font-semibold">_amazonses.{dom.domain}</span>
                                <button onClick={() => copyToClipboard(`_amazonses.${dom.domain}`, "Host")} className="text-emerald-600 hover:text-emerald-700 p-0.5 cursor-pointer">
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div>
                              <p className="text-slate-400 font-semibold">Value / Target</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-slate-700 font-semibold truncate max-w-[200px]">{dom.verification_token}</span>
                                <button onClick={() => copyToClipboard(dom.verification_token, "TXT Token")} className="text-emerald-600 hover:text-emerald-700 p-0.5 cursor-pointer">
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Easy DKIM CNAME Records */}
                        {dom.dkim_tokens && dom.dkim_tokens.length > 0 && (
                          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                            <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">CNAME Records (Easy DKIM Email Signing)</span>
                            <div className="divide-y divide-slate-100 space-y-3">
                              {dom.dkim_tokens.map((token, idx) => {
                                const host = `${token}._domainkey.${dom.domain}`;
                                const value = `${token}.dkim.amazonses.com`;
                                return (
                                  <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-3 first:pt-0">
                                    <div>
                                      <p className="text-slate-400 font-semibold">Type</p>
                                      <p className="font-bold text-slate-800 mt-0.5">CNAME</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-400 font-semibold">Host / Name</p>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="font-mono text-slate-700 font-semibold truncate max-w-[200px]">{host}</span>
                                        <button onClick={() => copyToClipboard(host, `CNAME Host ${idx + 1}`)} className="text-emerald-600 hover:text-emerald-700 p-0.5 cursor-pointer">
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-slate-400 font-semibold">Value / Target</p>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="font-mono text-slate-700 font-semibold truncate max-w-[200px]">{value}</span>
                                        <button onClick={() => copyToClipboard(value, `CNAME Value ${idx + 1}`)} className="text-emerald-600 hover:text-emerald-700 p-0.5 cursor-pointer">
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SENDER IDENTITIES TAB WORKSPACE */
        <div className="space-y-6">
          {/* Add Sender Email Card Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-emerald-600" /> Verify Sender Email Address
            </h2>
            <form onSubmit={handleAddSender} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="email"
                  required
                  placeholder="e.g. support@pratipal.in"
                  value={newSender}
                  onChange={(e) => setNewSender(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                {senderError && <p className="text-xs text-rose-600 mt-1.5 font-medium">{senderError}</p>}
              </div>
              <button
                type="submit"
                disabled={addingSender}
                className="inline-flex justify-center items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="h-4.5 w-4.5" /> {addingSender ? "Adding..." : "Add Sender Email"}
              </button>
            </form>
          </div>

          {/* Senders Table List */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h2 className="text-base font-bold text-slate-800">Sender Email Identities</h2>
            </div>
            
            {senders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No email sender identities configured yet.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-6">Email Address</th>
                    <th className="py-3 px-4">Verification Status</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {senders.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-semibold text-slate-800">{s.email}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          s.verification_status === "verified" 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                            : "bg-amber-50 text-amber-600 border-amber-100"
                        }`}>
                          {s.verification_status === "verified" ? (
                            <>
                              <Check className="h-3 w-3" /> Verified
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 animate-spin" /> Pending Click
                            </>
                          )}
                        </span>
                        {s.verification_status !== "verified" && (
                          <span className="text-[10px] text-slate-400 block mt-1">AWS has sent verification email. Follow instructions in mail to verify.</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDeleteSender(s.id, s.email)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all inline-flex cursor-pointer"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
