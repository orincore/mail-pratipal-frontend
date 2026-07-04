import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailDomain from "@/models/EmailDomain";
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
    const domains = await EmailDomain.find().sort({ created_at: -1 });

    const updatedDomains = [];
    
    // Sync verification status with provider in real time
    for (const d of domains) {
      try {
        const liveStatus = await provider.getDomainVerificationStatus(d.domain);
        
        const mapVerification = liveStatus.verificationStatus.toLowerCase();
        const mapDkim = liveStatus.dkimStatus.toLowerCase();
        
        d.verification_status = (
          mapVerification === "success" ? "verified" :
          mapVerification === "notfound" ? "failed" :
          mapVerification
        ) as any;
        
        d.dkim_status = (
          mapDkim === "success" ? "verified" :
          mapDkim === "notfound" ? "failed" :
          mapDkim
        ) as any;
        
        await d.save();
        updatedDomains.push(d);
      } catch (err) {
        console.error(`Failed to sync SES status for domain ${d.domain}:`, err);
        updatedDomains.push(d); // Fallback to cached DB record on SES fetch error
      }
    }

    return NextResponse.json(updatedDomains);
  } catch (error: any) {
    console.error("GET domains error:", error);
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
    const { domain } = await req.json();

    if (!domain) {
      return NextResponse.json({ error: "Domain name is required" }, { status: 400 });
    }

    const cleanDomain = domain.toLowerCase().trim();

    // Check if domain is already registered
    const exists = await EmailDomain.exists({ domain: cleanDomain });
    if (exists) {
      return NextResponse.json({ error: "Domain is already registered" }, { status: 400 });
    }

    const provider = getEmailProvider();
    
    // Verify on AWS SES (gets verification TXT and CNAME Easy DKIM tokens)
    const sesVerification = await provider.verifyDomain(cleanDomain);

    const emailDomain = await EmailDomain.create({
      domain: cleanDomain,
      verification_token: sesVerification.verificationToken,
      dkim_tokens: sesVerification.dkimTokens,
      verification_status: "pending",
      dkim_status: "pending",
    });

    return NextResponse.json({ success: true, domain: emailDomain });
  } catch (error: any) {
    console.error("POST domain error:", error);
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
      return NextResponse.json({ error: "Domain ID is required" }, { status: 400 });
    }

    const emailDomain = await EmailDomain.findById(id);
    if (!emailDomain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    const provider = getEmailProvider();
    
    // Attempt deleting domain from SES identity list
    if (typeof (provider as any).deleteIdentity === "function") {
      try {
        await (provider as any).deleteIdentity(emailDomain.domain);
      } catch (err) {
        console.warn(`Could not delete domain identity from SES service:`, err);
      }
    }

    await EmailDomain.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Domain deleted successfully" });
  } catch (error: any) {
    console.error("DELETE domain error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
