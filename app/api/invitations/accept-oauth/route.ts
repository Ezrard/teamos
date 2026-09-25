import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberships, users, roles } from "@/lib/db/schema";
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
  try {
    return crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// GET /api/invitations/accept-oauth — redirect target after Google OAuth for invited users
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const orgId = searchParams.get("orgId");
  const roleId = searchParams.get("roleId");
  const exp = searchParams.get("exp");

  if (!token || !email || !orgId || !roleId || !exp) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  const expMs = parseInt(exp, 10);
  if (isNaN(expMs) || Date.now() > expMs || !verifyInviteToken(token, email, orgId, roleId, expMs)) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Verify role
  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, orgId)))
    .limit(1);

  if (!role) return NextResponse.redirect(new URL("/onboarding", req.url));

  // Check if already a member
  const [existing] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.organizationId, orgId), eq(memberships.userId, session.user.id)))
    .limit(1);

  if (!existing) {
    await db.insert(memberships).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: session.user.id,
      roleId,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
