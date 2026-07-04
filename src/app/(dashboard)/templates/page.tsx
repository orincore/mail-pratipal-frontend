import React from "react";
import connectDB from "@/lib/mongodb";
import EmailTemplate from "@/models/EmailTemplate";
import { FileCode, Plus, Pencil, Trash2, Eye } from "lucide-react";
import Link from "next/link";

async function seedDefaultTemplates() {
  const templates = [
    {
      name: "🌿 Welcome to Pratipal",
      subject: "Welcome to Pratipal — Your journey starts here",
      type: "builder" as const,
      design_json: {
        blocks: [
          { type: "header", text: "🌿 PRATIPAL" },
          { type: "text", text: "<h2>Welcome to the community, {{first_name}}!</h2><p>We are absolutely thrilled to have you here. At Pratipal, we believe that true healing begins when we reconnect with nature's wisdom.</p><p>Over the next few weeks, we will share simple wellness practices, special essential oils formulations, and custom routines to help you achieve balance.</p>" },
          { type: "button", text: "Explore Healing Collection", url: "https://pratipal.in/shop" },
          { type: "text", text: "<p>If you ever have questions or just want to say hi, simply hit reply to this email! We read and respond to every single message.</p><p>Warmly,<br/>The Pratipal Team</p>" }
        ]
      },
      html_content: `
        <div style="font-family:sans-serif;max-width:550px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
          <div style="background:#white;background-color:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="text-align:center;margin-bottom:24px;border-bottom:1px solid #f1f5f9;padding-bottom:16px;">
              <span style="font-size:24px;font-weight:bold;color:#059669;letter-spacing:0.05em;">🌿 PRATIPAL</span>
            </div>
            <h2 style="font-size:20px;color:#1e293b;margin-top:0;margin-bottom:12px;">Welcome to the community, {{first_name}}!</h2>
            <p style="color:#475569;line-height:1.6;font-size:14px;margin-bottom:16px;">We are absolutely thrilled to have you here. At Pratipal, we believe that true healing begins when we reconnect with nature's wisdom.</p>
            <p style="color:#475569;line-height:1.6;font-size:14px;margin-bottom:24px;">Over the next few weeks, we will share simple wellness practices, special essential oils formulations, and custom routines to help you achieve balance.</p>
            
            <div style="text-align:center;margin-bottom:28px;">
              <a href="https://pratipal.in/shop" style="display:inline-block;background:linear-gradient(135deg,#059669,#0d9488);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;box-shadow:0 4px 6px rgba(5,150,105,0.15);">Explore Healing Collection</a>
            </div>
            
            <p style="color:#475569;line-height:1.6;font-size:14px;margin-bottom:0;">If you ever have questions or just want to say hi, simply hit reply to this email! We read and respond to every single message.</p>
            <p style="color:#475569;line-height:1.6;font-size:14px;margin-top:20px;margin-bottom:0;font-weight:bold;">Warmly,<br/><span style="color:#059669;">The Pratipal Team</span></p>
          </div>
          {{unsubscribe}}
        </div>
      `
    },
    {
      name: "🎟️ Webinar Seat Confirmed",
      subject: "Seat Confirmed: Upcoming Pratipal Wellness Masterclass",
      type: "builder" as const,
      design_json: {
        blocks: [
          { type: "header", text: "🎟️ MASTERCLASS CONFIRMATION" },
          { type: "text", text: "<h2>Your seat is saved!</h2><p>Hi {{first_name}}, you are officially registered for the <b>{{webinar}}</b>.</p>" },
          { type: "button", text: "Join Masterclass Link", url: "https://pratipal.in/webinar/room" }
        ]
      },
      html_content: `
        <div style="font-family:sans-serif;max-width:550px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
          <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="text-align:center;margin-bottom:24px;border-bottom:1px solid #f1f5f9;padding-bottom:16px;">
              <span style="font-size:12px;font-weight:bold;color:#2563eb;letter-spacing:0.1em;text-transform:uppercase;">Masterclass Ticket</span>
            </div>
            <h2 style="font-size:20px;color:#1e293b;margin-top:0;margin-bottom:12px;text-align:center;">Your seat is saved!</h2>
            <p style="color:#475569;line-height:1.6;font-size:14px;text-align:center;margin-bottom:24px;">Hi {{first_name}}, you are officially registered for the <br/><strong style="color:#1e293b;font-size:16px;">{{webinar}}</strong>.</p>
            
            <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
              <div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;">Date & Time</div>
              <div style="font-size:15px;font-weight:bold;color:#0f172a;margin-top:4px;">{{date}}</div>
            </div>
 
            <div style="text-align:center;margin-bottom:20px;">
              <a href="https://pratipal.in/webinar/room" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Join Live Room →</a>
            </div>
          </div>
          {{unsubscribe}}
        </div>
      `
    },
    {
      name: "📢 Newsletter Layout",
      subject: "Latest updates and healing routines from Pratipal",
      type: "builder" as const,
      design_json: {
        blocks: [
          { type: "header", text: "📢 THE PRATIPAL NEWSLETTER" }
        ]
      },
      html_content: `
        <div style="font-family:sans-serif;max-width:550px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
          <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="text-align:center;margin-bottom:24px;border-bottom:1px solid #f1f5f9;padding-bottom:16px;">
              <span style="font-size:24px;font-weight:bold;color:#059669;letter-spacing:0.05em;">🌿 PRATIPAL</span>
            </div>
            <h2 style="font-size:18px;color:#1e293b;margin-top:0;margin-bottom:8px;">The Healing Dispatch</h2>
            <p style="color:#64748b;font-size:12px;margin-bottom:20px;">Edition: {{date}}</p>
            <p style="color:#475569;line-height:1.6;font-size:14px;margin-bottom:20px;">Here is your weekly digest of holistic health articles, essential oil advice, and wellness methods compiled by our wellness experts.</p>
            
            <div style="border-top:1px solid #f1f5f9;margin-top:20px;padding-top:20px;">
              <h3 style="font-size:14px;color:#0f172a;margin-top:0;">1. Relieving Stress with Lavender</h3>
              <p style="color:#475569;line-height:1.5;font-size:13px;">Applying standard formulations onto pressure points before rest has been proven to trigger calming brainwaves. Learn how to mix your own blend.</p>
            </div>
 
            <div style="border-top:1px solid #f1f5f9;margin-top:20px;padding-top:20px;">
              <h3 style="font-size:14px;color:#0f172a;margin-top:0;">2. Join Our Daily Meditation</h3>
              <p style="color:#475569;line-height:1.5;font-size:13px;">Every morning at 7:00 AM, we host a brief 15-minute mindfulness and breathing workshop live. Participation is free for our subscribers.</p>
            </div>
          </div>
          {{unsubscribe}}
        </div>
      `
    },
    {
      name: "🔥 VIP Flash Sale - 25% Off",
      subject: "Exclusive VIP Access: 25% Off All Natural Formulations",
      type: "html" as const,
      html_content: `
        <div style="font-family:sans-serif;max-width:550px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px;">
          <div style="background:#ffffff;border-radius:16px;padding:36px;border:1px solid #e2e8f0;box-shadow:0 10px 15px -3px rgba(0,0,0,0.05);">
            <div style="text-align:center;margin-bottom:28px;">
              <span style="font-size:28px;font-weight:bold;color:#059669;letter-spacing:0.05em;">🌿 PRATIPAL</span>
              <div style="margin-top:8px;font-size:10px;font-weight:bold;color:#b45309;letter-spacing:0.15em;text-transform:uppercase;">VIP EXCLUSIVE OFFER</div>
            </div>
            
            <h2 style="font-size:22px;color:#0f172a;margin-top:0;margin-bottom:12px;text-align:center;line-height:1.3;">Hello {{first_name}}, claim your 25% discount</h2>
            <p style="color:#475569;line-height:1.6;font-size:14px;text-align:center;margin-bottom:28px;">As a valued member of the Pratipal community, we're giving you early VIP access to our Weekend Rebalance Sale. Rejuvenate your spaces and restore inner alignment with our pure, single-origin essential oils.</p>
            
            <!-- Code Box -->
            <div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1px dashed #34d399;border-radius:12px;padding:20px;margin-bottom:28px;text-align:center;">
              <div style="font-size:11px;color:#065f46;text-transform:uppercase;font-weight:bold;letter-spacing:0.05em;">Use Code at Checkout</div>
              <div style="font-size:24px;font-weight:800;color:#065f46;margin-top:6px;letter-spacing:0.1em;">BALANCE25</div>
              <div style="font-size:11px;color:#047857;margin-top:4px;">Valid for the next 48 hours only.</div>
            </div>
 
            <div style="text-align:center;margin-bottom:20px;">
              <a href="https://pratipal.in/shop" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;box-shadow:0 4px 10px rgba(5,150,105,0.2);">Shop VIP Flash Sale →</a>
            </div>
          </div>
          {{unsubscribe}}
        </div>
      `
    },
    {
      name: "🌿 Product Launch: Forest Mist Roll-On",
      subject: "Introducing Forest Mist: Aromatherapy for Instant Inner Calm",
      type: "html" as const,
      html_content: `
        <div style="font-family:sans-serif;max-width:550px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px;">
          <div style="background:#ffffff;border-radius:16px;padding:36px;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="text-align:center;margin-bottom:24px;border-bottom:1px solid #f1f5f9;padding-bottom:16px;">
              <span style="font-size:24px;font-weight:bold;color:#059669;letter-spacing:0.05em;">🌿 PRATIPAL</span>
            </div>
            
            <h2 style="font-size:22px;color:#1e293b;margin-top:0;margin-bottom:8px;text-align:center;">Step into the woods, {{first_name}}</h2>
            <p style="font-size:12px;color:#0d9488;text-align:center;font-weight:bold;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:20px;">Now Available: Forest Mist aromatherapy roll-on</p>
            
            <p style="color:#475569;line-height:1.6;font-size:14px;margin-bottom:24px;">We are proud to introduce our newest organic formulation: <b>Forest Mist</b>. Expertly blended with hand-harvested botanical extracts, it is designed to slow your heart rate, deepen your breathing, and bring the serene tranquility of ancient forests into your busy day.</p>
            
            <!-- Highlights Grid -->
            <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
              <h3 style="font-size:13px;color:#0f172a;margin-top:0;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #cbd5e1;padding-bottom:6px;">Pure Ingredients:</h3>
              <ul style="margin:0;padding-left:20px;color:#475569;font-size:13px;line-height:1.7;">
                <li>🌲 <b>Wild Cedarwood</b>: Calms active thoughts and anchors focus.</li>
                <li>🍃 <b>Organic Eucalyptus</b>: Opens airways and revitalizes energy.</li>
                <li>🪵 <b>Himalayan Frankincense</b>: Elevates spiritual awareness and reduces anxiety.</li>
              </ul>
            </div>
 
            <div style="text-align:center;margin-bottom:20px;">
              <a href="https://pratipal.in/shop/forest-mist" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#0f766e);color:#ffffff;text-decoration:none;padding:12px 30px;border-radius:8px;font-size:14px;font-weight:600;">Experience Forest Mist →</a>
            </div>
          </div>
          {{unsubscribe}}
        </div>
      `
    },
    {
      name: "💌 VIP Invitation: Founder's Welcome Circle",
      subject: "A personal invitation from the founder of Pratipal",
      type: "text" as const,
      html_content: `Hi {{first_name}},
 
I wanted to send you a personal note to thank you for supporting Pratipal.
 
When we started harvesting our first batch of botanicals, our goal was simple: to bring authentic, clean, and unadulterated nature back into daily wellness routines.
 
Next Thursday at 7:00 PM, I am hosting a private virtual "Founder's Welcome Circle" for a small group of our newest members. We will talk about how to integrate aromatherapy into sleep rituals, custom recipes for diffusers, and answer any wellness questions you have live.
 
Because space is limited to keep the group interactive, we have saved 15 VIP seats for our subscribers.
 
If you would like to join us, you can RSVP directly here:
https://pratipal.in/vip-circle
 
I also set up a custom coupon for you to get free shipping on your next package of rollers or custom blends. Just enter code VIPFREE at checkout.
 
I hope to see you next Thursday!
 
Warmly,
 
Founder, Pratipal Care
 
{{unsubscribe}}`
    }
  ];
 
  // Loop through templates and upsert to avoid duplicate documents
  for (const tpl of templates) {
    await EmailTemplate.findOneAndUpdate(
      { name: tpl.name },
      tpl,
      { upsert: true, new: true }
    );
  }
}
 
export default async function TemplatesPage() {
  await connectDB();
  
  // Seed default templates dynamically on visit (missing items will be populated)
  await seedDefaultTemplates();
  
  let templates = await EmailTemplate.find().sort({ updated_at: -1 });

  return (
    <div className="space-y-6">
      {/* Title Panel Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Email Templates</h1>
          <p className="text-slate-500 text-sm mt-1">Design, customize and save reusable templates.</p>
        </div>
        <div>
          <Link
            href="/templates/builder"
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" /> Design Template
          </Link>
        </div>
      </div>

      {/* Grid of Stored Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((tpl) => (
          <div
            key={tpl._id.toString()}
            className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
          >
            {/* Header / Thumbnail Placeholders */}
            <div className="p-6 pb-4 bg-slate-50 border-b border-slate-100 flex items-center justify-center relative min-h-[140px]">
              <div className="text-slate-300 group-hover:text-emerald-500/20 group-hover:scale-110 transition-all duration-300">
                <FileCode className="h-16 w-16" />
              </div>
              <span className="absolute top-3.5 right-3.5 px-2 py-0.5 bg-slate-200/80 text-slate-600 text-[9px] font-bold uppercase rounded">
                {tpl.type}
              </span>
            </div>

            {/* Template Info Body */}
            <div className="p-6 flex-1 flex flex-col justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base group-hover:text-emerald-600 transition-colors">
                  {tpl.name}
                </h3>
                <p className="text-slate-400 text-xs mt-1 truncate" title={tpl.subject}>
                  Subject: {tpl.subject || "No default subject"}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 border-t border-slate-50 pt-4 mt-auto">
                <Link
                  href={`/templates/builder?id=${tpl._id.toString()}`}
                  className="flex-1 inline-flex justify-center items-center gap-1 py-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 font-semibold rounded-xl text-xs text-slate-700 transition-all cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit Template
                </Link>
                <button
                  // Delete function will be connected dynamically in the builder/CRUD actions
                  className="p-2 border border-slate-100 hover:border-rose-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                  title="Delete Template"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
