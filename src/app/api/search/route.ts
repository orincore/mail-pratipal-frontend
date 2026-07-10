import { NextRequest, NextResponse } from "next/server";
import { checkApiAuthAsync } from "@/lib/auth-helper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await checkApiAuthAsync(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q") || "";
  if (!query || query.trim().length < 2) {
    return NextResponse.json({
      navigation: [],
      campaigns: [],
      reminders: [],
      templates: [],
      subscribers: []
    });
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
    const token = req.cookies.get("pratipal_session")?.value;

    const searchRes = await fetch(`${backendUrl}/api/search?q=${encodeURIComponent(query)}`, {
      headers: {
        Cookie: `pratipal_session=${token}`,
      },
      next: { revalidate: 0 },
      cache: "no-store"
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      return NextResponse.json({ error: `Backend error: ${errText}` }, { status: searchRes.status });
    }

    const data = await searchRes.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Search endpoint error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
