import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/api/middleware";
import { db } from "@/lib/db";
import { memberships, users, roles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/teams — list members of the current organization
export async function GET(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    const { organizationId: orgId } = ctx;

    const members = await db
      .select({
        membership: memberships,
        user: users,
        role: roles,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .leftJoin(roles, eq(memberships.roleId, roles.id))
      .where(
        and(
          eq(memberships.organizationId, orgId),
          eq(memberships.status, "ACTIVE")
        )
      );

    return apiSuccess(
      members.map((m) => ({
        id: m.membership.id,
        userId: m.user.id,
        name: m.user.name ?? m.user.email ?? "—",
        email: m.user.email ?? "",
        image: m.user.image,
        roleId: m.membership.roleId,
        roleName: m.role?.name ?? "—",
        joinedAt: m.membership.joinedAt?.toISOString() ?? m.membership.createdAt.toISOString(),
      }))
    );
  });
}

// PATCH /api/teams — update a member's role
export async function PATCH(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    const { organizationId: orgId } = ctx;
    const body = await req.json();
    const { membershipId, roleId } = body;

    if (!membershipId || !roleId) {
      return apiError("membershipId et roleId requis", 400);
    }

    // Verify role belongs to org
    const [role] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.organizationId, orgId)))
      .limit(1);

    if (!role) return apiError("Rôle invalide", 400);

    await db
      .update(memberships)
      .set({ roleId, updatedAt: new Date() })
      .where(
        and(
          eq(memberships.id, membershipId),
          eq(memberships.organizationId, orgId)
        )
      );

    return apiSuccess({ success: true });
  });
}

// DELETE /api/teams — remove a member
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    const { organizationId: orgId, userId: currentUserId } = ctx;
    const { membershipId } = await req.json();

    if (!membershipId) return apiError("membershipId requis", 400);

    // Can't remove yourself
    const [target] = await db
      .select()
      .from(memberships)
      .where(
        and(eq(memberships.id, membershipId), eq(memberships.organizationId, orgId))
      )
      .limit(1);

    if (!target) return apiError("Membre introuvable", 404);
    if (target.userId === currentUserId) return apiError("Vous ne pouvez pas vous retirer vous-même", 400);

    await db
      .update(memberships)
      .set({ status: "INACTIVE", updatedAt: new Date() })
      .where(eq(memberships.id, membershipId));

    return apiSuccess({ success: true });
  });
}
