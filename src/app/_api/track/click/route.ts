import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailEvent from "@/models/EmailEvent";
import EmailCampaign from "@/models/EmailCampaign";

function parseUserAgent(userAgentString: string) {
  const ua = userAgentString.toLowerCase();
  
  // Device Type
  let deviceType = "desktop";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|webos/.test(ua)) {
    deviceType = "mobile";
  } else if (/ipad|tablet/.test(ua)) {
    deviceType = "tablet";
  }

  // Browser Name
  let browser = "other";
  if (ua.includes("firefox")) {
    browser = "firefox";
  } else if (ua.includes("chrome") || ua.includes("chromium")) {
    browser = "chrome";
  } else if (ua.includes("safari")) {
    browser = "safari";
  } else if (ua.includes("edge")) {
    browser = "edge";
  }

  return { deviceType, browser };
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const campaignId = searchParams.get("campaignId");
  const email = searchParams.get("email");
  const url = searchParams.get("url") || "";

  // Fallback destination in case of parsing errors
  const fallbackUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || "https://pratipal.in";
  const destinationUrl = url ? decodeURIComponent(url) : fallbackUrl;

  try {
    if (campaignId && email) {
      await connectDB();

      const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
      const userAgent = req.headers.get("user-agent") || "";
      const { deviceType, browser } = parseUserAgent(userAgent);

      // Check if this subscriber has already clicked a link in this campaign
      const alreadyClicked = await EmailEvent.exists({
        campaign_id: campaignId,
        recipient_email: email.toLowerCase(),
        event_type: "click",
      });

      // 1. Log detailed click event in database
      await EmailEvent.create({
        campaign_id: campaignId,
        recipient_email: email.toLowerCase(),
        event_type: "click",
        link_url: destinationUrl,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_type: deviceType,
        browser,
        timestamp: new Date(),
      });

      // 2. Increment stats on the campaign if this is a unique click (Unique Click Rate)
      if (!alreadyClicked) {
        await EmailCampaign.findByIdAndUpdate(campaignId, {
          $inc: { "stats.clicks": 1 },
        });
      }
    }
  } catch (error) {
    console.error("Click tracking error:", error);
  }

  // Perform 302 redirection to original target URL
  return NextResponse.redirect(new URL(destinationUrl), 302);
}
