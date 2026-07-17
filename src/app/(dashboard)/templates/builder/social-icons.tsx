// Real brand marks (not placeholder text-in-circle icons), inlined as SVG
// path data so no extra icon-library dependency is needed and the exact
// same glyph can be used both in the builder's React UI and in the raw
// HTML rendered into actual outgoing emails (blocks.ts). Paths match the
// widely-used Simple Icons brand mark set, viewBox 0 0 24 24.
import React from "react";
import { Globe } from "lucide-react";
import type { SocialPlatform } from "./blocks";

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

type IconProps = { className?: string };

function PathIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d={path} />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return <PathIcon path={SOCIAL_ICON_PATHS.facebook} {...props} />;
}
export function InstagramIcon(props: IconProps) {
  return <PathIcon path={SOCIAL_ICON_PATHS.instagram} {...props} />;
}
export function XIcon(props: IconProps) {
  return <PathIcon path={SOCIAL_ICON_PATHS.x} {...props} />;
}
export function LinkedinIcon(props: IconProps) {
  return <PathIcon path={SOCIAL_ICON_PATHS.linkedin} {...props} />;
}
export function YoutubeIcon(props: IconProps) {
  return <PathIcon path={SOCIAL_ICON_PATHS.youtube} {...props} />;
}
export const WebsiteIcon = Globe;

export const SOCIAL_ICON_COMPONENTS: Record<SocialPlatform, React.ComponentType<IconProps>> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  x: XIcon,
  linkedin: LinkedinIcon,
  youtube: YoutubeIcon,
  website: WebsiteIcon,
};
