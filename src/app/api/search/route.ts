import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";

export const dynamic = "force-dynamic";

import EmailCampaign from "@/models/EmailCampaign";
import EmailSubscriber from "@/models/EmailSubscriber";
import EmailTemplate from "@/models/EmailTemplate";
import Webinar from "@/models/Webinar";
import WebinarReminder from "@/models/WebinarReminder";
import { checkApiAuthAsync } from "@/lib/auth-helper";

function formatDate(dateInput: Date | string | undefined): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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
    await connectDB();
    const searchRegex = new RegExp(query, "i");

    // 1. Search Navigation / Pages
    // Searching for general page titles like "Reminders", "Campaigns", "Templates", "Dashboard", "Subscribers"
    const pagesList = [
      { label: "Dashboard", href: "/dashboard", desc: "View campaign analytics & metrics" },
      { label: "Subscribers", href: "/subscribers", desc: "Manage subscribers list, tags & CSV imports" },
      { label: "Campaigns", href: "/campaigns", desc: "Create, schedule and send marketing campaigns" },
      { label: "Templates", href: "/templates", desc: "Manage HTML templates & layouts" },
      { label: "Reminders", href: "/webinars", desc: "Setup WhatsApp reminder flows for webinars" },
    ];
    
    const matchedNavigation = pagesList.filter(
      (p) => searchRegex.test(p.label) || searchRegex.test(p.desc)
    );

    // 2. Search Campaigns
    const campaignsRaw = await EmailCampaign.find({
      $or: [
        { name: searchRegex },
        { subject: searchRegex }
      ]
    })
    .select("name subject scheduled_at channel")
    .limit(5);

    const matchedCampaigns = campaignsRaw.map((c) => {
      const dateStr = formatDate(c.scheduled_at);
      const tagStr = dateStr ? `${dateStr}, Campaign` : "Campaign";
      return {
        id: c._id.toString(),
        title: c.name,
        subtitle: c.subject || `${c.channel} campaign`,
        tag: tagStr,
        href: "/campaigns"
      };
    });

    // 3. Search Reminders (Webinars & WebinarReminders)
    const webinarsRaw = await Webinar.find({
      title: searchRegex
    })
    .select("title starts_at _id")
    .limit(5);

    const matchedWebinarReminders = webinarsRaw.map((w) => {
      const dateStr = formatDate(w.starts_at);
      const tagStr = dateStr ? `${dateStr}, Reminder` : "Reminder";
      return {
        id: w._id.toString(),
        title: w.title,
        subtitle: `Webinar scheduled run`,
        tag: tagStr,
        href: `/webinars/${w._id}`
      };
    });

    // Also search in WebinarReminder names if needed
    const remindersRaw = await WebinarReminder.find({
      name: searchRegex
    })
    .populate("webinar_id", "title starts_at")
    .limit(5);

    const matchedRemindersFromList = remindersRaw.map((r: any) => {
      const dateStr = formatDate(r.computed_send_at || r.webinar_id?.starts_at);
      const tagStr = dateStr ? `${dateStr}, Reminder` : "Reminder";
      return {
        id: r._id.toString(),
        title: `${r.name} - ${r.webinar_id?.title || "Webinar"}`,
        subtitle: `Reminder flow: ${r.channel}`,
        tag: tagStr,
        href: r.webinar_id ? `/webinars/${r.webinar_id._id}` : "/webinars"
      };
    });

    const combinedReminders = [...matchedWebinarReminders, ...matchedRemindersFromList].slice(0, 5);

    // 4. Search Templates
    const templatesRaw = await EmailTemplate.find({
      name: searchRegex
    })
    .select("name type subject")
    .limit(5);

    const matchedTemplates = templatesRaw.map((t) => {
      // E.g., title with category like "webinar reminder, template" or "email, template"
      const typeStr = t.type ? `${t.type}, Template` : "Template";
      return {
        id: t._id.toString(),
        title: t.name,
        subtitle: t.subject || "No Subject",
        tag: typeStr,
        href: "/templates"
      };
    });

    // 5. Search Subscribers
    const subscribersRaw = await EmailSubscriber.find({
      $or: [
        { email: searchRegex },
        { first_name: searchRegex },
        { last_name: searchRegex }
      ]
    })
    .select("email first_name last_name status")
    .limit(5);

    const matchedSubscribers = subscribersRaw.map((s) => {
      const nameStr = s.first_name ? `${s.first_name} ${s.last_name || ""}`.trim() : "";
      const tagStr = s.status ? `${s.status}, Subscriber` : "Subscriber";
      return {
        id: s._id.toString(),
        title: s.email,
        subtitle: nameStr || "Subscriber Profile",
        tag: tagStr,
        href: `/subscribers?search=${encodeURIComponent(s.email)}`
      };
    });

    return NextResponse.json({
      navigation: matchedNavigation,
      campaigns: matchedCampaigns,
      reminders: combinedReminders,
      templates: matchedTemplates,
      subscribers: matchedSubscribers
    });
  } catch (error: any) {
    console.error("Search endpoint error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
