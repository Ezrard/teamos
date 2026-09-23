import { NextRequest, NextResponse } from "next/server";
import { withAuth, apiError, apiSuccess } from "@/lib/api/middleware";
import { db } from "@/lib/db";
import { workSchedules } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

// PUT /api/work-schedules — upsert user's work schedule
export async function PUT(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    const { userId, organizationId: orgId } = ctx;
    const body = await req.json();
    const {
      mondayHours = 8,
      tuesdayHours = 8,
      wednesdayHours = 8,
      thursdayHours = 8,
      fridayHours = 8,
    } = body;

    const [existing] = await db
      .select()
      .from(workSchedules)
      .where(
        and(
          eq(workSchedules.organizationId, orgId),
          eq(workSchedules.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(workSchedules)
        .set({
          mondayHours,
          tuesdayHours,
          wednesdayHours,
          thursdayHours,
          fridayHours,
        })
        .where(eq(workSchedules.id, existing.id));
    } else {
      await db.insert(workSchedules).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId,
        mondayHours,
        tuesdayHours,
        wednesdayHours,
        thursdayHours,
        fridayHours,
        saturdayHours: 0,
        sundayHours: 0,
      });
    }

    return apiSuccess({ success: true });
  });
}
