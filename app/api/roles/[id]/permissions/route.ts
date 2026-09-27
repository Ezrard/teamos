import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles, rolePermissions, memberships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getActiveOrgId } from "@/lib/get-org";
import { generateId } from "@/lib/utils";

type Scope = "ALL" | "TEAM" | "OWN";

interface PermissionInput {
  resource: string;
  action: string;
  scope: Scope;
}

// PUT /api/roles/[id]/permissions — replace permissions for a role
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Verify target role belongs to this org
  const [targetRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, id), eq(roles.organizationId, orgId)))
    .limit(1);

  if (!targetRole) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  // Cannot edit Owner's permissions
  if (targetRole.name === "Owner")
    return NextResponse.json({ error: "Cannot modify Owner permissions" }, { status: 403 });

  const body = await req.json();
  const permissions: PermissionInput[] = body.permissions ?? [];

  const VALID_RESOURCES = ["projects", "tasks", "teams", "users", "leave", "time", "reports", "settings", "integrations"];
  const VALID_ACTIONS = ["view", "create", "edit", "delete", "approve", "assign"];
  const VALID_SCOPES: Scope[] = ["ALL", "TEAM", "OWN"];

  const valid = permissions.every(
    (p) =>
      VALID_RESOURCES.includes(p.resource) &&
      VALID_ACTIONS.includes(p.action) &&
      VALID_SCOPES.includes(p.scope)
  );

  if (!valid) return NextResponse.json({ error: "Invalid permissions" }, { status: 400 });

  // Replace: delete all existing, insert new
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

  if (permissions.length > 0) {
    await db.insert(rolePermissions).values(
      permissions.map((p) => ({
        id: generateId(),
        roleId: id,
        resource: p.resource,
        action: p.action,
        scope: p.scope,
      }))
    );
  }

  return NextResponse.json({ success: true });
}
