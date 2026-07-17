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
  /** Bottom margin in px. Undefined falls back to a sensible per-type default. */
  spacing?: number;
}

export interface TextBlock {
  id: string;
  type: "text";
  text: string;
  align: Align;
  color: string;
  fontSize: number;
  bold?: boolean;
  spacing?: number;
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
  /** "outline" = transparent fill, colored border + text. Defaults to "solid". */
  style?: "solid" | "outline";
  fullWidth?: boolean;
  spacing?: number;
}

export interface ImageBlock {
  id: string;
  type: "image";
  src: string;
  alt: string;
  link: string;
  width: number; // percent of container, 10-100
  align: Align;
  spacing?: number;
}

export interface DividerBlock {
  id: string;
  type: "divider";
  color: string;
  lineStyle?: "solid" | "dashed" | "dotted";
  thickness?: number;
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
  spacing?: number;
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

export interface ColumnCell {
  type: "text" | "image";
  text: string;
  color: string;
  fontSize: number;
  src: string;
  alt: string;
}

export interface ColumnsBlock {
  id: string;
  type: "columns";
  left: ColumnCell;
  right: ColumnCell;
  gap: number;
  spacing?: number;
}

export interface HtmlBlock {
  id: string;
  type: "html";
  html: string;
}

export type EmailBlock =
  | HeadingBlock
  | TextBlock
  | ButtonBlock
  | ImageBlock
  | DividerBlock
  | SpacerBlock
  | SocialBlock
  | FooterBlock
  | ColumnsBlock
  | HtmlBlock;

export interface DesignSettings {
  backgroundColor: string;
  containerColor: string;
  contentWidth: number;
  fontFamily: string;
  /** Hidden inbox preview snippet shown next to the subject line. Optional. */
  preheaderText?: string;
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

/**
 * Real brand mark SVG path data (viewBox 0 0 24 24, single solid-color
 * glyph — matches the widely-used Simple Icons set) so both the builder's
 * React UI (social-icons.tsx) and the actual outgoing-email HTML below
 * render the real platform logo, never a placeholder text-in-circle icon.
 * "website" has no brand path — it renders a generic globe glyph instead.
 */
export const SOCIAL_ICON_PATHS: Record<Exclude<SocialPlatform, "website">, string> = {
  facebook:
    "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  instagram:
    "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.42.56.21.96.48 1.38.9.42.42.68.81.9 1.38.17.42.36 1.06.42 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.06 1.17-.25 1.8-.42 2.23a3.72 3.72 0 01-.9 1.38c-.42.42-.82.68-1.38.9-.42.17-1.06.36-2.23.42-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.06-1.8-.25-2.23-.42a3.72 3.72 0 01-1.38-.9 3.72 3.72 0 01-.9-1.38c-.17-.42-.36-1.06-.42-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.06-1.17.25-1.8.42-2.23.21-.56.48-.96.9-1.38.42-.42.81-.68 1.38-.9.42-.17 1.06-.36 2.23-.42 1.27-.06 1.65-.07 4.85-.07zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.38A5.88 5.88 0 00.63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.66.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.89 5.89 0 002.13-1.38 5.89 5.89 0 001.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.89 5.89 0 00-1.38-2.13A5.89 5.89 0 0019.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1012 18.16 6.16 6.16 0 0012 5.84zm0 10.16A4 4 0 1112 8a4 4 0 010 8zM18.41 5.6a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z",
  x: "M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.49h2.04L6.49 3.24H4.3z",
  linkedin:
    "M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.56V9h3.56zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z",
  youtube:
    "M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.51 0-9.38.5A3.02 3.02 0 00.5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 002.12 2.14c1.87.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 002.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12z",
};

/** Generic filled globe glyph for the "website" platform (no brand mark of its own). */
const GLOBE_PATH =
  "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.9 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.89-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z";

export const SOCIAL_META: Record<SocialPlatform, { label: string; color: string }> = {
  facebook: { label: "Facebook", color: "#1877f2" },
  instagram: { label: "Instagram", color: "#e1306c" },
  x: { label: "X / Twitter", color: "#0f1419" },
  linkedin: { label: "LinkedIn", color: "#0a66c2" },
  youtube: { label: "YouTube", color: "#ff0000" },
  website: { label: "Website", color: "#475569" },
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
    preheaderText: "",
  };
}

export const DEFAULT_SPACING: Record<string, number> = {
  heading: 16,
  text: 16,
  button: 20,
  image: 20,
  social: 20,
  columns: 20,
};

export function createBlock(type: EmailBlock["type"]): EmailBlock {
  const id = newBlockId();
  switch (type) {
    case "heading":
      return { id, type, text: "Your headline here", align: "left", color: "#1f2430", fontSize: 24 };
    case "text":
      return { id, type, text: "Write your message here. You can use merge tags like {{first_name}} to personalize it.", align: "left", color: "#475569", fontSize: 15 };
    case "button":
      return { id, type, text: "Call to action", url: "https://", align: "center", bgColor: "#059669", textColor: "#ffffff", borderRadius: 10, style: "solid", fullWidth: false };
    case "image":
      return { id, type, src: "", alt: "", link: "", width: 100, align: "center" };
    case "divider":
      return { id, type, color: "#e5e7eb", lineStyle: "solid", thickness: 1 };
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
    case "columns":
      return {
        id,
        type,
        left: { type: "text", text: "Left column text.", color: "#475569", fontSize: 14, src: "", alt: "" },
        right: { type: "text", text: "Right column text.", color: "#475569", fontSize: 14, src: "", alt: "" },
        gap: 20,
      };
    case "html":
      return { id, type, html: "<!-- Paste custom HTML here -->" };
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
      { id: newBlockId(), type: "button", text: "Visit website", url: "{{join_link}}", align: "center", bgColor: "#059669", textColor: "#ffffff", borderRadius: 10, style: "solid", fullWidth: false },
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

function renderColumnCell(cell: ColumnCell, fontFamily: string): string {
  if (cell.type === "image") {
    return cell.src
      ? `<img src="${escapeHtml(cell.src)}" alt="${escapeHtml(cell.alt)}" width="100%" style="display:block;width:100%;height:auto;border:0;" />`
      : "";
  }
  const lines = cell.text.split("\n").map((l) => escapeHtml(l)).join("<br/>");
  return `<span style="font-family:${fontFamily};color:${cell.color};font-size:${cell.fontSize}px;line-height:1.6;">${lines}</span>`;
}

function renderBlock(block: EmailBlock, settings: DesignSettings): string {
  switch (block.type) {
    case "heading":
      return `<h1 style="margin:0 0 ${block.spacing ?? DEFAULT_SPACING.heading}px;font-family:${settings.fontFamily};color:${block.color};font-size:${block.fontSize}px;font-weight:700;text-align:${alignToTextAlign(block.align)};line-height:1.3;">${escapeHtml(block.text)}</h1>`;

    case "text": {
      const lines = block.text.split("\n").map((l) => escapeHtml(l)).join("<br/>");
      return `<p style="margin:0 0 ${block.spacing ?? DEFAULT_SPACING.text}px;font-family:${settings.fontFamily};color:${block.color};font-size:${block.fontSize}px;font-weight:${block.bold ? 700 : 400};line-height:1.6;text-align:${alignToTextAlign(block.align)};">${lines}</p>`;
    }

    case "button": {
      const isOutline = block.style === "outline";
      const btnStyle = isOutline
        ? `background-color:transparent;color:${block.bgColor};border:2px solid ${block.bgColor};`
        : `background-color:${block.bgColor};color:${block.textColor};border:2px solid ${block.bgColor};`;
      const widthStyle = block.fullWidth ? "display:block;width:100%;box-sizing:border-box;" : "display:inline-block;";
      return `<div style="margin:0 0 ${block.spacing ?? DEFAULT_SPACING.button}px;text-align:${alignToTextAlign(block.align)};"><a href="${escapeHtml(block.url)}" style="${widthStyle}${btnStyle}text-decoration:none;padding:13px 32px;border-radius:${block.borderRadius}px;font-family:${settings.fontFamily};font-weight:600;font-size:14px;text-align:center;">${escapeHtml(block.text)}</a></div>`;
    }

    case "image": {
      const img = `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" width="${block.width}%" style="display:block;max-width:${block.width}%;width:${block.width}%;height:auto;margin:${block.align === "center" ? "0 auto" : block.align === "right" ? "0 0 0 auto" : "0"};border:0;" />`;
      const wrapped = block.link ? `<a href="${escapeHtml(block.link)}" style="text-decoration:none;">${img}</a>` : img;
      return `<div style="margin:0 0 ${block.spacing ?? DEFAULT_SPACING.image}px;text-align:${alignToTextAlign(block.align)};">${wrapped}</div>`;
    }

    case "divider":
      return `<hr style="margin:20px 0;border:none;border-top:${block.thickness ?? 1}px ${block.lineStyle ?? "solid"} ${block.color};" />`;

    case "spacer":
      return `<div style="height:${block.height}px;line-height:${block.height}px;font-size:1px;">&nbsp;</div>`;

    case "social": {
      // Table-cell centering (align/valign on a <td>) rather than
      // vertical-align:middle on an inline SVG — the latter aligns to a
      // point derived from font baseline/x-height metrics, not the true
      // pixel center of the line box, which left icons visibly off-center
      // inside their circular badges. Table alignment is also the one
      // centering technique that behaves consistently in Outlook.
      const icons = block.links
        .map((l) => {
          const meta = SOCIAL_META[l.platform];
          const path = l.platform === "website" ? GLOBE_PATH : SOCIAL_ICON_PATHS[l.platform];
          return `<a href="${escapeHtml(l.url)}" style="display:inline-block;margin:0 6px;text-decoration:none;"><table role="presentation" width="32" height="32" cellpadding="0" cellspacing="0" style="width:32px;height:32px;border-radius:50%;background-color:${meta.color};"><tr><td align="center" valign="middle" style="width:32px;height:32px;border-radius:50%;line-height:1;"><svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" style="display:inline-block;vertical-align:middle;"><path d="${path}"/></svg></td></tr></table></a>`;
        })
        .join("");
      return `<div style="margin:0 0 ${block.spacing ?? DEFAULT_SPACING.social}px;text-align:${alignToTextAlign(block.align)};font-size:0;">${icons}</div>`;
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

    case "columns": {
      const half = `calc(50% - ${block.gap / 2}px)`;
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 ${block.spacing ?? DEFAULT_SPACING.columns}px;"><tr>
  <td valign="top" style="width:${half};padding-right:${block.gap / 2}px;">${renderColumnCell(block.left, settings.fontFamily)}</td>
  <td valign="top" style="width:${half};padding-left:${block.gap / 2}px;">${renderColumnCell(block.right, settings.fontFamily)}</td>
</tr></table>`;
    }

    case "html":
      // Deliberately unescaped — this block exists specifically so
      // admins/editors can drop in hand-written HTML. Same trust level as
      // the raw "HTML Code" editor mode, which already allows this.
      return block.html;
  }
}

export function renderBlocksToHtml(design: EmailDesign): string {
  const inner = design.blocks.map((b) => renderBlock(b, design.settings)).join("\n");

  // Hidden preview text shown next to the subject line in most inbox list
  // views. Padded with zero-width joiners so the client doesn't fall
  // through into rendering the start of the real body as the preview.
  const preheader = design.settings.preheaderText
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(design.settings.preheaderText)}${"&zwnj;&nbsp;".repeat(40)}</div>`
    : "";

  return `${preheader}<div style="font-family:${design.settings.fontFamily};max-width:${design.settings.contentWidth}px;margin:0 auto;padding:28px 16px;background-color:${design.settings.backgroundColor};">
  <div style="background-color:${design.settings.containerColor};padding:32px;border-radius:16px;border:1px solid rgba(0,0,0,0.06);box-shadow:0 1px 3px rgba(16,24,40,0.04);">
${inner}
  </div>
</div>`;
}

/** Loose validation that a parsed design_json blob actually looks like an EmailDesign. */
export function isValidDesign(value: any): value is EmailDesign {
  return !!value && typeof value === "object" && Array.isArray(value.blocks) && !!value.settings;
}
