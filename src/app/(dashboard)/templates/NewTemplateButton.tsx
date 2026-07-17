"use client";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useRole } from "../RoleProvider";

export default function NewTemplateButton() {
  const { canWrite } = useRole();
  if (!canWrite) return null;
  return (
    <Link
      href="/templates/builder"
      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full text-[12.5px] transition-colors shrink-0"
    >
      <Plus className="h-4 w-4" /> Design template
    </Link>
  );
}
