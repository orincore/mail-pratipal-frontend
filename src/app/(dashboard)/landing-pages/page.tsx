"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Globe,
  Clock,
  Copy,
  Search,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  X
} from "lucide-react";

interface DynamicLandingPage {
  id: string;
  title: string;
  slug: string;
  status: string;
  theme: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export default function LandingPagesListPage() {
  const [pages, setPages] = useState<DynamicLandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<DynamicLandingPage | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Operation States
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Notification State
  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3000";

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  async function loadPages() {
    try {
      const res = await fetch("/api/landing-pages");
      if (!res.ok) {
        throw new Error("Failed to load landing pages");
      }
      const data = await res.json();
      setPages(data.pages ?? []);
    } catch (err: any) {
      showNotification(err.message || "Failed to load landing pages", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPages();
  }, []);

  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    const q = searchQuery.toLowerCase();
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
    );
  }, [pages, searchQuery]);

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);

    const slug = newSlug.trim() || generateSlug(newTitle);

    try {
      const res = await fetch("/api/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          slug,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create page");
      }

      const data = await res.json();
      showNotification("Landing page created successfully!");
      setCreateModalOpen(false);
      setNewTitle("");
      setNewSlug("");
      loadPages();
      
      // Open editor in new window
      window.open(`${mainAppUrl}/admin/landing-pages/${data.page.id}/edit`, "_blank");
    } catch (err: any) {
      showNotification(err.message || "Failed to create page", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDuplicate(page: DynamicLandingPage) {
    setDuplicatingId(page.id);
    try {
      const res = await fetch(`/api/landing-pages/${page.id}/duplicate`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to duplicate page");
      }

      const data = await res.json();
      showNotification(`Page duplicated as "${data.page.title}"`);
      loadPages();
    } catch (err: any) {
      showNotification(err.message || "Failed to duplicate page", "error");
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!pageToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/landing-pages/${pageToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete page");
      }

      showNotification("Page deleted successfully!");
      setDeleteModalOpen(false);
      setPageToDelete(null);
      loadPages();
    } catch (err: any) {
      showNotification(err.message || "Failed to delete page", "error");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleStatus(page: DynamicLandingPage) {
    setTogglingId(page.id);
    const newStatus = page.status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/landing-pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update status");
      }

      showNotification(
        newStatus === "published" ? "Page published successfully!" : "Page unpublished to drafts."
      );
      loadPages();
    } catch (err: any) {
      showNotification(err.message || "Failed to update status", "error");
    } finally {
      setTogglingId(null);
    }
  }

  const publishedCount = pages.filter((p) => p.status === "published").length;
  const draftCount = pages.filter((p) => p.status !== "published").length;

  return (
    <div className="space-y-6 text-left">
      {/* Notifications Toast */}
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-cormorant">Landing Pages</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create and manage dynamic landing pages
          </p>
        </div>
        <button 
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" /> New Page
        </button>
      </div>

      {/* Stats and Search Bar */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-6 w-6 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : pages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 shadow-sm text-center flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-5">
            <FileText className="h-8 w-8 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No landing pages yet</h3>
          <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
            Create your first dynamic landing page with our visual editor
          </p>
          <button 
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create Your First Page
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span>
                <span className="font-semibold text-gray-900">{pages.length}</span> total
              </span>
              <span className="text-gray-300">|</span>
              <span>
                <span className="font-semibold text-green-600">{publishedCount}</span> published
              </span>
              <span className="text-gray-300">|</span>
              <span>
                <span className="font-semibold text-amber-600">{draftCount}</span> drafts
              </span>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
              />
            </div>
          </div>

          {filteredPages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 shadow-sm text-center flex flex-col items-center">
              <Search className="h-10 w-10 text-gray-300 mb-3" />
              <h3 className="text-base font-medium text-gray-700 mb-1">No pages found</h3>
              <p className="text-sm text-gray-400">Try a different search term</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPages.map((page) => (
                <div
                  key={page.id}
                  className="bg-white rounded-2xl border border-gray-200 hover:border-violet-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group"
                >
                  {/* Color strip at top */}
                  <div
                    className="h-1.5 w-full"
                    style={{
                      background: page.theme
                        ? `linear-gradient(90deg, ${page.theme.primary || "#6366f1"}, ${page.theme.accent || "#8b5cf6"})`
                        : "linear-gradient(90deg, #6366f1, #8b5cf6)",
                    }}
                  />

                  <div className="p-5 space-y-4 flex-1">
                    {/* Title + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate text-[15px] leading-tight">
                          {page.title}
                        </h3>
                        <p className="text-xs text-gray-400 font-mono mt-1 truncate">
                          /{page.slug}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleStatus(page)}
                        disabled={togglingId === page.id}
                        className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border inline-flex items-center cursor-pointer transition-all ${
                          page.status === "published"
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        {page.status === "published" ? (
                          <>
                            <Globe className="h-3 w-3 mr-1" /> Live
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" /> Draft
                          </>
                        )}
                      </button>
                    </div>

                    {/* Theme colors + Date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {page.theme &&
                          Object.values(page.theme)
                            .slice(0, 4)
                            .map((color, i) => (
                              <div
                                key={i}
                                className="h-5 w-5 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {new Date(page.created_at || page.updated_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Actions Row */}
                    <div className="flex gap-1.5 pt-1">
                      <a
                        href={`${mainAppUrl}/admin/landing-pages/${page.id}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 h-9 px-3 border border-gray-200 hover:bg-violet-50 hover:text-violet-75 hover:border-violet-200 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </a>

                      <button
                        className="h-9 px-3 border border-gray-200 hover:bg-blue-50 hover:text-blue-75 hover:border-blue-200 disabled:opacity-50 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition-all text-slate-700"
                        onClick={() => handleDuplicate(page)}
                        disabled={duplicatingId === page.id}
                        title="Duplicate page"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        {duplicatingId === page.id ? "..." : "Duplicate"}
                      </button>

                      {page.status === "published" && (
                        <a
                          href={`${mainAppUrl}/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 w-9 border border-gray-200 hover:bg-slate-50 rounded-lg inline-flex items-center justify-center text-gray-500 hover:text-slate-800 transition-all"
                          title="View live page"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}

                      <button
                        onClick={() => {
                          setPageToDelete(page);
                          setDeleteModalOpen(true);
                        }}
                        className="h-9 w-9 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 inline-flex items-center justify-center cursor-pointer transition-all"
                        title="Delete page"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Landing Page Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full overflow-hidden animate-fadeIn text-left">
            <div className="p-6 border-b border-slate-55 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base">Create Landing Page</h3>
              <button 
                onClick={() => setCreateModalOpen(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-650 rounded-lg transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Page Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Salt Magic Webinar"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    setNewSlug(generateSlug(e.target.value));
                  }}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">URL Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 font-mono font-bold">/</span>
                  <input
                    type="text"
                    required
                    placeholder="salt-magic-webinar"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    className="w-full font-mono border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  URL will be auto-incremented if it already exists (e.g. -1, -2, -3)
                </p>
              </div>
              <button
                type="submit"
                disabled={creating || !newTitle.trim()}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-750 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer"
              >
                {creating ? "Creating..." : "Create & Open Editor"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteModalOpen && pageToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden animate-fadeIn p-6 text-left space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Delete Page</h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Are you absolutely sure you want to delete **"{pageToDelete.title}"**? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setPageToDelete(null);
                }}
                disabled={deleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Page"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
