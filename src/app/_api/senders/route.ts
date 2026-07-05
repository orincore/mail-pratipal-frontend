import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailSender from "@/models/EmailSender";
import { getEmailProvider } from "@/providers/provider-factory";
import { checkApiAuth } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  const admin = checkApiAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const provider = getEmailProvider();
    const senders = await EmailSender.find().sort({ created_at: -1 });

    const updatedSenders = [];

    // Sync validation state with AWS SES in real time
    for (const s of senders) {
      try {
        const rawStatus = await provider.getEmailIdentityVerificationStatus(s.email);
        const lowerStatus = rawStatus.toLowerCase();
        s.verification_status = (
          lowerStatus === "success" ? "verified" :
          lowerStatus === "notfound" ? "failed" : 
          lowerStatus
        ) as any;
        await s.save();
        updatedSenders.push(s);
      } catch (err) {
        console.error(`Failed to sync SES status for email identity ${s.email}:`, err);
        updatedSenders.push(s); // Fallback to cached DB record on SES query errors
      }
    }

    return NextResponse.json(updatedSenders);
  } catch (error: any) {
    console.error("GET senders error:", error);
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
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email identity is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email already exists
    const exists = await EmailSender.exists({ email: cleanEmail });
    if (exists) {
      return NextResponse.json({ error: "Email identity is already registered" }, { status: 400 });
    }

    const provider = getEmailProvider();
    
    // Request AWS SES verification email to be sent
    await provider.verifyEmailIdentity(cleanEmail);

    const emailSender = await EmailSender.create({
      email: cleanEmail,
      verification_status: "pending",
    });

    return NextResponse.json({ success: true, sender: emailSender });
  } catch (error: any) {
    console.error("POST sender error:", error);
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
      return NextResponse.json({ error: "Sender ID is required" }, { status: 400 });
    }

    const emailSender = await EmailSender.findById(id);
    if (!emailSender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }

    const provider = getEmailProvider();
    
    // Try to remove from SES identity list
    if (typeof (provider as any).deleteIdentity === "function") {
      try {
        await (provider as any).deleteIdentity(emailSender.email);
      } catch (err) {
        console.warn(`Could not delete email identity from SES service:`, err);
      }
    }

    await EmailSender.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Email identity deleted successfully" });
  } catch (error: any) {
    console.error("DELETE sender error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
