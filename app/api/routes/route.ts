import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles, rolePermissions, memberships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getActiveOrgId } from "@/lib/get-org";
import { generateId } from "@/lib/utils";

// GET /api/roles — list all roles with their permissions
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getActiveOrgId(session.user.id);

  const allRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.organizationId, orgId));

  const allPermissions = await db
    .select()
    .from(rolePermissions)
    .where(
      eq(
        rolePermissions.roleId,
        // We fetch for all roles of this org — filter client-side
        allRoles[0]?.id ?? ""
      )
    );

  // Fetch permissions for all roles at once
  const permsForAllRoles = await Promise.all(
    allRoles.map((r) =>
      db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, r.id))
    )
  );

  const result = allRoles.map((role, i) => ({
    ...role,
    permissions: permsForAllRoles[i],
  }));

  return NextResponse.json(result);
}

// POST /api/roles — create a custom role
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getActiveOrgId(session.user.id);

  // Verify caller is Owner or Admin
  const [membership] = await db
    .select({ roleId: memberships.roleId })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, session.user.id),
        eq(memberships.organizationId, orgId),
        eq(memberships.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [callerRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, membership.roleId))
    .limit(1);

  if (!callerRole || !["Owner", "Admin"].includes(callerRole.name))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, color = "#6366f1" } = body;

  if (!name || typeof name !== "string")
    return NextResponse.json({ error: "Name required" }, { status: 400 });

  const [created] = await db
    .insert(roles)
    .values({
      id: generateId(),
      organizationId: orgId,
      name,
      color,
      isSystem: false,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
