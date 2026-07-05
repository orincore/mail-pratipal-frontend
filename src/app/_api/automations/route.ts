import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailAutomation from "@/models/EmailAutomation";
import { checkApiAuth } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  const admin = checkApiAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const automations = await EmailAutomation.find().sort({ created_at: -1 });
    return NextResponse.json(automations);
  } catch (error: any) {
    console.error("GET automations error:", error);
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
    const { name, trigger, steps = [] } = await req.json();

    if (!name || !trigger) {
      return NextResponse.json({ error: "Name and trigger configuration are required" }, { status: 400 });
    }

    const automation = await EmailAutomation.create({
      name,
      trigger,
      steps,
      status: "draft",
      enrollments: [],
      stats: { enrolled: 0, completed: 0 }
    });

    return NextResponse.json({ success: true, automation });
  } catch (error: any) {
    console.error("POST automation error:", error);
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
    const { id, name, trigger, steps, status, enrollSubscriberId } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Automation ID is required" }, { status: 400 });
    }

    const automation = await EmailAutomation.findById(id);
    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    // Handle manual enrollment
    if (enrollSubscriberId) {
      if (automation.steps.length === 0) {
        return NextResponse.json({ error: "Cannot enroll in automation with no steps" }, { status: 400 });
      }

      // Check if subscriber is already enrolled
      const isEnrolled = automation.enrollments.some(
        (e) => e.subscriber_id.toString() === enrollSubscriberId && e.status === "active"
      );

      if (isEnrolled) {
        return NextResponse.json({ error: "Subscriber is already active in this automation" }, { status: 400 });
      }

      // Enroll subscriber at the first step
      const firstStepId = automation.steps[0].id;
      automation.enrollments.push({
        subscriber_id: enrollSubscriberId as any,
        current_step_id: firstStepId,
        next_run_at: new Date(), // run immediately
        status: "active",
        history: [],
      });
      
      automation.stats.enrolled += 1;
      await automation.save();
      return NextResponse.json({ success: true, message: "Subscriber enrolled successfully", automation });
    }

    // Direct update of properties/steps
    if (name) automation.name = name;
    if (trigger) automation.trigger = trigger;
    if (steps) automation.steps = steps;
    if (status) automation.status = status;

    await automation.save();
    return NextResponse.json({ success: true, automation });
  } catch (error: any) {
    console.error("PUT automation error:", error);
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
      return NextResponse.json({ error: "Automation ID is required" }, { status: 400 });
    }

    const automation = await EmailAutomation.findByIdAndDelete(id);
    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Automation deleted successfully" });
  } catch (error: any) {
    console.error("DELETE automation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
