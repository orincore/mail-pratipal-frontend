import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailEvent from "@/models/EmailEvent";
import EmailCampaign from "@/models/EmailCampaign";

// 1x1 transparent GIF base64
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

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
  } else if (ua.includes("msie") || ua.includes("trident")) {
    browser = "ie";
  }

  return { deviceType, browser };
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const campaignId = searchParams.get("campaignId");
    const email = searchParams.get("email");

    if (campaignId && email) {
      await connectDB();

      const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
      const userAgent = req.headers.get("user-agent") || "";
      const { deviceType, browser } = parseUserAgent(userAgent);

      // Check if this subscriber has already opened this campaign
      const alreadyOpened = await EmailEvent.exists({
        campaign_id: campaignId,
        recipient_email: email.toLowerCase(),
        event_type: "open",
      });

      // 1. Create a detailed email log event
      await EmailEvent.create({
        campaign_id: campaignId,
        recipient_email: email.toLowerCase(),
        event_type: "open",
        ip_address: ipAddress,
        user_agent: userAgent,
        device_type: deviceType,
        browser,
        timestamp: new Date(),
      });

      // 2. Increment stats on the campaign if this is a unique open
      if (!alreadyOpened) {
        await EmailCampaign.findByIdAndUpdate(campaignId, {
          $inc: { "stats.opens": 1 },
        });
      }
    }
  } catch (error) {
    console.error("Open tracking error:", error);
  }

  // Always return the transparent 1x1 GIF to prevent broken image displays
  return new NextResponse(TRANSPARENT_GIF_BUFFER, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
