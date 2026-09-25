import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { memberships, users, roles, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

function verifyInviteToken(
  token: string,
  email: string,
  orgId: string,
  roleId: string,
  expMs: number
): boolean {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "fallback-secret";
  const payload = `${email}|${orgId}|${roleId}|${expMs}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
}

// POST /api/invitations/accept — called after new-user registration to join invited org
export async function POST(req: NextRequest) {
  try {
    const { token, email, orgId, roleId, exp } = await req.json();

    if (!token || !email || !orgId || !roleId || !exp) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const expMs = parseInt(exp, 10);
    if (isNaN(expMs) || Date.now() > expMs) {
      return NextResponse.json({ error: "Lien d'invitation expiré" }, { status: 410 });
    }

    // Validate HMAC
    let tokenValid = false;
    try {
      tokenValid = verifyInviteToken(token, email, orgId, roleId, expMs);
    } catch {
      tokenValid = false;
    }

    if (!tokenValid) {
      return NextResponse.json({ error: "Lien d'invitation invalide" }, { status: 400 });
    }

    // Verify role belongs to org
    const [role] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.organizationId, orgId)))
      .limit(1);

    if (!role) {
      return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
    }

    // Find the user by email (must exist — they just registered)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Check if already a member
    const [existing] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.organizationId, orgId), eq(memberships.userId, user.id)))
      .limit(1);

    if (existing) {
      // Already member — just return success so they land on the org
      return NextResponse.json({ success: true, alreadyMember: true });
    }

    // Add as active member
    await db.insert(memberships).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: user.id,
      roleId,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Accept invite error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
