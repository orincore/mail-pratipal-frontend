"use client";

import React, { createContext, useContext } from "react";

export type UserRole = "admin" | "editor" | "viewer";

const RoleContext = createContext<UserRole>("viewer");

export function RoleProvider({ role, children }: { role: UserRole; children: React.ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

/** Returns the current user's role plus convenience flags for UI gating. */
export function useRole() {
  const role = useContext(RoleContext);
  return {
    role,
    isAdmin: role === "admin",
    isEditor: role === "editor",
    isViewer: role === "viewer",
    // Editors and admins can create/edit/delete; viewers are read-only.
    canWrite: role !== "viewer",
  };
}
