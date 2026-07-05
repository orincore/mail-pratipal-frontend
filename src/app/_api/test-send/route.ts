import { NextRequest, NextResponse } from "next/server";
import { getEmailProvider } from "@/providers/provider-factory";
import { checkApiAuth } from "@/lib/auth-helper";

export async function POST(req: NextRequest) {
  const admin = checkApiAuth(req);
  
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { to, subject, html, fromName = "Pratipal Test", fromEmail = "support@notifications.pratipal.in" } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Required fields (to, subject, html) are missing" }, { status: 400 });
    }

    const provider = getEmailProvider();
    
    console.log(`Test Send: Dispatching test email to ${to} via ${process.env.EMAIL_PROVIDER || "auto-detected driver"}`);
    
    const result = await provider.sendEmail({
      to,
      fromName,
      fromEmail,
      subject,
      html,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      dispatched_at: new Date().toISOString(),
      provider: process.env.EMAIL_PROVIDER || "auto-detected",
    });
  } catch (error: any) {
    console.error("Test send API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
