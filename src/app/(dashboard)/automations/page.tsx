"use client";

import React, { useState, useEffect } from "react";
import { 
  GitFork, 
  Plus, 
  Trash2, 
  Clock, 
  Mail, 
  AlertCircle, 
  Play, 
  Pause,
  CheckCircle,
  HelpCircle,
  ArrowDown,
  UserCheck,
  X,
  Sparkles
} from "lucide-react";

interface AutomationStep {
  id: string;
  type: "email" | "delay" | "condition";
  email_config?: {
    template_id: string;
    subject: string;
    sender_name: string;
    sender_email: string;
  };
  delay_config?: {
    duration: number;
    unit: "minutes" | "hours" | "days";
  };
  condition_config?: {
    field: "open" | "click" | "tag";
    operator: "equals" | "contains" | "true" | "false";
    value: string;
    yes_step_id?: string;
    no_step_id?: string;
  };
  next_step_id?: string;
}

interface Automation {
  id: string;
  name: string;
  trigger: {
    type: "api" | "manual" | "event";
    event_name?: string;
  };
  steps: AutomationStep[];
  status: "active" | "draft" | "paused";
  stats: {
    enrolled: number;
    completed: number;
  };
  created_at: string;
}

interface TemplateOption {
  id: string;
  name: string;
}

interface SenderOption {
  email: string;
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [senders, setSenders] = useState<SenderOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor modal states
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingSteps, setEditingSteps] = useState<AutomationStep[]>([]);
  const [automationName, setAutomationName] = useState("");
  const [triggerType, setTriggerType] = useState<"api" | "manual" | "event">("manual");
  const [triggerEvent, setTriggerEvent] = useState("");

  // Manual enrollment modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollSubId, setEnrollSubId] = useState("");

  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAutomations = async () => {
    try {
      const res = await fetch("/api/automations");
      if (res.ok) {
        const data = await res.json();
        setAutomations(data || []);
      }
    } catch {
      showNotification("Failed to load automations", "error");
    }
  };

  const loadEditorData = async () => {
    try {
      const tRes = await fetch("/api/templates");
      if (tRes.ok) setTemplates(await tRes.json());

      const sRes = await fetch("/api/senders");
      if (sRes.ok) {
        const sendersData = await sRes.json();
        setSenders(sendersData.filter((s: any) => s.verification_status === "verified"));
      }
    } catch {
      showNotification("Failed to fetch builder properties", "error");
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchAutomations(), loadEditorData()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleStatusToggle = async (auto: Automation, newStatus: "active" | "paused" | "draft") => {
    try {
      const res = await fetch("/api/automations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: auto.id, status: newStatus }),
      });
      if (res.ok) {
        showNotification(`Workflow marked as ${newStatus}`);
        fetchAutomations();
      } else {
        showNotification("Failed to toggle workflow state", "error");
      }
    } catch {
      showNotification("Network error", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this automation?")) return;
    try {
      const res = await fetch(`/api/automations?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showNotification("Automation deleted");
        fetchAutomations();
      } else {
        showNotification("Failed to delete", "error");
      }
    } catch {
      showNotification("Network error", "error");
    }
  };

  // Open editor for new or existing
  const openBuilder = (auto: Automation | null) => {
    if (auto) {
      setSelectedAutomation(auto);
      setAutomationName(auto.name);
      setTriggerType(auto.trigger.type);
      setTriggerEvent(auto.trigger.event_name || "");
      setEditingSteps([...auto.steps]);
    } else {
      setSelectedAutomation(null);
      setAutomationName("New Drip Automation");
      setTriggerType("manual");
      setTriggerEvent("");
      setEditingSteps([]);
    }
    setShowEditor(true);
  };

  // Add a step to the editor list
  const addStep = (type: "email" | "delay" | "condition") => {
    const defaultEmail = senders.length > 0 ? senders[0].email : "";
    const defaultTemplate = templates.length > 0 ? templates[0].id : "";

    const newStep: AutomationStep = {
      id: `step-${Math.random().toString(36).substring(2, 7)}`,
      type,
      next_step_id: "",
    };

    if (type === "email") {
      newStep.email_config = {
        template_id: defaultTemplate,
        subject: "Drip Email Subject",
        sender_name: "Pratipal",
        sender_email: defaultEmail,
      };
    } else if (type === "delay") {
      newStep.delay_config = {
        duration: 1,
        unit: "days",
      };
    } else if (type === "condition") {
      newStep.condition_config = {
        field: "tag",
        operator: "equals",
        value: "Active",
        yes_step_id: "",
        no_step_id: "",
      };
    }

    setEditingSteps([...editingSteps, newStep]);
  };

  const deleteStep = (index: number) => {
    const updated = [...editingSteps];
    updated.splice(index, 1);
    setEditingSteps(updated);
  };

  // Update specific step fields
  const updateStep = (index: number, fields: Partial<AutomationStep>) => {
    const updated = [...editingSteps];
    updated[index] = { ...updated[index], ...fields };
    setEditingSteps(updated);
  };

  const updateStepConfig = (index: number, configKey: "email_config" | "delay_config" | "condition_config", val: any) => {
    const updated = [...editingSteps];
    updated[index] = {
      ...updated[index],
      [configKey]: {
        ...updated[index][configKey],
        ...val,
      }
    };
    setEditingSteps(updated);
  };

  // Save the full automation sequence
  const handleSaveAutomation = async () => {
    if (!automationName) {
      showNotification("Please name the automation", "error");
      return;
    }

    // Connect next_step_ids sequentially
    const connectedSteps = editingSteps.map((step, idx) => {
      const copy = { ...step };
      if (idx < editingSteps.length - 1) {
        copy.next_step_id = editingSteps[idx + 1].id;
      } else {
        copy.next_step_id = "";
      }
      return copy;
    });

    const payload = {
      name: automationName,
      trigger: {
        type: triggerType,
        event_name: triggerType === "event" ? triggerEvent : undefined,
      },
      steps: connectedSteps,
    };

    try {
      const isEdit = !!selectedAutomation;
      const url = "/api/automations";
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit ? { id: selectedAutomation.id, ...payload } : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showNotification(isEdit ? "Automation saved successfully" : "Automation created successfully");
        setShowEditor(false);
        fetchAutomations();
      } else {
        showNotification("Failed to save automation configuration", "error");
      }
    } catch {
      showNotification("Network error", "error");
    }
  };

  // Run Manual Enrollment
  const handleManualEnroll = async () => {
    if (!enrollSubId || !selectedAutomation) return;

    try {
      const res = await fetch("/api/automations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAutomation.id,
          enrollSubscriberId: enrollSubId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showNotification("Subscriber enrolled successfully in the sequence!");
        setShowEnrollModal(false);
        setEnrollSubId("");
        fetchAutomations();
      } else {
        alert(data.error || "Enrollment failed");
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

      {/* Title Action Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Workflow Automations</h1>
          <p className="text-slate-500 text-sm mt-1">Design event-driven multi-step drip email sequences.</p>
        </div>
        <div>
          <button
            onClick={() => openBuilder(null)}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" /> New Automation
          </button>
        </div>
      </div>

      {/* Automations Table List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="h-8 w-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : automations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No active workflows yet. Click "New Automation" to start constructing dynamic trigger maps.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-4 px-6">Workflow Name</th>
                  <th className="py-4 px-4">Trigger Type</th>
                  <th className="py-4 px-4 text-center">Steps Count</th>
                  <th className="py-4 px-4 text-center font-mono">Enrolled</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {automations.map((auto) => (
                  <tr key={auto.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800">{auto.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Created on {new Date(auto.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="capitalize text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {auto.trigger.type === "event" ? `Event: ${auto.trigger.event_name}` : auto.trigger.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-slate-800">{auto.steps.length}</td>
                    <td className="py-4 px-4 text-center font-mono text-slate-600 font-semibold">{auto.stats.enrolled}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                        auto.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        auto.status === "paused" ? "bg-amber-50 text-amber-600 border-amber-100" :
                        "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {auto.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-1.5">
                      <button
                        onClick={() => openBuilder(auto)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-all inline-flex cursor-pointer border border-slate-150 text-xs font-semibold"
                      >
                        Edit Workflow
                      </button>
                      
                      {auto.status !== "active" && (
                        <button
                          onClick={() => handleStatusToggle(auto, "active")}
                          className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-all inline-flex cursor-pointer"
                          title="Activate workflow"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      {auto.status === "active" && (
                        <button
                          onClick={() => handleStatusToggle(auto, "paused")}
                          className="p-1.5 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-lg transition-all inline-flex cursor-pointer"
                          title="Pause workflow"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedAutomation(auto);
                          setShowEnrollModal(true);
                        }}
                        className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all inline-flex cursor-pointer"
                        title="Manually Enroll User"
                      >
                        <UserCheck className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(auto.id)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all inline-flex cursor-pointer"
                        title="Delete automation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visual Sequence Pipeline Builder Overlay */}
      {showEditor && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] overflow-hidden border border-slate-100 shadow-2xl flex flex-col justify-between animate-scale-up">
            
            {/* Header toolbar */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-lg text-white">
                  <GitFork className="h-5 w-5" />
                </div>
                <div>
                  <input
                    type="text"
                    value={automationName}
                    onChange={(e) => setAutomationName(e.target.value)}
                    className="font-bold text-slate-800 text-lg border-b border-transparent hover:border-slate-300 focus:border-emerald-600 focus:outline-none bg-transparent"
                    placeholder="Automation Workflow Name"
                  />
                  <p className="text-slate-400 text-xs mt-0.5">Visual sequential trigger maps editor.</p>
                </div>
              </div>
              <button onClick={() => setShowEditor(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Workflow Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 flex flex-col items-center">
              {/* Trigger Block */}
              <div className="w-full max-w-lg bg-white p-5 rounded-2xl border-2 border-emerald-500 shadow-sm relative text-center">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-0.5 bg-emerald-600 text-white text-[9px] font-bold uppercase rounded-full tracking-wider">
                  Workflow Trigger
                </div>
                <div className="space-y-3 mt-1.5">
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setTriggerType("manual")}
                      className={`flex-1 py-1.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${triggerType === "manual" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                    >
                      Manual Enroll
                    </button>
                    <button
                      type="button"
                      onClick={() => setTriggerType("event")}
                      className={`flex-1 py-1.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${triggerType === "event" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                    >
                      Webinar Event
                    </button>
                  </div>
                  {triggerType === "event" && (
                    <input
                      type="text"
                      value={triggerEvent}
                      onChange={(e) => setTriggerEvent(e.target.value)}
                      placeholder="e.g. webinar_registration"
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                    />
                  )}
                </div>
              </div>

              {/* Dynamic steps pipeline list */}
              {editingSteps.length === 0 ? (
                <div className="flex flex-col items-center mt-8 py-10 text-slate-400 text-sm">
                  <ArrowDown className="h-6 w-6 text-slate-300 mb-2 animate-bounce" />
                  <span>Your workflow has no steps. Click buttons below to append steps to the drip.</span>
                </div>
              ) : (
                editingSteps.map((step, idx) => (
                  <React.Fragment key={step.id}>
                    <ArrowDown className="h-8 w-8 text-slate-300 my-2" />
                    
                    {/* Render specific step block type */}
                    <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:shadow-md transition-all relative group">
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => deleteStep(idx)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Step Header info */}
                      <div className="flex items-center gap-2">
                        {step.type === "email" && <Mail className="h-4.5 w-4.5 text-blue-600" />}
                        {step.type === "delay" && <Clock className="h-4.5 w-4.5 text-amber-500" />}
                        {step.type === "condition" && <GitFork className="h-4.5 w-4.5 text-purple-500" />}
                        <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                          Step {idx + 1}: {step.type}
                        </span>
                      </div>

                      {/* Step inputs based on type */}
                      {step.type === "email" && step.email_config && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">Template</label>
                            <select
                              value={step.email_config.template_id}
                              onChange={(e) => updateStepConfig(idx, "email_config", { template_id: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">Subject</label>
                            <input
                              type="text"
                              value={step.email_config.subject}
                              onChange={(e) => updateStepConfig(idx, "email_config", { subject: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      )}

                      {step.type === "delay" && step.delay_config && (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">Duration</label>
                            <input
                              type="number"
                              min="1"
                              value={step.delay_config.duration}
                              onChange={(e) => updateStepConfig(idx, "delay_config", { duration: parseInt(e.target.value) || 1 })}
                              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">Unit</label>
                            <select
                              value={step.delay_config.unit}
                              onChange={(e) => updateStepConfig(idx, "delay_config", { unit: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                              <option value="days">Days</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {step.type === "condition" && step.condition_config && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">Check Property</label>
                            <select
                              value={step.condition_config.field}
                              onChange={(e) => updateStepConfig(idx, "condition_config", { field: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-white"
                            >
                              <option value="tag">Subscriber has Tag</option>
                              <option value="open">Has opened an email in sequence</option>
                              <option value="click">Has clicked a link in sequence</option>
                            </select>
                          </div>
                          {step.condition_config.field === "tag" && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">Tag Value</label>
                              <input
                                type="text"
                                value={step.condition_config.value}
                                onChange={(e) => updateStepConfig(idx, "condition_config", { value: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-3 py-1.5"
                                placeholder="Active"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                ))
              )}

              {/* Add node actions toolbox */}
              <div className="flex gap-2.5 mt-8 border-t border-slate-200 pt-6 justify-center w-full max-w-lg">
                <button
                  onClick={() => addStep("email")}
                  className="inline-flex items-center gap-1 px-4 py-2 border border-blue-200 bg-blue-50/20 hover:bg-blue-50 text-blue-600 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="h-4.5 w-4.5" /> Add Email Dispatch
                </button>
                <button
                  onClick={() => addStep("delay")}
                  className="inline-flex items-center gap-1 px-4 py-2 border border-amber-200 bg-amber-50/20 hover:bg-amber-50 text-amber-600 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="h-4.5 w-4.5" /> Add Wait Delay
                </button>
                <button
                  onClick={() => addStep("condition")}
                  className="inline-flex items-center gap-1 px-4 py-2 border border-purple-200 bg-purple-50/20 hover:bg-purple-50 text-purple-600 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="h-4.5 w-4.5" /> Add Condition
                </button>
              </div>
            </div>

            {/* Footer triggers */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3.5">
              <button
                onClick={() => setShowEditor(false)}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 font-semibold rounded-xl text-sm transition-all cursor-pointer text-slate-700"
              >
                Close Builder
              </button>
              <button
                onClick={handleSaveAutomation}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
              >
                Save Workflow Sequence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Enrollment Overlay Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden border border-slate-100 shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-800">Enroll Subscriber</h2>
              </div>
              <button onClick={() => setShowEnrollModal(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Subscriber MongoDB _id *</label>
                <input
                  type="text"
                  required
                  value={enrollSubId}
                  onChange={(e) => setEnrollSubId(e.target.value)}
                  placeholder="e.g. 64c39f1c7d23a411234bc567"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <span className="text-[10px] text-slate-400 block mt-1 leading-normal">
                  Find the subscriber ID in the Subscriber panel, copy it, and paste it here to manually trigger the drip campaign sequence starting at Step 1.
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4.5 py-2.5 border border-slate-200 hover:bg-slate-50 font-semibold rounded-xl text-sm transition-all cursor-pointer text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualEnroll}
                  disabled={!enrollSubId}
                  className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  Enroll Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
