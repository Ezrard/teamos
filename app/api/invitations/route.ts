import { NextRequest, NextResponse } from "next/server";
import { withAuth, apiError, apiSuccess } from "@/lib/api/middleware";
import { db } from "@/lib/db";
import { memberships, users, roles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

async function sendInvitationEmail(email: string, orgName: string, token: string) {
  const inviteUrl = `${process.env.NEXTAUTH_URL}/register?invite=${token}&email=${encodeURIComponent(email)}`;
  
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Invitation à rejoindre ${orgName} sur TeamOS`,
      html: `
        <h2>Vous avez été invité à rejoindre ${orgName}</h2>
        <p>Cliquez sur le lien ci-dessous pour créer votre compte et rejoindre l'équipe :</p>
        <a href="${inviteUrl}" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0;">
          Accepter l'invitation
        </a>
        <p>Ce lien est valable 7 jours.</p>
      `,
    }),
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    const { organizationId: orgId, organization } = ctx;
    const body = await req.json();
    const { email, roleId } = body;

    if (!email || !roleId) {
      return apiError("Email et rôle requis", 400);
    }

    const [role] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.organizationId, orgId)))
      .limit(1);

    if (!role) return apiError("Rôle invalide", 400);

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      const [existing] = await db
        .select()
        .from(memberships)
        .where(and(eq(memberships.organizationId, orgId), eq(memberships.userId, existingUser.id)))
        .limit(1);

      if (existing) return apiError("Cet utilisateur est déjà membre de l'organisation", 409);

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

    const token = crypto.randomUUID();
    const orgName = organization?.name ?? "TeamOS";
    
    try {
      await sendInvitationEmail(email, orgName, token);
    } catch {
      return apiError("Erreur lors de l'envoi de l'email", 500);
    }

    return apiSuccess({ message: "Invitation envoyée à " + email });
  });
}
