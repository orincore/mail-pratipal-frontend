// Block-based email design model. A design compiles deterministically to
// the same div-based inline-styled HTML the rest of the app already sends
// (tracking pixel injection, merge-tag replacement, unsubscribe footer —
// see backend src/lib/tracking-parser.ts) — blocks are just a structured,
// re-editable way to produce that HTML instead of hand-writing it.

export type Align = "left" | "center" | "right";

export interface HeadingBlock {
  id: string;
  type: "heading";
  text: string;
  align: Align;
  color: string;
  fontSize: number;
}

export interface TextBlock {
  id: string;
  type: "text";
  text: string;
  align: Align;
  color: string;
  fontSize: number;
}

export interface ButtonBlock {
  id: string;
  type: "button";
  text: string;
  url: string;
  align: Align;
  bgColor: string;
  textColor: string;
  borderRadius: number;
}

export interface ImageBlock {
  id: string;
  type: "image";
  src: string;
  alt: string;
  link: string;
  width: number; // percent of container, 10-100
  align: Align;
}

export interface DividerBlock {
  id: string;
  type: "divider";
  color: string;
}

export interface SpacerBlock {
  id: string;
  type: "spacer";
  height: number;
}

export type SocialPlatform = "facebook" | "instagram" | "x" | "linkedin" | "youtube" | "website";

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export interface SocialBlock {
  id: string;
  type: "social";
  align: Align;
  links: SocialLink[];
}

export interface FooterBlock {
  id: string;
  type: "footer";
  text: string;
  color: string;
  /**
   * Renders a real "Unsubscribe" link (href={{unsubscribe}}, filled in by
   * the backend with the recipient's real unsubscribe URL at send time).
   * Note the backend always appends its own compliance unsubscribe footer
   * regardless of this setting — this is an optional, template-styled
   * addition, not the only unsubscribe mechanism.
   */
  showUnsubscribeLink: boolean;
}

export type EmailBlock =
  | HeadingBlock
  | TextBlock
  | ButtonBlock
  | ImageBlock
  | DividerBlock
  | SpacerBlock
  | SocialBlock
  | FooterBlock;

export interface DesignSettings {
  backgroundColor: string;
  containerColor: string;
  contentWidth: number;
  fontFamily: string;
}

export interface EmailDesign {
  settings: DesignSettings;
  blocks: EmailBlock[];
}

export const FONT_STACKS: { label: string; value: string }[] = [
  { label: "System sans-serif", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
  { label: "Georgia (serif)", value: "Georgia, 'Times New Roman', serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: "Courier (monospace)", value: "'Courier New', Courier, monospace" },
];

export const SOCIAL_META: Record<SocialPlatform, { label: string; color: string; initial: string }> = {
  facebook: { label: "Facebook", color: "#1877f2", initial: "f" },
  instagram: { label: "Instagram", color: "#e1306c", initial: "IG" },
  x: { label: "X / Twitter", color: "#0f1419", initial: "X" },
  linkedin: { label: "LinkedIn", color: "#0a66c2", initial: "in" },
  youtube: { label: "YouTube", color: "#ff0000", initial: "YT" },
  website: { label: "Website", color: "#475569", initial: "W" },
};

let idCounter = 0;
export function newBlockId(): string {
  idCounter += 1;
  return `blk_${Date.now().toString(36)}_${idCounter}`;
}

export function defaultSettings(): DesignSettings {
  return {
    backgroundColor: "#f4f5f2",
    containerColor: "#ffffff",
    contentWidth: 560,
    fontFamily: FONT_STACKS[0].value,
  };
}

export function createBlock(type: EmailBlock["type"]): EmailBlock {
  const id = newBlockId();
  switch (type) {
    case "heading":
      return { id, type, text: "Your headline here", align: "left", color: "#1f2430", fontSize: 24 };
    case "text":
      return { id, type, text: "Write your message here. You can use merge tags like {{first_name}} to personalize it.", align: "left", color: "#475569", fontSize: 15 };
    case "button":
      return { id, type, text: "Call to action", url: "https://", align: "center", bgColor: "#059669", textColor: "#ffffff", borderRadius: 10 };
    case "image":
      return { id, type, src: "", alt: "", link: "", width: 100, align: "center" };
    case "divider":
      return { id, type, color: "#e5e7eb" };
    case "spacer":
      return { id, type, height: 24 };
    case "social":
      return { id, type, align: "center", links: [{ platform: "website", url: "https://" }] };
    case "footer":
      return {
        id,
        type,
        text: "You are receiving this email because you subscribed to our communications.",
        color: "#9ca3af",
        showUnsubscribeLink: true,
      };
  }
}

export function starterDesign(): EmailDesign {
  return {
    settings: defaultSettings(),
    blocks: [
      { id: newBlockId(), type: "heading", text: "Hello {{first_name}},", align: "left", color: "#1f2430", fontSize: 22 },
      {
        id: newBlockId(),
        type: "text",
        text: "Welcome! Customize this layout by adding, removing, and rearranging blocks — headings, text, images, buttons, dividers, and more.",
        align: "left",
        color: "#6b7280",
        fontSize: 14,
      },
      { id: newBlockId(), type: "button", text: "Visit website", url: "{{join_link}}", align: "center", bgColor: "#059669", textColor: "#ffffff", borderRadius: 10 },
      { id: newBlockId(), type: "footer", text: "You are receiving this email because you subscribed to our communications.", color: "#9ca3af", showUnsubscribeLink: true },
    ],
  };
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function alignToTextAlign(align: Align): string {
  return align;
}

function renderBlock(block: EmailBlock, settings: DesignSettings): string {
  switch (block.type) {
    case "heading":
      return `<h1 style="margin:0 0 16px;font-family:${settings.fontFamily};color:${block.color};font-size:${block.fontSize}px;font-weight:700;text-align:${alignToTextAlign(block.align)};line-height:1.3;">${escapeHtml(block.text)}</h1>`;

    case "text": {
      const lines = block.text.split("\n").map((l) => escapeHtml(l)).join("<br/>");
      return `<p style="margin:0 0 16px;font-family:${settings.fontFamily};color:${block.color};font-size:${block.fontSize}px;line-height:1.6;text-align:${alignToTextAlign(block.align)};">${lines}</p>`;
    }

    case "button":
      return `<div style="margin:0 0 20px;text-align:${alignToTextAlign(block.align)};"><a href="${escapeHtml(block.url)}" style="display:inline-block;background-color:${block.bgColor};color:${block.textColor};text-decoration:none;padding:13px 32px;border-radius:${block.borderRadius}px;font-family:${settings.fontFamily};font-weight:600;font-size:14px;">${escapeHtml(block.text)}</a></div>`;

    case "image": {
      const img = `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" width="${block.width}%" style="display:block;max-width:${block.width}%;width:${block.width}%;height:auto;margin:${block.align === "center" ? "0 auto" : block.align === "right" ? "0 0 0 auto" : "0"};border:0;" />`;
      const wrapped = block.link ? `<a href="${escapeHtml(block.link)}" style="text-decoration:none;">${img}</a>` : img;
      return `<div style="margin:0 0 20px;text-align:${alignToTextAlign(block.align)};">${wrapped}</div>`;
    }

    case "divider":
      return `<hr style="margin:20px 0;border:none;border-top:1px solid ${block.color};" />`;

    case "spacer":
      return `<div style="height:${block.height}px;line-height:${block.height}px;font-size:1px;">&nbsp;</div>`;

    case "social": {
      const icons = block.links
        .map((l) => {
          const meta = SOCIAL_META[l.platform];
          return `<a href="${escapeHtml(l.url)}" style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background-color:${meta.color};color:#ffffff;border-radius:50%;text-decoration:none;font-family:${settings.fontFamily};font-size:12px;font-weight:700;margin:0 6px;">${escapeHtml(meta.initial)}</a>`;
        })
        .join("");
      return `<div style="margin:0 0 20px;text-align:${alignToTextAlign(block.align)};">${icons}</div>`;
    }

    case "footer": {
      const lines = block.text.split("\n").map((l) => escapeHtml(l)).join("<br/>");
      // {{unsubscribe}} is only ever safe to use as a link's href — the
      // backend substitutes it with a bare URL string, not markup, so it
      // must never appear as visible escaped text (see updateIframeContent
      // in page.tsx and tracking-parser.ts on the backend).
      const unsubscribeLink = block.showUnsubscribeLink
        ? `<div style="margin-top:8px;"><a href="{{unsubscribe}}" style="color:${block.color};text-decoration:underline;">Unsubscribe</a></div>`
        : "";
      return `<div style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;font-size:12px;color:${block.color};font-family:${settings.fontFamily};line-height:1.6;">${lines}${unsubscribeLink}</div>`;
    }
  }
}

export function renderBlocksToHtml(design: EmailDesign): string {
  const inner = design.blocks.map((b) => renderBlock(b, design.settings)).join("\n");
  return `<div style="font-family:${design.settings.fontFamily};max-width:${design.settings.contentWidth}px;margin:0 auto;padding:28px 16px;background-color:${design.settings.backgroundColor};">
  <div style="background-color:${design.settings.containerColor};padding:32px;border-radius:16px;border:1px solid rgba(0,0,0,0.06);box-shadow:0 1px 3px rgba(16,24,40,0.04);">
${inner}
  </div>
</div>`;
}

/** Loose validation that a parsed design_json blob actually looks like an EmailDesign. */
export function isValidDesign(value: any): value is EmailDesign {
  return !!value && typeof value === "object" && Array.isArray(value.blocks) && !!value.settings;
}
