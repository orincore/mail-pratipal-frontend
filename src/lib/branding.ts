// Compile-time white-label surface — set these NEXT_PUBLIC_BRAND_* env vars
// per client deployment instead of editing UI strings directly.
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Pratipal";
export const BRAND_WEBSITE_URL = process.env.NEXT_PUBLIC_BRAND_WEBSITE_URL || "https://pratipal.in";
export const BRAND_SUPPORT_EMAIL = process.env.NEXT_PUBLIC_BRAND_SUPPORT_EMAIL || "contact@notifications.pratipal.in";
export const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL || "/logo.png";
export const BRAND_TAGLINE = process.env.NEXT_PUBLIC_BRAND_TAGLINE || "Campaign Console";
