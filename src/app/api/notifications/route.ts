import { NextRequest, NextResponse } from "next/server";
import { checkApiAuthAsync } from "@/lib/auth-helper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await checkApiAuthAsync(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
    const token = req.cookies.get("pratipal_session")?.value;

    const notifRes = await fetch(`${backendUrl}/api/notifications`, {
      headers: {
        Cookie: `pratipal_session=${token}`,
      },
      next: { revalidate: 0 },
      cache: "no-store"
    });

    if (!notifRes.ok) {
      const errText = await notifRes.text();
      return NextResponse.json({ error: `Backend error: ${errText}` }, { status: notifRes.status });
    }

    const data = await notifRes.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Notifications API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
