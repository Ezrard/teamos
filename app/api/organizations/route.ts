import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles, memberships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getActiveOrgId } from "@/lib/get-org";

// POST /api/organizations/transfer-ownership
// Body: { newOwnerId: string }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getActiveOrgId(session.user.id);

  // Verify caller is the current Owner
  const [callerMembership] = await db
    .select({ id: memberships.id, roleId: memberships.roleId })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, session.user.id),
        eq(memberships.organizationId, orgId),
        eq(memberships.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!callerMembership)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [callerRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, callerMembership.roleId))
    .limit(1);

  if (!callerRole || callerRole.name !== "Owner")
    return NextResponse.json({ error: "Only the Owner can transfer ownership" }, { status: 403 });

  const body = await req.json();
  const { newOwnerId } = body;

  if (!newOwnerId || typeof newOwnerId !== "string")
    return NextResponse.json({ error: "newOwnerId required" }, { status: 400 });

  if (newOwnerId === session.user.id)
    return NextResponse.json({ error: "You are already the owner" }, { status: 400 });

  // Get the target membership
  const [targetMembership] = await db
    .select({ id: memberships.id, roleId: memberships.roleId })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, newOwnerId),
        eq(memberships.organizationId, orgId),
        eq(memberships.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!targetMembership)
    return NextResponse.json({ error: "Member not found in this organization" }, { status: 404 });

  // Get Admin role (to downgrade current Owner)
  const [adminRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.organizationId, orgId), eq(roles.name, "Admin")))
    .limit(1);

  if (!adminRole)
    return NextResponse.json({ error: "Admin role not found" }, { status: 500 });

  // Transfer: new member becomes Owner, current becomes Admin
  await db
    .update(memberships)
    .set({ roleId: callerRole.id }) // Owner role id
    .where(eq(memberships.id, targetMembership.id));

  await db
    .update(memberships)
    .set({ roleId: adminRole.id })
    .where(eq(memberships.id, callerMembership.id));

  return NextResponse.json({ success: true });
}
