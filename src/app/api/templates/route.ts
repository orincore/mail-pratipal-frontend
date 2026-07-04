import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailTemplate from "@/models/EmailTemplate";
import { checkApiAuth } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  const admin = checkApiAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const templates = await EmailTemplate.find().sort({ updated_at: -1 });
    return NextResponse.json(templates);
  } catch (error: any) {
    console.error("GET templates error:", error);
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
    const { name, subject, html_content, design_json, type = "builder" } = await req.json();

    if (!name || !html_content) {
      return NextResponse.json({ error: "Name and HTML content are required" }, { status: 400 });
    }

    const template = await EmailTemplate.create({
      name,
      subject,
      html_content,
      design_json,
      type,
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("POST template error:", error);
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
    const { id, name, subject, html_content, design_json, type } = await req.json();

    if (!id || !name || !html_content) {
      return NextResponse.json({ error: "ID, name and HTML content are required" }, { status: 400 });
    }

    const template = await EmailTemplate.findByIdAndUpdate(
      id,
      { name, subject, html_content, design_json, type },
      { new: true }
    );

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("PUT template error:", error);
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
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    const template = await EmailTemplate.findByIdAndDelete(id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Template deleted successfully" });
  } catch (error: any) {
    console.error("DELETE template error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
