import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailCampaign from "@/models/EmailCampaign";
import { checkApiAuth } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  const admin = checkApiAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const campaigns = await EmailCampaign.find()
      .sort({ created_at: -1 })
      .populate("template_id", "name");
      
    return NextResponse.json(campaigns);
  } catch (error: any) {
    console.error("GET campaigns error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = checkApiAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await req.json();
        const { 
      name, 
      subject, 
      sender_name, 
      sender_email, 
      reply_to, 
      template_id, 
      audience, 
      schedule_type,
      scheduled_at,
      channel,
      whatsapp_template
    } = body;

    const resolvedChannel = channel || "email";
    if (!name) {
      return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
    }

    if (resolvedChannel !== "whatsapp" && (!subject || !sender_name || !sender_email || !template_id)) {
      return NextResponse.json({ error: "Email configuration fields are required for email channel" }, { status: 400 });
    }

    if (resolvedChannel !== "email" && !whatsapp_template) {
      return NextResponse.json({ error: "WhatsApp template is required for WhatsApp channel" }, { status: 400 });
    }

    const scheduledDate = schedule_type === "scheduled" && scheduled_at 
      ? new Date(scheduled_at) 
      : new Date(); // Immediate sends are scheduled for now

    const campaign = await EmailCampaign.create({
      name,
      subject: resolvedChannel !== "whatsapp" ? subject : undefined,
      sender_name: resolvedChannel !== "whatsapp" ? sender_name : undefined,
      sender_email: resolvedChannel !== "whatsapp" ? sender_email : undefined,
      reply_to: resolvedChannel !== "whatsapp" ? reply_to : undefined,
      template_id: resolvedChannel !== "whatsapp" ? template_id : undefined,
      channel: resolvedChannel,
      whatsapp_template: resolvedChannel !== "email" ? whatsapp_template : undefined,
      audience,
      schedule_type,
      scheduled_at: scheduledDate,
      status: schedule_type === "immediate" ? "sending" : "scheduled", // Immediately put into worker processing loop
      dispatch_status: resolvedChannel === "whatsapp" ? "skipped" : "pending",
      whatsapp_dispatch_status: resolvedChannel === "email" ? "skipped" : "pending",
      stats: {
        sent: 0,
        delivered: 0,
        opens: 0,
        clicks: 0,
        bounces: 0,
        complaints: 0,
        unsubscribed: 0,
        whatsapp_sent: 0,
        whatsapp_failed: 0,
      }
    });

    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    console.error("POST campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const admin = checkApiAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await req.json();
    const { id, action, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    const campaign = await EmailCampaign.findById(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Toggle runtime campaign status
    if (action === "pause") {
      if (campaign.status === "sending" || campaign.status === "scheduled") {
        campaign.status = "paused";
        await campaign.save();
        return NextResponse.json({ success: true, campaign });
      } else {
        return NextResponse.json({ error: "Only active campaigns can be paused" }, { status: 400 });
      }
    } 
    
    if (action === "resume") {
      if (campaign.status === "paused") {
        campaign.status = "sending";
        await campaign.save();
        return NextResponse.json({ success: true, campaign });
      } else {
        return NextResponse.json({ error: "Only paused campaigns can be resumed" }, { status: 400 });
      }
    }

    if (action === "cancel") {
      if (campaign.status === "sending" || campaign.status === "scheduled" || campaign.status === "paused") {
        campaign.status = "cancelled";
        await campaign.save();
        return NextResponse.json({ success: true, campaign });
      } else {
        return NextResponse.json({ error: "Campaign cannot be cancelled in current status" }, { status: 400 });
      }
    }

    // Basic updating for drafts
    const updatedCampaign = await EmailCampaign.findByIdAndUpdate(id, updateFields, { new: true });
    return NextResponse.json({ success: true, campaign: updatedCampaign });
  } catch (error: any) {
    console.error("PUT campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = checkApiAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    const campaign = await EmailCampaign.findByIdAndDelete(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Campaign deleted successfully" });
  } catch (error: any) {
    console.error("DELETE campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
