import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";

export const dynamic = "force-dynamic";
import EmailCampaign from "@/models/EmailCampaign";
import EmailEvent from "@/models/EmailEvent";
import { checkApiAuthAsync } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  const admin = await checkApiAuthAsync(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    // 1. Fetch upcoming scheduled campaigns / reminders
    const upcomingSchedules = await EmailCampaign.find({
      status: "scheduled",
      scheduled_at: { $gte: new Date() }
    })
    .sort({ scheduled_at: 1 })
    .select("name channel scheduled_at")
    .limit(5);

    // Map scheduled campaigns to notification objects
    const scheduledNotifications = upcomingSchedules.map((camp) => ({
      id: `scheduled-${camp._id}`,
      type: "scheduled",
      title: camp.name,
      message: `Scheduled run via ${camp.channel} at ${new Date(camp.scheduled_at).toLocaleString("en-IN")}`,
      timestamp: camp.scheduled_at,
      badgeColor: camp.channel === "whatsapp" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700",
      channel: camp.channel
    }));

    // 2. Fetch recent bounces (last 24 hours)
    const activeSince = new Date();
    activeSince.setHours(activeSince.getHours() - 24);

    const recentBounces = await EmailEvent.find({
      event_type: { $in: ["bounce", "complaint"] },
      timestamp: { $gte: activeSince }
    })
    .sort({ timestamp: -1 })
    .limit(5);

    const alertNotifications = recentBounces.map((bounce) => ({
      id: `alert-${bounce._id}`,
      type: "alert",
      title: `Delivery Failure: ${bounce.event_type}`,
      message: `Permanent bounce detected for ${bounce.recipient_email}`,
      timestamp: bounce.timestamp,
      badgeColor: "bg-rose-100 text-rose-700",
      channel: bounce.channel || "email"
    }));

    // Combine them (schedules first, then failure alerts)
    const allNotifications = [...scheduledNotifications, ...alertNotifications];

    return NextResponse.json(allNotifications);
  } catch (error: any) {
    console.error("Notifications API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
