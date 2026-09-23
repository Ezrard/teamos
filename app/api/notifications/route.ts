import { NextRequest } from "next/server";
import { withAuth, apiSuccess } from "@/lib/api/middleware";
import { db } from "@/lib/db";
import { notifications, memberships } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/notifications — list notifications for current user
export async function GET(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    const { userId, organizationId: orgId } = ctx;

    const items = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.organizationId, orgId)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return apiSuccess(items);
  });
}

// PATCH /api/notifications — mark all as read
export async function PATCH(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    const { userId, organizationId: orgId } = ctx;

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.organizationId, orgId)
        )
      );

    return apiSuccess({ success: true });
  });
}
