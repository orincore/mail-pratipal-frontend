import React from "react";
import { cookies } from "next/headers";
import TemplatesGrid from "./TemplatesGrid";
import NewTemplateButton from "./NewTemplateButton";

export default async function TemplatesPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("pratipal_session")?.value;

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
  const res = await fetch(`${backendUrl}/api/templates`, {
    headers: {
      Cookie: `pratipal_session=${sessionCookie}`,
    },
    next: { revalidate: 0 }
  });

  if (!res.ok) {
    throw new Error("Failed to load templates from backend");
  }

  const templates: any[] = await res.json();

  return (
    <div className="space-y-5 text-left">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white py-4 px-5 rounded-3xl border border-slate-200 shadow-surface gap-4">
        <div>
          <h1 className="text-[15px] font-semibold text-slate-900">Email templates</h1>
          <p className="text-slate-500 text-[12.5px] mt-0.5">Design, customize and reuse across campaigns and reminders.</p>
        </div>
        <NewTemplateButton />
      </div>

      <TemplatesGrid initialTemplates={templates} />
    </div>
  );
}
