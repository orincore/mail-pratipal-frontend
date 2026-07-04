import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailSubscriber from "@/models/EmailSubscriber";
import { checkApiAuth } from "@/lib/auth-helper";

export async function POST(req: NextRequest) {
  const admin = checkApiAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { subscribers, defaultLists = [], defaultTags = [] } = await req.json();

    if (!Array.isArray(subscribers) || subscribers.length === 0) {
      return NextResponse.json({ error: "No subscribers data provided" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const ops = [];

    for (const sub of subscribers) {
      if (!sub.email || !emailRegex.test(sub.email)) {
        continue; // Skip invalid records
      }

      const email = sub.email.toLowerCase().trim();
      const first_name = sub.first_name || sub.firstName || "";
      const last_name = sub.last_name || sub.lastName || "";
      
      // Combine row lists/tags with default lists/tags selected in UI
      const rowLists = Array.isArray(sub.lists) ? sub.lists : (sub.lists ? [sub.lists] : []);
      const rowTags = Array.isArray(sub.tags) ? sub.tags : (sub.tags ? [sub.tags] : []);
      
      const combinedLists = Array.from(new Set([...rowLists, ...defaultLists])).filter(Boolean);
      const combinedTags = Array.from(new Set([...rowTags, ...defaultTags])).filter(Boolean);

      ops.push({
        updateOne: {
          filter: { email },
          update: {
            $set: {
              first_name,
              last_name,
              status: "subscribed",
            },
            $addToSet: {
              lists: { $each: combinedLists },
              tags: { $each: combinedTags },
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length === 0) {
      return NextResponse.json({ error: "No valid subscriber records found in payload" }, { status: 400 });
    }

    // Execute bulk write operations
    const bulkWriteResult = await EmailSubscriber.bulkWrite(ops);

    return NextResponse.json({
      success: true,
      importedCount: bulkWriteResult.upsertedCount + bulkWriteResult.modifiedCount,
      inserted: bulkWriteResult.upsertedCount,
      updated: bulkWriteResult.modifiedCount,
    });
  } catch (error: any) {
    console.error("Bulk import API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
