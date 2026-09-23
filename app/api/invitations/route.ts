import { NextRequest, NextResponse } from "next/server";
import { withAuth, apiError, apiSuccess } from "@/lib/api/middleware";
import { db } from "@/lib/db";
import { memberships, users, roles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

// POST /api/invitations — invite a user to the organization
export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    const { organizationId: orgId } = ctx;
    const body = await req.json();
    const { email, roleId } = body;

    if (!email || !roleId) {
      return apiError("Email et rôle requis", 400);
    }

    // Check role belongs to org
    const [role] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.organizationId, orgId)))
      .limit(1);

    if (!role) return apiError("Rôle invalide", 400);

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      // Check if already a member
      const [existing] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.organizationId, orgId),
            eq(memberships.userId, existingUser.id)
          )
        )
        .limit(1);

      if (existing) {
        return apiError("Cet utilisateur est déjà membre de l'organisation", 409);
      }

      // Add as member directly
      const membershipId = crypto.randomUUID();
      await db.insert(memberships).values({
        id: membershipId,
        organizationId: orgId,
        userId: existingUser.id,
        roleId,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return apiSuccess({ message: "Membre ajouté", membershipId });
    }

    // In a real app: send email invitation with a token
    // For demo: return success (invitation email would be sent)
    return apiSuccess({
      message: "Invitation envoyée",
      email,
      note: "En mode démo, les emails d'invitation ne sont pas envoyés.",
    });
  });
}
