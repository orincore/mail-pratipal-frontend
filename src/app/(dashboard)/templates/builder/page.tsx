"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Smartphone,
  Monitor,
  Code,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Send,
  X,
  Undo,
  Redo,
  FileCode,
  FileText,
} from "lucide-react";
import { useRole } from "../../RoleProvider";
import { BRAND_NAME, BRAND_WEBSITE_URL, BRAND_SUPPORT_EMAIL } from "@/lib/branding";
import BlockEditor from "./BlockEditor";
import { type EmailDesign, renderBlocksToHtml, starterDesign, isValidDesign } from "./blocks";

function BuilderContent() {
  const { canWrite } = useRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("id");

  // State definitions
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [templateType, setTemplateType] = useState<"html" | "text">("html");
  const [editorMode, setEditorMode] = useState<"html" | "visual">("visual"); // Default to visual (block builder)
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Block builder state
  const [design, setDesign] = useState<EmailDesign>(() => starterDesign());

  // Undo/redo — separate stacks for the block builder and the raw HTML editor
  const [designHistory, setDesignHistory] = useState<EmailDesign[]>([]);
  const [designHistoryIndex, setDesignHistoryIndex] = useState(-1);
  const [htmlHistory, setHtmlHistory] = useState<string[]>([]);
  const [htmlHistoryIndex, setHtmlHistoryIndex] = useState(-1);
  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recompute htmlContent from blocks whenever the design changes in visual mode,
  // and debounce a history snapshot so undo/redo tracks meaningful steps rather
  // than every keystroke.
  useEffect(() => {
    if (editorMode !== "visual") return;
    setHtmlContent(renderBlocksToHtml(design));

    if (historyTimer.current) clearTimeout(historyTimer.current);
    historyTimer.current = setTimeout(() => {
      setDesignHistory((prev) => {
        const trimmed = prev.slice(0, designHistoryIndex + 1);
        trimmed.push(design);
        if (trimmed.length > 50) trimmed.shift();
        setDesignHistoryIndex(trimmed.length - 1);
        return trimmed;
      });
    }, 400);
    return () => {
      if (historyTimer.current) clearTimeout(historyTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, editorMode]);

  const handleUndo = () => {
    if (editorMode === "visual") {
      if (designHistoryIndex > 0) {
        const idx = designHistoryIndex - 1;
        setDesignHistoryIndex(idx);
        setDesign(designHistory[idx]);
      }
    } else if (htmlHistoryIndex > 0) {
      const idx = htmlHistoryIndex - 1;
      setHtmlHistoryIndex(idx);
      setHtmlContent(htmlHistory[idx]);
    }
  };

  const handleRedo = () => {
    if (editorMode === "visual") {
      if (designHistoryIndex < designHistory.length - 1) {
        const idx = designHistoryIndex + 1;
        setDesignHistoryIndex(idx);
        setDesign(designHistory[idx]);
      }
    } else if (htmlHistoryIndex < htmlHistory.length - 1) {
      const idx = htmlHistoryIndex + 1;
      setHtmlHistoryIndex(idx);
      setHtmlContent(htmlHistory[idx]);
    }
  };

  const pushHtmlHistory = (content: string) => {
    setHtmlHistory((prev) => {
      if (htmlHistoryIndex >= 0 && prev[htmlHistoryIndex] === content) return prev;
      const trimmed = prev.slice(0, htmlHistoryIndex + 1);
      trimmed.push(content);
      if (trimmed.length > 50) trimmed.shift();
      setHtmlHistoryIndex(trimmed.length - 1);
      return trimmed;
    });
  };

  const canUndo = editorMode === "visual" ? designHistoryIndex > 0 : htmlHistoryIndex > 0;
  const canRedo = editorMode === "visual" ? designHistoryIndex < designHistory.length - 1 : htmlHistoryIndex < htmlHistory.length - 1;

  // Switch between the block builder and raw HTML editing, guarding against
  // silently discarding hand-edited HTML that no longer matches the blocks.
  const switchToVisual = () => {
    const inSync = htmlContent === renderBlocksToHtml(design);
    if (!inSync && !confirm("Switching to the block builder will replace your hand-edited HTML with the block layout. Continue?")) {
      return;
    }
    setEditorMode("visual");
  };

  const switchToHtml = () => {
    pushHtmlHistory(htmlContent);
    setEditorMode("html");
  };

  // Send Test states
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const updateIframeContent = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    const doc = iframe.contentDocument;

    if (!doc.getElementById("email-preview-container")) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { margin: 0; padding: 0; background-color: #f8fafc; }
            </style>
          </head>
          <body>
            <div id="email-preview-container" style="padding: 20px 0;"></div>
          </body>
        </html>
      `);
      doc.close();
    }

    const container = doc.getElementById("email-preview-container");
    if (container) {
      const scrollY = iframe.contentWindow?.scrollY || 0;
      container.innerHTML = htmlContent
        .replaceAll("{{first_name}}", "Jane")
        .replaceAll("{{name}}", "Jane Doe")
        .replaceAll("{{email}}", "jane.doe@example.com")
        .replaceAll("{{company}}", `${BRAND_NAME} Store`)
        .replaceAll("{{webinar}}", "Introduction to Essential Oils masterclass")
        .replaceAll("{{join_link}}", `${BRAND_WEBSITE_URL}/webinar/join/PREVIEW-ID`)
        .replaceAll("{{date}}", new Date().toLocaleDateString("en-IN", { dateStyle: "long" }))
        // Matches real backend behavior: the token is substituted with a
        // bare URL string, not markup (see tracking-parser.ts). It's meant
        // to sit inside an href="{{unsubscribe}}" attribute (that's what
        // the Footer block's "Unsubscribe" link toggle produces) — swapping
        // in a full <a> tag here would nest markup inside an attribute and
        // break the HTML wherever the token is used correctly.
        .replaceAll("{{unsubscribe}}", `${process.env.NEXT_PUBLIC_APP_URL || "https://crm.pratipal.in"}/unsubscribe?email=jane.doe%40example.com&sourceType=campaign&sourceId=PREVIEW`);

      iframe.contentWindow?.scrollTo(0, scrollY);
    }
  };

  useEffect(() => {
    updateIframeContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlContent]);

  // Load existing template if editing
  useEffect(() => {
    if (!templateId) {
      const initial = starterDesign();
      setDesign(initial);
      setDesignHistory([initial]);
      setDesignHistoryIndex(0);
      return;
    }

    const fetchTemplate = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/templates");
        if (res.ok) {
          const templates = await res.json();
          const found = templates.find((t: any) => t.id === templateId);
          if (found) {
            setName(found.name);
            setSubject(found.subject || "");
            setHtmlContent(found.html_content || "");
            setTemplateType(found.type === "text" ? "text" : "html");

            if (isValidDesign(found.design_json)) {
              setDesign(found.design_json);
              setDesignHistory([found.design_json]);
              setDesignHistoryIndex(0);
              setEditorMode("visual");
            } else {
              // Legacy or hand-coded template with no block structure —
              // open it in the raw HTML editor rather than silently
              // rebuilding it from a fresh block layout.
              setHtmlHistory([found.html_content || ""]);
              setHtmlHistoryIndex(0);
              setEditorMode("html");
            }
          } else {
            setError("Template not found");
          }
        }
      } catch {
        setError("Failed to load template");
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [templateId]);

  // Save template handler
  const handleSave = async () => {
    if (!name) {
      showNotification("Please specify a Template Name", "error");
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!templateId;
      const url = "/api/templates";
      const method = isEdit ? "PUT" : "POST";

      // Only persist design_json when the stored HTML still matches what the
      // current block layout would produce — otherwise a hand-edited HTML
      // template would silently snap back to stale blocks next time it's opened.
      const inSyncWithBlocks = templateType === "html" && htmlContent === renderBlocksToHtml(design);
      const design_json = inSyncWithBlocks ? design : null;
      const storedType = templateType === "text" ? "text" : inSyncWithBlocks ? "builder" : "html";

      const body = isEdit
        ? { id: templateId, name, subject, html_content: htmlContent, type: storedType, design_json }
        : { name, subject, html_content: htmlContent, type: storedType, design_json };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        showNotification(isEdit ? "Template saved successfully" : "Template created successfully");
        if (!isEdit && data.template?.id) {
          router.replace(`/templates/builder?id=${data.template.id}`);
        }
      } else {
        showNotification(data.error || "Save operation failed", "error");
      }
    } catch {
      showNotification("Network error occurred", "error");
    } finally {
      setSaving(false);
    }
  };

  // Send Test Email directly via API
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) {
      showNotification("Please enter a recipient email", "error");
      return;
    }

    setSendingTest(true);
    try {
      const res = await fetch("/api/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          subject: subject || `Test Preview: ${name || "Template"}`,
          html: htmlContent,
          fromName: BRAND_NAME,
          fromEmail: BRAND_SUPPORT_EMAIL,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showNotification("Test email sent successfully to your inbox!");
        setShowTestModal(false);
        setTestEmail("");
      } else {
        showNotification(data.error || "Failed to send test email", "error");
      }
    } catch {
      showNotification("Network error occurred while sending test email", "error");
    } finally {
      setSendingTest(false);
    }
  };

  const insertHtmlToken = (token: string) => {
    const textarea = document.getElementById("html-textarea") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newContent = before + token + after;
      setHtmlContent(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + token.length;
      }, 0);
    } else {
      setHtmlContent((prev) => prev + token);
    }
  };

  const variables = [
    { label: "Full Name", token: "{{name}}" },
    { label: "First Name", token: "{{first_name}}" },
    { label: "Email Address", token: "{{email}}" },
    { label: "Company", token: "{{company}}" },
    { label: "Webinar Title", token: "{{webinar}}" },
    { label: "Webinar Join Link", token: "{{join_link}}" },
    { label: "Current Date", token: "{{date}}" },
    { label: "Unsubscribe Link", token: "{{unsubscribe}}" },
  ];

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-slate-500 font-semibold text-sm">Loading template editor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
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

      {/* Editor Top Bar Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center bg-white py-4 px-5 rounded-3xl border border-slate-200 shadow-surface gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/templates")}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer bg-white shrink-0"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-[130px] text-left">
            <h1 className="text-[14px] font-semibold text-slate-900 leading-tight">
              {templateId ? "Edit template" : "New template"}
            </h1>
            {!templateId && (
              <div className="flex items-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => setTemplateType("html")}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                    templateType === "html" ? "bg-emerald-50 text-emerald-700" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <FileCode className="h-3 w-3" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType("text")}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                    templateType === "text" ? "bg-emerald-50 text-emerald-700" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <FileText className="h-3 w-3" /> Plain text
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name *"
            className="w-full border border-slate-200 rounded-full px-4 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
          />
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Default subject line"
            className="w-full border border-slate-200 rounded-full px-4 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
          />
        </div>

        <div className="flex gap-2 items-center justify-end shrink-0">
          {canWrite && (
            <button
              onClick={() => setShowTestModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-full text-[12.5px] transition-all cursor-pointer bg-white"
            >
              <Send className="h-3.5 w-3.5" /> Send test
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !canWrite}
            title={!canWrite ? "Viewers cannot save templates" : undefined}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full text-[12.5px] transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>

      {/* Split Screen Grid Workspaces */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 h-[calc(100vh-190px)]">
        {/* Left Column: Editor */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-surface flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Code className="h-3.5 w-3.5" /> {templateType === "text" ? "Plain text editor" : "Template content"}
              </span>
              <div className="flex items-center gap-3">
                {templateType === "html" && (
                  <div className="flex items-center bg-slate-200/60 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={switchToVisual}
                      className={`px-3 py-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer ${
                        editorMode === "visual" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Block builder
                    </button>
                    <button
                      type="button"
                      onClick={switchToHtml}
                      className={`px-3 py-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer ${
                        editorMode === "html" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      HTML code
                    </button>
                  </div>
                )}

                {templateType === "html" && (
                  <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                    <button
                      type="button"
                      disabled={!canUndo}
                      onClick={handleUndo}
                      className="p-1 hover:bg-slate-200 text-slate-500 disabled:opacity-30 rounded-lg cursor-pointer transition-all"
                      title="Undo"
                    >
                      <Undo className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!canRedo}
                      onClick={handleRedo}
                      className="p-1 hover:bg-slate-200 text-slate-500 disabled:opacity-30 rounded-lg cursor-pointer transition-all"
                      title="Redo"
                    >
                      <Redo className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {templateType === "html" && editorMode === "visual" ? (
              <BlockEditor design={design} onChange={setDesign} />
            ) : templateType === "html" ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-1.5 flex-wrap px-5 py-2.5 border-b border-slate-100 bg-slate-50/40 shrink-0">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mr-1">Insert:</span>
                  {variables.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insertHtmlToken(v.token)}
                      className="px-2 py-0.5 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-600 rounded-md text-[10.5px] font-medium transition-colors cursor-pointer"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <textarea
                  id="html-textarea"
                  value={htmlContent}
                  onChange={(e) => {
                    setHtmlContent(e.target.value);
                  }}
                  onBlur={(e) => pushHtmlHistory(e.target.value)}
                  className="flex-1 w-full p-6 font-mono text-xs focus:outline-none resize-none overflow-y-auto leading-relaxed bg-white border-0"
                  style={{ color: "#000000", backgroundColor: "#ffffff" }}
                  placeholder="<!-- Write your email HTML markup here -->"
                />
              </div>
            ) : (
              <textarea
                id="html-textarea"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="flex-1 w-full p-6 font-mono text-xs focus:outline-none resize-none overflow-y-auto leading-relaxed bg-white border-0"
                style={{ color: "#000000", backgroundColor: "#ffffff" }}
                placeholder="Write your plain text email body here..."
              />
            )}
          </div>
        </div>

        {/* Right Column: Live Sandbox Preview */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-surface flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Live preview
            </span>
            {templateType === "html" && (
              <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${previewDevice === "desktop" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  title="Desktop view"
                >
                  <Monitor className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${previewDevice === "mobile" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  title="Mobile view"
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 bg-slate-100 p-6 flex justify-center items-start overflow-y-auto min-h-0">
            {templateType === "text" ? (
              <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-xl h-[calc(100vh-360px)] overflow-y-auto border border-slate-200/50 flex flex-col">
                <div style={{ color: "#1e293b", fontFamily: "sans-serif", fontSize: "14px", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                  {htmlContent
                    .replaceAll("{{first_name}}", "Jane")
                    .replaceAll("{{name}}", "Jane Doe")
                    .replaceAll("{{email}}", "jane.doe@example.com")
                    .replaceAll("{{company}}", `${BRAND_NAME} Store`)
                    .replaceAll("{{webinar}}", "Introduction to Essential Oils masterclass")
                    .replaceAll("{{join_link}}", `${BRAND_WEBSITE_URL}/webinar/join/PREVIEW-ID`)
                    .replaceAll("{{date}}", new Date().toLocaleDateString("en-IN", { dateStyle: "long" }))
                    .replaceAll("{{unsubscribe}}", "\n\n[Unsubscribe link will be placed here]")
                  }
                </div>
              </div>
            ) : (
              <div
                className={`bg-white shadow-lg transition-all duration-300 rounded-xl overflow-hidden border border-slate-200/50 flex flex-col h-[calc(100vh-360px)] ${
                  previewDevice === "mobile" ? "w-[360px]" : "w-full max-w-2xl"
                }`}
              >
                <iframe
                  ref={iframeRef}
                  title="Email Preview"
                  onLoad={updateIframeContent}
                  className="w-full h-full border-0 bg-slate-50"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Send Test Email Modal Overlay */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden border border-slate-100 shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-800">Send Test Email</h2>
              </div>
              <button onClick={() => setShowTestModal(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSendTest} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Recipient Email Address *</label>
                <input
                  type="email"
                  required
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="e.g. your-email@gmail.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  style={{ color: "#0f172a" }}
                />
                <span className="text-[10px] text-slate-400 block mt-1 leading-normal">
                  The test email will be sent immediately using your active AWS SES connection. Make sure the template contains unsubscribe blocks if testing in production!
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4.5 py-2.5 border border-slate-200 hover:bg-slate-55 font-semibold rounded-xl text-sm transition-all cursor-pointer text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 shadow-sm shadow-emerald-600/10"
                >
                  {sendingTest ? "Sending..." : "Send Test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TemplateBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[70vh] flex items-center justify-center">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      }
    >
      <BuilderContent />
    </Suspense>
  );
}
