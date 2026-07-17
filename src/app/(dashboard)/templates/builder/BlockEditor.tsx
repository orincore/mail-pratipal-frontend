"use client";

import React, { useState } from "react";
import {
  Heading1,
  Type,
  MousePointerClick,
  Image as ImageIcon,
  Minus,
  MoveVertical,
  Share2,
  FileSignature,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  X,
  Settings2,
  Sparkles,
} from "lucide-react";
import {
  type EmailBlock,
  type EmailDesign,
  type Align,
  type SocialPlatform,
  createBlock,
  FONT_STACKS,
  SOCIAL_META,
} from "./blocks";

const BLOCK_PALETTE: { type: EmailBlock["type"]; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "heading", label: "Heading", icon: Heading1 },
  { type: "text", label: "Text", icon: Type },
  { type: "button", label: "Button", icon: MousePointerClick },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "divider", label: "Divider", icon: Minus },
  { type: "spacer", label: "Spacer", icon: MoveVertical },
  { type: "social", label: "Social", icon: Share2 },
  { type: "footer", label: "Footer", icon: FileSignature },
];

// {{unsubscribe}} is deliberately excluded — the backend fills it in as a
// bare URL string, not a link, so it must never appear as visible escaped
// text. The Footer block has its own "Show unsubscribe link" toggle instead.
const VARIABLES = [
  { label: "Full name", token: "{{name}}" },
  { label: "First name", token: "{{first_name}}" },
  { label: "Email", token: "{{email}}" },
  { label: "Company", token: "{{company}}" },
  { label: "Webinar title", token: "{{webinar}}" },
  { label: "Webinar join link", token: "{{join_link}}" },
  { label: "Current date", token: "{{date}}" },
];

function VariableMenu({ onInsert }: { onInsert: (token: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
      >
        <Sparkles className="h-3 w-3" /> Insert variable
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-1.5 animate-scale-up">
            {VARIABLES.map((v) => (
              <button
                key={v.token}
                type="button"
                onClick={() => {
                  onInsert(v.token);
                  setOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-[12px] text-slate-700 transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                {v.label}
                <code className="text-[10px] text-slate-400">{v.token}</code>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AlignToggle({ value, onChange }: { value: Align; onChange: (a: Align) => void }) {
  const options: { value: Align; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: "left", icon: AlignLeft },
    { value: "center", icon: AlignCenter },
    { value: "right", icon: AlignRight },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`p-1.5 rounded-md transition-all cursor-pointer ${value === o.value ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
        >
          <o.icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide block">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-900";

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1 bg-white">
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 w-6 shrink-0 cursor-pointer border-0 bg-transparent p-0"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 text-[12px] text-slate-700 focus:outline-none"
      />
    </div>
  );
}

function BlockInspector({ block, update }: { block: EmailBlock; update: (patch: Partial<EmailBlock>) => void }) {
  switch (block.type) {
    case "heading":
    case "text":
      return (
        <div className="space-y-3">
          <Field label="Text">
            <div className="flex items-start gap-2">
              <textarea
                value={block.text}
                onChange={(e) => update({ text: e.target.value } as Partial<EmailBlock>)}
                rows={block.type === "heading" ? 1 : 3}
                className={`${inputCls} resize-none flex-1`}
              />
              <VariableMenu onInsert={(tok) => update({ text: `${block.text}${block.text ? " " : ""}${tok}` } as Partial<EmailBlock>)} />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Text color">
              <ColorInput value={block.color} onChange={(v) => update({ color: v } as Partial<EmailBlock>)} />
            </Field>
            <Field label="Font size">
              <input
                type="number"
                min={10}
                max={48}
                value={block.fontSize}
                onChange={(e) => update({ fontSize: parseInt(e.target.value, 10) || block.fontSize } as Partial<EmailBlock>)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Alignment">
            <AlignToggle value={block.align} onChange={(a) => update({ align: a } as Partial<EmailBlock>)} />
          </Field>
        </div>
      );

    case "button":
      return (
        <div className="space-y-3">
          <Field label="Button text">
            <div className="flex items-center gap-2">
              <input type="text" value={block.text} onChange={(e) => update({ text: e.target.value })} className={inputCls} />
              <VariableMenu onInsert={(tok) => update({ text: `${block.text}${block.text ? " " : ""}${tok}` })} />
            </div>
          </Field>
          <Field label="Link URL">
            <input type="text" value={block.url} onChange={(e) => update({ url: e.target.value })} placeholder="https://…" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Background">
              <ColorInput value={block.bgColor} onChange={(v) => update({ bgColor: v })} />
            </Field>
            <Field label="Text color">
              <ColorInput value={block.textColor} onChange={(v) => update({ textColor: v })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <Field label="Corner radius">
              <input
                type="number"
                min={0}
                max={40}
                value={block.borderRadius}
                onChange={(e) => update({ borderRadius: parseInt(e.target.value, 10) || 0 })}
                className={inputCls}
              />
            </Field>
            <Field label="Alignment">
              <AlignToggle value={block.align} onChange={(a) => update({ align: a })} />
            </Field>
          </div>
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <Field label="Image URL">
            <input type="text" value={block.src} onChange={(e) => update({ src: e.target.value })} placeholder="https://…/image.png" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Alt text">
              <input type="text" value={block.alt} onChange={(e) => update({ alt: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Link (optional)">
              <input type="text" value={block.link} onChange={(e) => update({ link: e.target.value })} placeholder="https://…" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <Field label={`Width — ${block.width}%`}>
              <input
                type="range"
                min={10}
                max={100}
                value={block.width}
                onChange={(e) => update({ width: parseInt(e.target.value, 10) })}
                className="w-full cursor-pointer"
              />
            </Field>
            <Field label="Alignment">
              <AlignToggle value={block.align} onChange={(a) => update({ align: a })} />
            </Field>
          </div>
          {!block.src && <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">Paste an image URL to preview it.</p>}
        </div>
      );

    case "divider":
      return (
        <Field label="Line color">
          <ColorInput value={block.color} onChange={(v) => update({ color: v })} />
        </Field>
      );

    case "spacer":
      return (
        <Field label={`Height — ${block.height}px`}>
          <input
            type="range"
            min={8}
            max={120}
            value={block.height}
            onChange={(e) => update({ height: parseInt(e.target.value, 10) })}
            className="w-full cursor-pointer"
          />
        </Field>
      );

    case "social":
      return (
        <div className="space-y-3">
          <Field label="Alignment">
            <AlignToggle value={block.align} onChange={(a) => update({ align: a })} />
          </Field>
          <div className="space-y-2">
            {block.links.map((link, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={link.platform}
                  onChange={(e) => {
                    const links = [...block.links];
                    links[idx] = { ...links[idx], platform: e.target.value as SocialPlatform };
                    update({ links });
                  }}
                  className={`${inputCls} w-32 shrink-0`}
                >
                  {Object.entries(SOCIAL_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={link.url}
                  onChange={(e) => {
                    const links = [...block.links];
                    links[idx] = { ...links[idx], url: e.target.value };
                    update({ links });
                  }}
                  placeholder="https://…"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => update({ links: block.links.filter((_, i) => i !== idx) })}
                  disabled={block.links.length === 1}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => update({ links: [...block.links, { platform: "website", url: "https://" }] })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-slate-300 hover:border-emerald-400 hover:text-emerald-600 text-slate-500 font-medium rounded-lg text-[11.5px] transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add link
          </button>
        </div>
      );

    case "footer":
      return (
        <div className="space-y-3">
          <Field label="Footer text">
            <div className="flex items-start gap-2">
              <textarea
                value={block.text}
                onChange={(e) => update({ text: e.target.value })}
                rows={3}
                className={`${inputCls} resize-none flex-1`}
              />
              <VariableMenu onInsert={(tok) => update({ text: `${block.text}${block.text ? "\n" : ""}${tok}` })} />
            </div>
          </Field>
          <Field label="Text color">
            <ColorInput value={block.color} onChange={(v) => update({ color: v })} />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={block.showUnsubscribeLink}
              onChange={(e) => update({ showUnsubscribeLink: e.target.checked })}
              className="h-3.5 w-3.5 accent-emerald-600 cursor-pointer"
            />
            <span className="text-[12px] text-slate-600">Show "Unsubscribe" link here</span>
          </label>
          <p className="text-[11px] text-slate-400">
            Every email also gets a standard unsubscribe link automatically appended at the very
            bottom, so recipients can always opt out even if this is off.
          </p>
        </div>
      );
  }
}

function blockSummary(block: EmailBlock): string {
  switch (block.type) {
    case "heading":
    case "text":
      return block.text || "(empty)";
    case "button":
      return `"${block.text}" → ${block.url || "no link"}`;
    case "image":
      return block.src || "No image set";
    case "divider":
      return "Horizontal line";
    case "spacer":
      return `${block.height}px gap`;
    case "social":
      return `${block.links.length} link${block.links.length === 1 ? "" : "s"}`;
    case "footer":
      return block.text || "(empty)";
  }
}

export default function BlockEditor({
  design,
  onChange,
}: {
  design: EmailDesign;
  onChange: (design: EmailDesign) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(design.blocks[0]?.id ?? null);
  const [showSettings, setShowSettings] = useState(false);

  const updateBlocks = (blocks: EmailBlock[]) => onChange({ ...design, blocks });
  const updateSettings = (patch: Partial<EmailDesign["settings"]>) => onChange({ ...design, settings: { ...design.settings, ...patch } });

  const addBlock = (type: EmailBlock["type"]) => {
    const block = createBlock(type);
    updateBlocks([...design.blocks, block]);
    setSelectedId(block.id);
    setShowSettings(false);
  };

  const updateBlock = (id: string, patch: Partial<EmailBlock>) => {
    updateBlocks(design.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as EmailBlock) : b)));
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = design.blocks.findIndex((b) => b.id === id);
    const target = idx + dir;
    if (target < 0 || target >= design.blocks.length) return;
    const next = [...design.blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    updateBlocks(next);
  };

  const duplicate = (id: string) => {
    const idx = design.blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const copy = { ...design.blocks[idx], id: `${design.blocks[idx].id}_copy_${Date.now()}` } as EmailBlock;
    const next = [...design.blocks];
    next.splice(idx + 1, 0, copy);
    updateBlocks(next);
    setSelectedId(copy.id);
  };

  const remove = (id: string) => {
    updateBlocks(design.blocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-slate-50/40">
      {/* Block palette */}
      <div className="p-4 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide">Add a block</span>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
              showSettings ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" /> Design settings
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {BLOCK_PALETTE.map((p) => (
            <button
              key={p.type}
              type="button"
              onClick={() => addBlock(p.type)}
              className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-all cursor-pointer"
            >
              <p.icon className="h-4 w-4" />
              <span className="text-[10px] font-medium">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Global design settings */}
      {showSettings && (
        <div className="p-4 border-b border-slate-100 bg-white space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Page background">
              <ColorInput value={design.settings.backgroundColor} onChange={(v) => updateSettings({ backgroundColor: v })} />
            </Field>
            <Field label="Card background">
              <ColorInput value={design.settings.containerColor} onChange={(v) => updateSettings({ containerColor: v })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Content width — ${design.settings.contentWidth}px`}>
              <input
                type="range"
                min={420}
                max={700}
                step={20}
                value={design.settings.contentWidth}
                onChange={(e) => updateSettings({ contentWidth: parseInt(e.target.value, 10) })}
                className="w-full cursor-pointer"
              />
            </Field>
            <Field label="Font family">
              <select
                value={design.settings.fontFamily}
                onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                className={inputCls}
              >
                {FONT_STACKS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      )}

      {/* Block list */}
      <div className="p-4 space-y-2">
        {design.blocks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-[13px]">
            No blocks yet — add one from the palette above.
          </div>
        ) : (
          design.blocks.map((block, idx) => {
            const meta = BLOCK_PALETTE.find((p) => p.type === block.type)!;
            const selected = selectedId === block.id;
            return (
              <div
                key={block.id}
                className={`rounded-2xl border bg-white transition-all ${selected ? "border-emerald-400 ring-2 ring-emerald-500/10" : "border-slate-200"}`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(selected ? null : block.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(selected ? null : block.id);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left cursor-pointer"
                >
                  <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <meta.icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[12.5px] font-medium text-slate-800 block">{meta.label}</span>
                    <span className="text-[11px] text-slate-400 truncate block">{blockSummary(block)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => move(block.id, -1)}
                      disabled={idx === 0}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-20"
                      title="Move up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(block.id, 1)}
                      disabled={idx === design.blocks.length - 1}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-20"
                      title="Move down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicate(block.id)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(block.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {selected && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 animate-fade-in">
                    <BlockInspector block={block} update={(patch) => updateBlock(block.id, patch)} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
