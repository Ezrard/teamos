import { NextRequest, NextResponse } from "next/server";
import { withAuth, apiError, apiSuccess } from "@/lib/api/middleware";
import { db } from "@/lib/db";
import { memberships, users, roles, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

function makeInviteToken(email: string, orgId: string, roleId: string, expMs: number): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "fallback-secret";
  const payload = `${email}|${orgId}|${roleId}|${expMs}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function sendInvitationEmail(
  email: string,
  orgName: string,
  orgId: string,
  roleId: string,
) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not set — invitation email skipped");
    return;
  }

  const expMs = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const token = makeInviteToken(email, orgId, roleId, expMs);
  const inviteUrl = `${baseUrl}/register?invite=${token}&email=${encodeURIComponent(email)}&orgId=${orgId}&roleId=${roleId}&exp=${expMs}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to: email,
      subject: `Invitation à rejoindre ${orgName} sur TeamOS`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Vous avez été invité à rejoindre <strong>${orgName}</strong></h2>
          <p>Cliquez sur le bouton ci-dessous pour créer votre compte et rejoindre l'équipe.</p>
          <a href="${inviteUrl}"
             style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
            Accepter l'invitation
          </a>
          <p style="margin-top:24px;color:#6b7280;font-size:14px">
            Ce lien est valable 7 jours. Si vous n'attendiez pas cet email, vous pouvez l'ignorer.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Resend error:", res.status, body);
    throw new Error(`Email send failed: ${res.status}`);
  }

  const data = await res.json();
  console.log("Resend email sent:", data.id);
}

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

    // Get organization name for the email
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const orgName = org?.name ?? "votre équipe";

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

      // Notify the existing user by email
      try {
        await sendInvitationEmail(email.toLowerCase(), orgName, orgId, roleId);
      } catch (err) {
        console.error("Failed to send notification email:", err);
        // Don't fail the request — member was added
      }

      return apiSuccess({ message: "Membre ajouté", membershipId });
    }

    // New user — send invitation email
    try {
      await sendInvitationEmail(email.toLowerCase(), orgName, orgId, roleId);
    } catch (err) {
      console.error("Failed to send invitation email:", err);
      return apiError("Impossible d'envoyer l'email d'invitation. Vérifiez la configuration Resend.", 500);
    }

    return apiSuccess({
      message: "Invitation envoyée",
      email,
    });
  });
}
