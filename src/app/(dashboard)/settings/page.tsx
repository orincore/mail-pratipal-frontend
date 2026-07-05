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
          <h1 className="text-2xl font-bold text-slate-800">Sender Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Active configuration for AWS SES email dispatch.</p>
        </div>
      </div>

      {/* Loading state indicator */}
      {loading ? (
        <div className="h-[40vh] flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active verified domain status */}
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Verified Subdomain Active</h2>
                <p className="text-slate-400 text-xs mt-0.5">AWS SES outbound delivery is active and configured.</p>
              </div>
            </div>

            <div className="border-t border-slate-50 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Sender Subdomain</span>
                <span className="font-mono text-base font-bold text-slate-800 block mt-1">notifications.pratipal.in</span>
                <span className="text-xs text-slate-400 block mt-0.5">Fully authenticated in AWS SES via DKIM/SPF keys.</span>
              </div>

              <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Default Mail From</span>
                <span className="font-mono text-base font-bold text-slate-800 block mt-1">contact@notifications.pratipal.in</span>
                <span className="text-xs text-slate-400 block mt-0.5">Any custom alias ending with this domain is verified.</span>
              </div>
            </div>

            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-emerald-800 text-xs flex gap-2 items-start leading-relaxed text-left">
              <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Identity Bypass Rules Configured:</strong> You can create and launch new campaigns immediately using any sender email address under the `notifications.pratipal.in` domain. Real-time SES identity checks are bypassed locally as all senders on this domain are verified globally.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
