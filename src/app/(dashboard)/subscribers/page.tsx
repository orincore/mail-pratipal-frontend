"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Search, 
  Upload, 
  Download, 
  Trash2, 
  Edit3, 
  Filter, 
  Tag, 
  FolderPlus,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw
} from "lucide-react";
import Papa from "papaparse";

interface Subscriber {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  whatsapp_number?: string;
  status: string;
  lists: string[];
  tags: string[];
  created_at: string;
}

export default function SubscribersPage() {
  // Lists and stats states
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [lists, setLists] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [search, setSearch] = useState("");
  const [selectedList, setSelectedList] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null);

  // Form states
  const [formEmail, setFormEmail] = useState("");
  const [formWhatsappNumber, setFormWhatsappNumber] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formStatus, setFormStatus] = useState("subscribed");
  const [formListsText, setFormListsText] = useState("");
  const [formTagsText, setFormTagsText] = useState("");
  const [formError, setFormError] = useState("");

  // Import CSV states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [importListsText, setImportListsText] = useState("");
  const [importTagsText, setImportTagsText] = useState("");
  const [importProgress, setImportProgress] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [importSummary, setImportSummary] = useState({ total: 0, imported: 0 });

  // Customer syncing state
  const [syncing, setSyncing] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.append("search", search);
      if (selectedList) query.append("list", selectedList);
      if (selectedTag) query.append("tag", selectedTag);
      if (selectedStatus) query.append("status", selectedStatus);

      const res = await fetch(`/api/subscribers?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data.subscribers || []);
        setLists(data.lists || []);
        setTags(data.tags || []);
      }
    } catch {
      showNotification("Failed to fetch subscribers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, [search, selectedList, selectedTag, selectedStatus]);

  // Handle Add/Edit submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formEmail && !formWhatsappNumber) {
      setFormError("Either Email or WhatsApp number is required");
      return;
    }

    const payload = {
      email: formEmail || undefined,
      whatsapp_number: formWhatsappNumber || undefined,
      first_name: formFirstName,
      last_name: formLastName,
      status: formStatus,
      lists: formListsText.split(",").map(l => l.trim()).filter(Boolean),
      tags: formTagsText.split(",").map(t => t.trim()).filter(Boolean),
    };

    try {
      const isEdit = !!editingSubscriber;
      const url = "/api/subscribers";
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit ? { id: editingSubscriber.id, ...payload } : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        showNotification(isEdit ? "Subscriber updated" : "Subscriber added successfully");
        setShowAddModal(false);
        setEditingSubscriber(null);
        resetForm();
        fetchSubscribers();
      } else {
        setFormError(data.error || "An error occurred");
      }
    } catch {
      setFormError("Network error. Please try again.");
    }
  };

  // Open Edit Modal
  const openEditModal = (sub: Subscriber) => {
    setEditingSubscriber(sub);
    setFormEmail(sub.email || "");
    setFormWhatsappNumber(sub.whatsapp_number || "");
    setFormFirstName(sub.first_name || "");
    setFormLastName(sub.last_name || "");
    setFormStatus(sub.status);
    setFormListsText(sub.lists.join(", "));
    setFormTagsText(sub.tags.join(", "));
    setShowAddModal(true);
  };

  // Delete Subscriber
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subscriber?")) return;

    try {
      const res = await fetch(`/api/subscribers?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showNotification("Subscriber deleted");
        fetchSubscribers();
      } else {
        showNotification("Failed to delete subscriber", "error");
      }
    } catch {
      showNotification("Network error", "error");
    }
  };

  // Process CSV File upload
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportProgress("idle");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        showNotification(`Parsed ${results.data.length} subscriber rows from CSV`);
      },
      error: () => {
        showNotification("Failed to parse CSV file", "error");
      }
    });
  };

  const handleImportSubmit = async () => {
    if (csvData.length === 0) {
      showNotification("Please upload a valid CSV first", "error");
      return;
    }

    setImportProgress("uploading");
    try {
      const res = await fetch("/api/subscribers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscribers: csvData,
          defaultLists: importListsText.split(",").map(l => l.trim()).filter(Boolean),
          defaultTags: importTagsText.split(",").map(t => t.trim()).filter(Boolean),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setImportProgress("success");
        setImportSummary({ total: csvData.length, imported: data.importedCount });
        showNotification(`Successfully imported ${data.importedCount} subscribers`);
        fetchSubscribers();
      } else {
        setImportProgress("error");
      }
    } catch {
      setImportProgress("error");
    }
  };

  const resetForm = () => {
    setFormEmail("");
    setFormWhatsappNumber("");
    setFormFirstName("");
    setFormLastName("");
    setFormStatus("subscribed");
    setFormListsText("");
    setFormTagsText("");
    setFormError("");
  };

  // Export current list to CSV
  const handleExportCsv = () => {
    if (subscribers.length === 0) {
      showNotification("No subscribers to export", "error");
      return;
    }

    const csvRows = subscribers.map((sub) => ({
      Email: sub.email,
      "First Name": sub.first_name || "",
      "Last Name": sub.last_name || "",
      Status: sub.status,
      Lists: sub.lists.join(";"),
      Tags: sub.tags.join(";"),
      "Created At": new Date(sub.created_at).toLocaleDateString(),
    }));

    const csvString = Papa.unparse(csvRows);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `subscribers_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sync Storefront Customers
  const handleSyncCustomers = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/subscribers/sync-customers", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message || `Synced ${data.syncedCount} customers successfully!`);
        fetchSubscribers();
      } else {
        showNotification(data.error || "Failed to sync customers", "error");
      }
    } catch {
      showNotification("Network error. Please try again.", "error");
    } finally {
      setSyncing(false);
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

      {/* Title & Panel Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Subscriber Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage, tag, segment and import contacts.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              setEditingSubscriber(null);
              resetForm();
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm shadow-emerald-600/10"
          >
            <Plus className="h-4.5 w-4.5" /> Add Subscriber
          </button>
          <button
            onClick={() => {
              setCsvData([]);
              setImportProgress("idle");
              setShowImportModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all cursor-pointer"
          >
            <Upload className="h-4.5 w-4.5" /> Import CSV
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-all cursor-pointer bg-white"
          >
            <Download className="h-4.5 w-4.5" /> Export List
          </button>
          <button
            onClick={handleSyncCustomers}
            disabled={syncing || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "Syncing..." : "Sync Customers"}
          </button>
        </div>
      </div>

      {/* Query Filters Dashboard */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-slate-800"
              style={{ color: "#0f172a" }}
            />
          </div>

          {/* List Selector */}
          <div className="relative">
            <Filter className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
            <select
              value={selectedList}
              onChange={(e) => setSelectedList(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 appearance-none bg-white text-slate-800"
              style={{ color: "#0f172a" }}
            >
              <option value="" style={{ color: "#0f172a" }}>All Lists</option>
              {lists.map((l) => (
                <option key={l} value={l} style={{ color: "#0f172a" }}>{l}</option>
              ))}
            </select>
          </div>

          {/* Tag Selector */}
          <div className="relative">
            <Tag className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 appearance-none bg-white text-slate-800"
              style={{ color: "#0f172a" }}
            >
              <option value="" style={{ color: "#0f172a" }}>All Tags</option>
              {tags.map((t) => (
                <option key={t} value={t} style={{ color: "#0f172a" }}>{t}</option>
              ))}
            </select>
          </div>

          {/* Status Selector */}
          <div className="relative">
            <AlertCircle className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 appearance-none bg-white text-slate-800"
              style={{ color: "#0f172a" }}
            >
              <option value="" style={{ color: "#0f172a" }}>All Statuses</option>
              <option value="subscribed" style={{ color: "#0f172a" }}>Subscribed</option>
              <option value="unsubscribed" style={{ color: "#0f172a" }}>Unsubscribed</option>
              <option value="bounced" style={{ color: "#0f172a" }}>Bounced</option>
              <option value="complained" style={{ color: "#0f172a" }}>Complained</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subscribers Table List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-6">Name & Email</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Lists</th>
                <th className="py-3 px-4">Tags</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="h-8 w-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No contacts match the filter criteria.
                  </td>
                </tr>
              ) : (
                subscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800">
                        {sub.first_name ? `${sub.first_name} ${sub.last_name || ""}` : "—"}
                      </div>
                      {sub.email && <div className="text-slate-400 text-xs mt-0.5">{sub.email}</div>}
                      {sub.whatsapp_number && (
                        <div className="text-slate-400 text-[11px] font-mono mt-0.5 flex items-center gap-1">
                          <span className="bg-emerald-50 text-emerald-700 px-1 py-0.25 rounded text-[9px] font-bold uppercase tracking-wide">WA</span>
                          <span>{sub.whatsapp_number}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        sub.status === "subscribed" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        sub.status === "unsubscribed" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                        "bg-rose-50 text-rose-600 border border-rose-100"
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 max-w-[150px] truncate">
                      <div className="flex flex-wrap gap-1">
                        {sub.lists.length === 0 ? <span className="text-slate-400 text-xs">—</span> : 
                          sub.lists.map(l => (
                            <span key={l} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">{l}</span>
                          ))
                        }
                      </div>
                    </td>
                    <td className="py-4 px-4 max-w-[150px] truncate">
                      <div className="flex flex-wrap gap-1">
                        {sub.tags.length === 0 ? <span className="text-slate-400 text-xs">—</span> : 
                          sub.tags.map(t => (
                            <span key={t} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold">{t}</span>
                          ))
                        }
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-mono text-xs">
                      {new Date(sub.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </td>
                    <td className="py-4 px-6 text-right space-x-1.5">
                      <button
                        onClick={() => openEditModal(sub)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition-all inline-flex cursor-pointer"
                        title="Edit subscriber"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-all inline-flex cursor-pointer"
                        title="Delete subscriber"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manually Add / Edit Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-slate-100 shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {editingSubscriber ? "Edit Subscriber Info" : "Create New Subscriber"}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                    style={{ color: "#0f172a" }}
                    placeholder="name@domain.com"
                    disabled={!!editingSubscriber}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">WhatsApp Number</label>
                  <input
                    type="text"
                    value={formWhatsappNumber}
                    onChange={(e) => setFormWhatsappNumber(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                    style={{ color: "#0f172a" }}
                    placeholder="919876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">First Name</label>
                  <input
                    type="text"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                    style={{ color: "#0f172a" }}
                    placeholder="Jane"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Last Name</label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                    style={{ color: "#0f172a" }}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Subscription Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  style={{ color: "#0f172a" }}
                >
                  <option value="subscribed" style={{ color: "#0f172a" }}>Subscribed</option>
                  <option value="unsubscribed" style={{ color: "#0f172a" }}>Unsubscribed</option>
                  <option value="pending" style={{ color: "#0f172a" }}>Pending Opt-In</option>
                  <option value="bounced" style={{ color: "#0f172a" }}>Bounced</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Lists (comma separated)</label>
                <input
                  type="text"
                  value={formListsText}
                  onChange={(e) => setFormListsText(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  style={{ color: "#0f172a" }}
                  placeholder="Newsletter, Webinar Confirmations"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Tags (comma separated)</label>
                <input
                  type="text"
                  value={formTagsText}
                  onChange={(e) => setFormTagsText(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  style={{ color: "#0f172a" }}
                  placeholder="Webinar-04, Essential-Oils"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4.5 py-2.5 border border-slate-200 hover:bg-slate-50 font-semibold rounded-xl text-sm transition-all cursor-pointer text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm shadow-emerald-600/10"
                >
                  {editingSubscriber ? "Save Changes" : "Save Subscriber"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal Overlay */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden border border-slate-100 shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-800">Import Contacts via CSV</h2>
              </div>
              <button onClick={() => setShowImportModal(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {importProgress === "idle" && (
                <div className="space-y-4">
                  {/* File Upload Box */}
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 hover:border-emerald-500/50 transition-all flex flex-col items-center justify-center gap-3">
                    <div className="p-3 bg-white shadow-sm rounded-xl text-slate-400">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Choose CSV File to Import</p>
                      <p className="text-slate-400 text-xs mt-1">First row should contain headers (email, first_name, last_name)</p>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                    >
                      Browse Files
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleCsvUpload}
                      accept=".csv"
                      className="hidden"
                    />
                  </div>

                  {csvData.length > 0 && (
                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2">
                      <p className="text-xs font-semibold text-emerald-800">CSV Loaded Successfully:</p>
                      <p className="text-slate-600 text-xs">
                        Found <span className="font-bold text-emerald-700">{csvData.length}</span> rows ready to process.
                      </p>
                    </div>
                  )}

                  {/* Settings for Default Fields */}
                  <div className="grid grid-cols-1 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <FolderPlus className="h-3.5 w-3.5 text-slate-400" /> Apply to Lists (comma separated)
                      </label>
                      <input
                        type="text"
                        value={importListsText}
                        onChange={(e) => setImportListsText(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        placeholder="e.g. Newsletter, Webinar-Attendees"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-slate-400" /> Apply tags (comma separated)
                      </label>
                      <input
                        type="text"
                        value={importTagsText}
                        onChange={(e) => setImportTagsText(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        placeholder="e.g. Imported-04-Jul, Active"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="px-4.5 py-2.5 border border-slate-200 hover:bg-slate-50 font-semibold rounded-xl text-sm transition-all cursor-pointer text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImportSubmit}
                      disabled={csvData.length === 0}
                      className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 shadow-sm shadow-emerald-600/10"
                    >
                      Start Import
                    </button>
                  </div>
                </div>
              )}

              {importProgress === "uploading" && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="h-12 w-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
                  <p className="text-slate-600 font-semibold text-sm animate-pulse">Uploading and upserting contacts...</p>
                </div>
              )}

              {importProgress === "success" && (
                <div className="text-center space-y-5 py-6">
                  <div className="inline-flex p-3.5 bg-emerald-50 text-emerald-600 rounded-full ring-4 ring-emerald-50/50">
                    <CheckCircle className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Import Complete!</h3>
                    <p className="text-slate-500 text-sm mt-2 leading-relaxed max-w-sm mx-auto">
                      We've successfully updated <span className="font-semibold text-slate-700">{importSummary.imported}</span> subscriber records inside MongoDB.
                    </p>
                  </div>
                  <div className="pt-4">
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="px-6 py-2.5 bg-slate-800 text-white font-semibold rounded-xl text-sm hover:bg-slate-700 transition-all cursor-pointer"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              )}

              {importProgress === "error" && (
                <div className="text-center space-y-5 py-6">
                  <div className="inline-flex p-3.5 bg-rose-50 text-rose-600 rounded-full ring-4 ring-rose-50/50">
                    <AlertCircle className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Import Failed</h3>
                    <p className="text-slate-500 text-sm mt-2">
                      An error occurred during database writing. Check CSV structures.
                    </p>
                  </div>
                  <div className="pt-4 flex justify-center gap-2">
                    <button
                      onClick={() => setImportProgress("idle")}
                      className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-all cursor-pointer"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="px-5 py-2.5 bg-slate-800 text-white font-semibold rounded-xl text-sm hover:bg-slate-700 transition-all cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
