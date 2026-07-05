import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailSubscriber from "@/models/EmailSubscriber";
import EmailEvent from "@/models/EmailEvent";
import EmailCampaign from "@/models/EmailCampaign";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, campaignId, resubscribe } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (resubscribe) {
      // Re-subscribe the user
      await EmailSubscriber.findOneAndUpdate(
        { email: cleanEmail },
        { status: "subscribed" },
        { upsert: true }
      );

      if (campaignId) {
        // Log resubscribe event (re-subscription is logged as standard database record update)
        await EmailEvent.create({
          campaign_id: campaignId,
          recipient_email: cleanEmail,
          event_type: "sent", // Mock standard status log
          details: { action: "resubscribe" },
          timestamp: new Date(),
        });
      }

      return NextResponse.json({ success: true, message: "Successfully resubscribed" });
    } else {
      // Unsubscribe the user
      const subscriber = await EmailSubscriber.findOneAndUpdate(
        { email: cleanEmail },
        { status: "unsubscribed" }
      );

      if (campaignId) {
        // Check if they already unsubscribed from this campaign
        const alreadyUnsubscribed = await EmailEvent.exists({
          campaign_id: campaignId,
          recipient_email: cleanEmail,
          event_type: "unsubscribe",
        });

        // 1. Log unsubscribe event
        await EmailEvent.create({
          campaign_id: campaignId,
          recipient_email: cleanEmail,
          event_type: "unsubscribe",
          timestamp: new Date(),
        });

        // 2. Increment stats on campaign
        if (!alreadyUnsubscribed) {
          await EmailCampaign.findByIdAndUpdate(campaignId, {
            $inc: { "stats.unsubscribed": 1 },
          });
        }
      } else {
        // Just log general unsubscribe
        await EmailEvent.create({
          recipient_email: cleanEmail,
          event_type: "unsubscribe",
          timestamp: new Date(),
        });
      }

      return NextResponse.json({ success: true, message: "Successfully unsubscribed" });
    }
  } catch (error: any) {
    console.error("Unsubscribe API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
