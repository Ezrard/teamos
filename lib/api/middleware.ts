import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberships, rolePermissions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export interface AuthContext {
  userId: string;
  organizationId: string;
  membershipId: string;
  roleId: string;
}

export async function withAuth(
  req: NextRequest,
  handler: (ctx: AuthContext, req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organization from header or query param
    const orgId =
      req.headers.get("x-organization-id") ??
      req.nextUrl.searchParams.get("organizationId");

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    // Verify membership
    const [membership] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, session.user.id),
          eq(memberships.organizationId, orgId),
          eq(memberships.status, "ACTIVE")
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return handler(
      {
        userId: session.user.id,
        organizationId: orgId,
        membershipId: membership.id,
        roleId: membership.roleId,
      },
      req
    );
  } catch (error) {
    console.error("Auth middleware error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function checkPermission(
  roleId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const [permission] = await db
    .select()
    .from(rolePermissions)
    .where(
      and(
        eq(rolePermissions.roleId, roleId),
        eq(rolePermissions.resource, resource),
        eq(rolePermissions.action, action)
      )
    )
    .limit(1);

  return !!permission;
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
