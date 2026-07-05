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
      scheduled_at
    } = body;

    if (!name || !subject || !sender_name || !sender_email || !template_id) {
      return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });
    }

    const scheduledDate = schedule_type === "scheduled" && scheduled_at 
      ? new Date(scheduled_at) 
      : new Date(); // Immediate sends are scheduled for now

    const campaign = await EmailCampaign.create({
      name,
      subject,
      sender_name,
      sender_email,
      reply_to,
      template_id,
      audience,
      schedule_type,
      scheduled_at: scheduledDate,
      status: schedule_type === "immediate" ? "sending" : "scheduled", // Immediately put into worker processing loop
      stats: { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, complaints: 0, unsubscribed: 0 }
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
