"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, 
  Save, 
  Smartphone, 
  Monitor, 
  Code, 
  BookOpen, 
  Sparkles,
  CheckCircle,
  AlertCircle,
  Send,
  X
} from "lucide-react";

function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("id");

  // State definitions
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [templateType, setTemplateType] = useState<"html" | "text">("html");
  const [editorMode, setEditorMode] = useState<"html" | "visual">("html");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Send Test states
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load existing template if editing
  useEffect(() => {
    if (!templateId) {
      // Default initial boiler template
      setHtmlContent(`
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <h1 style="color: #0f172a; font-size: 24px; margin-top: 0;">Hello {{first_name}},</h1>
    <p style="color: #475569; font-size: 15px; line-height: 1.6;">Welcome to your email template. You can customize this layout completely using the HTML editor or add block elements.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pratipal.in" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; font-size: 14px;">Visit Website</a>
    </div>
    
    <p style="color: #475569; font-size: 15px; line-height: 1.6;">If you have any questions, reply to this email.</p>
  </div>
  {{unsubscribe}}
</div>
      `);
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
            setHtmlContent(found.html_content);
            setTemplateType(found.type === "text" ? "text" : "html");
            setEditorMode(found.type === "builder" ? "visual" : "html");
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
      const body = isEdit 
        ? { id: templateId, name, subject, html_content: htmlContent, type: templateType }
        : { name, subject, html_content: htmlContent, type: templateType };

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
          fromName: "Pratipal",
          fromEmail: "support@notifications.pratipal.in", // Use verified domain address
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

  // Helper to append template tags to html editor
  const insertToken = (token: string) => {
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
      setHtmlContent(prev => prev + token);
    }
  };

  const variables = [
    { label: "Full Name", token: "{{name}}" },
    { label: "First Name", token: "{{first_name}}" },
    { label: "Email Address", token: "{{email}}" },
    { label: "Company", token: "{{company}}" },
    { label: "Webinar Title", token: "{{webinar}}" },
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
    <div className="space-y-6">
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => router.push("/templates")}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {templateId ? "Modify Template Layout" : "Design New Template"}
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">Customize email HTML and define personalized merges.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowTestModal(true)}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-all cursor-pointer bg-white"
          >
            <Send className="h-4.5 w-4.5" /> Send Test
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Save className="h-4.5 w-4.5" /> {saving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>

      {/* Split Screen Grid Workspaces */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[calc(100vh-230px)]">
        {/* Left Column: Properties and Code Area */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          {/* Settings inputs */}
          <div className="p-6 border-b border-slate-100 space-y-4 bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Template Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Welcome Email, Webinar Confirmed"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  style={{ color: "#0f172a" }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Default Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Welcome {{first_name}}!"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  style={{ color: "#0f172a" }}
                />
              </div>
            </div>

            {/* Template Format Selector */}
            <div className="space-y-1 pt-1">
              <label className="text-xs font-semibold text-slate-500">Template Format</label>
              <div className="flex bg-slate-200/60 p-0.5 rounded-xl border border-slate-200 w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setTemplateType("html");
                    if (htmlContent.length === 0 || htmlContent.trim() === "") {
                      setHtmlContent("<p>Hello {{first_name}},</p>");
                    }
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    templateType === "html" 
                      ? "bg-white text-slate-800 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  HTML Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateType("text");
                    // strip html fallback if converting html template to text template to assist the user
                    if (htmlContent.includes("<")) {
                      const plainText = htmlContent
                        .replace(/<br\s*\/?>/gi, "\n")
                        .replace(/<\/p>/gi, "\n\n")
                        .replace(/<[^>]*>/g, "")
                        .trim();
                      setHtmlContent(plainText);
                    }
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    templateType === "text" 
                      ? "bg-white text-slate-800 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Plain Text
                </button>
              </div>
            </div>

            {/* Merge tags shortcut selectors */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Merge Variables</span>
              <div className="flex flex-wrap gap-1.5">
                {variables.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => insertToken(v.token)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-600 hover:text-emerald-700 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
                    style={{ color: "#475569" }}
                  >
                    <Sparkles className="h-3 w-3" /> {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Code Editor Workspace */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50/50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Code className="h-4 w-4" /> {templateType === "text" ? "Plain Text Editor" : "HTML Editor"}
              </span>
            </div>
            
            <textarea
              id="html-textarea"
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="flex-1 w-full p-6 font-mono text-xs focus:outline-none resize-none overflow-y-auto leading-relaxed bg-white border-0"
              style={{ color: "#000000", backgroundColor: "#ffffff" }}
              placeholder={templateType === "text" ? "Write your plain text email body here..." : "<!-- Write your email HTML markup here -->"}
            />
          </div>
        </div>

        {/* Right Column: Live Sandbox Preview */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          {/* Device toggle tools */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" /> Live Render Preview
            </span>
            {templateType === "html" && (
              <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${previewDevice === "desktop" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  title="Desktop View"
                >
                  <Monitor className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${previewDevice === "mobile" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  title="Mobile View"
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Viewport content */}
          <div className="flex-1 bg-slate-100 p-6 flex justify-center items-start overflow-y-auto min-h-0">
            {templateType === "text" ? (
              <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-xl h-[calc(100vh-360px)] overflow-y-auto border border-slate-200/50 flex flex-col">
                <div style={{ color: "#1e293b", fontFamily: "sans-serif", fontSize: "14px", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                  {htmlContent
                    .replaceAll("{{first_name}}", "Jane")
                    .replaceAll("{{name}}", "Jane Doe")
                    .replaceAll("{{email}}", "jane.doe@example.com")
                    .replaceAll("{{company}}", "Pratipal Store")
                    .replaceAll("{{webinar}}", "Introduction to Essential Oils masterclass")
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
                  title="Email Preview"
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8">
                        <style>
                          body { margin: 0; padding: 0; background-color: #f8fafc; }
                        </style>
                      </head>
                      <body>
                        ${htmlContent 
                          .replaceAll("{{first_name}}", "Jane")
                          .replaceAll("{{name}}", "Jane Doe")
                          .replaceAll("{{email}}", "jane.doe@example.com")
                          .replaceAll("{{company}}", "Pratipal Store")
                          .replaceAll("{{webinar}}", "Introduction to Essential Oils masterclass")
                          .replaceAll("{{date}}", new Date().toLocaleDateString("en-IN", { dateStyle: "long" }))
                          .replaceAll("{{unsubscribe}}", `
                            <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center; font-size: 12px; color: #9ca3af; font-family: sans-serif;">
                              You are receiving this email because you subscribed to Pratipal communications. <br/>
                              <a href="#" style="color: #059669; text-decoration: underline;">Unsubscribe from this list</a>
                            </div>
                          `)
                        }
                      </body>
                    </html>
                  `}
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
