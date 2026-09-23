import { NextRequest, NextResponse } from "next/server";
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
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { slugify, generateId } from "@/lib/utils";

const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  timezone: z.string().default("UTC"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userMemberships = await db
    .select({
      organization: organizations,
      membership: memberships,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(
      and(
        eq(memberships.userId, session.user.id),
        eq(memberships.status, "ACTIVE")
      )
    );

  return NextResponse.json(userMemberships);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, timezone } = parsed.data;
  const slug = slugify(name) + "-" + generateId().slice(0, 6);
  const orgId = generateId();

  // Create organization
  const [org] = await db
    .insert(organizations)
    .values({
      id: orgId,
      name,
      slug,
      description,
      timezone,
    })
    .returning();

  // Create default roles
  const defaultRoles = [
    {
      id: generateId(),
      name: "Owner",
      color: "#dc2626",
      isSystem: true,
      organizationId: orgId,
    },
    {
      id: generateId(),
      name: "Admin",
      color: "#d97706",
      isSystem: true,
      organizationId: orgId,
    },
    {
      id: generateId(),
      name: "Manager",
      color: "#7c3aed",
      isSystem: true,
      organizationId: orgId,
    },
    {
      id: generateId(),
      name: "Team Lead",
      color: "#2563eb",
      isSystem: true,
      organizationId: orgId,
    },
    {
      id: generateId(),
      name: "Employee",
      color: "#059669",
      isSystem: true,
      organizationId: orgId,
    },
    {
      id: generateId(),
      name: "Guest",
      color: "#6b7280",
      isSystem: true,
      organizationId: orgId,
    },
  ];

  await db.insert(roles).values(defaultRoles);

  // Set permissions for Owner role (all permissions)
  const ownerRole = defaultRoles[0];
  const resources = [
    "projects",
    "tasks",
    "teams",
    "users",
    "leave",
    "time",
    "reports",
    "settings",
    "integrations",
  ];
  const actions = ["view", "create", "edit", "delete", "approve", "assign"];

  const ownerPermissions = resources.flatMap((resource) =>
    actions.map((action) => ({
      id: generateId(),
      roleId: ownerRole.id,
      resource,
      action,
      scope: "ALL" as const,
    }))
  );
  await db.insert(rolePermissions).values(ownerPermissions);

  // Employee permissions
  const employeeRole = defaultRoles[4];
  const employeePermissions = [
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
  }));
  await db.insert(rolePermissions).values(employeePermissions);

  // Create membership for owner
  const membershipId = generateId();
  await db.insert(memberships).values({
    id: membershipId,
    userId: session.user.id,
    organizationId: orgId,
    roleId: ownerRole.id,
    status: "ACTIVE",
    joinedAt: new Date(),
  });

  // Create work schedule for owner
  await db.insert(workSchedules).values({
    id: generateId(),
    userId: session.user.id,
    organizationId: orgId,
  });

  // Create default task statuses
  const defaultStatuses: Array<{ name: string; color: string; position: number; category: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED"; isDefault: boolean }> = [
    { name: "Backlog", color: "#94a3b8", position: 0, category: "BACKLOG", isDefault: false },
    { name: "À faire", color: "#64748b", position: 1, category: "TODO", isDefault: true },
    { name: "En cours", color: "#3b82f6", position: 2, category: "IN_PROGRESS", isDefault: false },
    { name: "En révision", color: "#8b5cf6", position: 3, category: "IN_REVIEW", isDefault: false },
    { name: "Terminé", color: "#22c55e", position: 4, category: "DONE", isDefault: false },
  ];

  await db.insert(taskStatuses).values(
    defaultStatuses.map((s) => ({
      id: generateId(),
      organizationId: orgId,
      ...s,
    }))
  );

  // Create default leave types
  const defaultLeaveTypes = [
    { name: "Congés payés", color: "#22c55e", allowance: 25 },
    { name: "RTT", color: "#3b82f6", allowance: 10 },
    { name: "Maladie", color: "#ef4444", allowance: null },
    { name: "Télétravail", color: "#8b5cf6", allowance: null, countsAsWork: true },
    { name: "Absence exceptionnelle", color: "#f59e0b", allowance: null },
  ];

  await db.insert(leaveTypes).values(
    defaultLeaveTypes.map((lt) => ({
      id: generateId(),
      organizationId: orgId,
      ...lt,
    }))
  );

  return NextResponse.json({ organization: org, membership: { id: membershipId } }, { status: 201 });
}
