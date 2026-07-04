import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
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
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    // Query storefront customers collection directly
    const customersCollection = db.collection("customers");
    const customers = await customersCollection.find().toArray();

    if (customers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No storefront customers found to sync.",
        syncedCount: 0,
      });
    }

    const ops = [];
    const syncList = "Storefront Customers";
    const syncTag = "storefront";

    for (const cust of customers) {
      if (!cust.email) continue;

      const email = cust.email.toLowerCase().trim();
      const first_name = cust.first_name || "";
      const last_name = cust.last_name || "";

      ops.push({
        updateOne: {
          filter: { email },
          update: {
            $setOnInsert: {
              first_name,
              last_name,
              status: "subscribed",
            },
            $addToSet: {
              lists: syncList,
              tags: syncTag,
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length === 0) {
      return NextResponse.json({ error: "No valid customer records found" }, { status: 400 });
    }

    // Execute bulk write
    const result = await EmailSubscriber.bulkWrite(ops);

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized customers.`,
      syncedCount: result.upsertedCount + result.modifiedCount,
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      totalCustomers: customers.length,
    });
  } catch (error: any) {
    console.error("Sync customers API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
