"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  organizations,
  memberships,
  roles,
  rolePermissions,
  taskStatuses,
  leaveTypes,
  workSchedules,
} from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import { redirect } from "next/navigation";

export async function createOrganization(data: {
  name: string;
  slug: string;
  industry: string;
  size: string;
}): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié — veuillez vous connecter" };
  }

  const { name, slug: rawSlug, industry, size } = data;

  if (!name || name.trim().length < 2) {
    return { error: "Le nom doit contenir au moins 2 caractères" };
  }

  const slug = rawSlug ||
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

  const orgId = generateId();

  await db.insert(organizations).values({
    id: orgId,
    name: name.trim(),
    slug,
    description: industry || undefined,
    timezone: "UTC",
  });

  const defaultRoles = [
    { id: generateId(), name: "Owner", color: "#dc2626", isSystem: true, organizationId: orgId },
    { id: generateId(), name: "Admin", color: "#d97706", isSystem: true, organizationId: orgId },
    { id: generateId(), name: "Manager", color: "#7c3aed", isSystem: true, organizationId: orgId },
    { id: generateId(), name: "Team Lead", color: "#2563eb", isSystem: true, organizationId: orgId },
    { id: generateId(), name: "Employee", color: "#059669", isSystem: true, organizationId: orgId },
    { id: generateId(), name: "Guest", color: "#6b7280", isSystem: true, organizationId: orgId },
  ];

  await db.insert(roles).values(defaultRoles);

  const ownerRole = defaultRoles[0];
  const resources = ["projects", "tasks", "teams", "users", "leave", "time", "reports", "settings", "integrations"];
  const actions = ["view", "create", "edit", "delete", "approve", "assign"];

  await db.insert(rolePermissions).values(
    resources.flatMap((resource) =>
      actions.map((action) => ({
        id: generateId(),
        roleId: ownerRole.id,
        resource,
        action,
        scope: "ALL" as const,
      }))
    )
  );

  const employeeRole = defaultRoles[4];
  await db.insert(rolePermissions).values(
    [
      { resource: "projects", action: "view" },
      { resource: "tasks", action: "view" },
      { resource: "tasks", action: "create" },
      { resource: "tasks", action: "edit" },
      { resource: "time", action: "view" },
      { resource: "time", action: "create" },
      { resource: "leave", action: "view" },
      { resource: "leave", action: "create" },
    ].map((p) => ({
      id: generateId(),
      roleId: employeeRole.id,
      resource: p.resource,
      action: p.action,
      scope: "OWN" as const,
    }))
  );

  await db.insert(memberships).values({
    id: generateId(),
    userId: session.user.id,
    organizationId: orgId,
    roleId: ownerRole.id,
    status: "ACTIVE",
    joinedAt: new Date(),
  });

  await db.insert(workSchedules).values({
    id: generateId(),
    userId: session.user.id,
    organizationId: orgId,
  });

  const defaultStatuses: Array<{
    name: string;
    color: string;
    position: number;
    category: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
    isDefault: boolean;
  }> = [
    { name: "Backlog", color: "#94a3b8", position: 0, category: "BACKLOG", isDefault: false },
    { name: "À faire", color: "#64748b", position: 1, category: "TODO", isDefault: true },
    { name: "En cours", color: "#3b82f6", position: 2, category: "IN_PROGRESS", isDefault: false },
    { name: "En révision", color: "#8b5cf6", position: 3, category: "IN_REVIEW", isDefault: false },
    { name: "Terminé", color: "#22c55e", position: 4, category: "DONE", isDefault: false },
  ];

  await db.insert(taskStatuses).values(
    defaultStatuses.map((s) => ({ id: generateId(), organizationId: orgId, ...s }))
  );

  await db.insert(leaveTypes).values(
    [
      { name: "Congés payés", color: "#22c55e", allowance: 25 },
      { name: "RTT", color: "#3b82f6", allowance: 10 },
      { name: "Maladie", color: "#ef4444", allowance: null },
      { name: "Télétravail", color: "#8b5cf6", allowance: null, countsAsWork: true },
      { name: "Absence exceptionnelle", color: "#f59e0b", allowance: null },
    ].map((lt) => ({ id: generateId(), organizationId: orgId, ...lt }))
  );

  redirect("/dashboard");
}
