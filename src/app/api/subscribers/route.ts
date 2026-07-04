import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailSubscriber from "@/models/EmailSubscriber";
import { checkApiAuth } from "@/lib/auth-helper";
import { z } from "zod";

const SubscriberCreateSchema = z.object({
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  status: z.enum(["subscribed", "unsubscribed", "bounced", "complained", "pending"]).default("subscribed"),
  lists: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
});

export async function GET(req: NextRequest) {
  const admin = checkApiAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const list = searchParams.get("list") || "";
    const tag = searchParams.get("tag") || "";
    const status = searchParams.get("status") || "";

    const query: any = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
      ];
    }

    if (list) {
      query.lists = list;
    }

    if (tag) {
      query.tags = tag;
    }

    if (status) {
      query.status = status;
    }

    // Load subscribers
    const subscribers = await EmailSubscriber.find(query).sort({ created_at: -1 });
    
    // Aggregate unique lists and tags for filtering UI
    const allLists = await EmailSubscriber.distinct("lists");
    const allTags = await EmailSubscriber.distinct("tags");

    return NextResponse.json({
      subscribers,
      lists: allLists.filter(Boolean),
      tags: allTags.filter(Boolean),
    });
  } catch (error: any) {
    console.error("GET subscribers error:", error);
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
    const result = SubscriberCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { email, first_name, last_name, status, lists, tags, metadata } = result.data;
    const cleanEmail = email.toLowerCase().trim();

    // Check if email already exists
    const exists = await EmailSubscriber.exists({ email: cleanEmail });
    if (exists) {
      return NextResponse.json({ error: "Subscriber email already exists" }, { status: 400 });
    }

    const subscriber = await EmailSubscriber.create({
      email: cleanEmail,
      first_name,
      last_name,
      status,
      lists,
      tags,
      metadata,
    });

    return NextResponse.json({ success: true, subscriber });
  } catch (error: any) {
    console.error("POST subscriber error:", error);
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
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: "Subscriber ID is required" }, { status: 400 });
    }

    if (updateFields.email) {
      updateFields.email = updateFields.email.toLowerCase().trim();
    }

    const subscriber = await EmailSubscriber.findByIdAndUpdate(id, updateFields, { new: true });
    if (!subscriber) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 444 });
    }

    return NextResponse.json({ success: true, subscriber });
  } catch (error: any) {
    console.error("PUT subscriber error:", error);
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
      return NextResponse.json({ error: "Subscriber ID is required" }, { status: 400 });
    }

    const subscriber = await EmailSubscriber.findByIdAndDelete(id);
    if (!subscriber) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Subscriber deleted successfully" });
  } catch (error: any) {
    console.error("DELETE subscriber error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
