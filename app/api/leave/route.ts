import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/api/middleware";
import { db } from "@/lib/db";
import {
  leaveRequests,
  leaveTypes,
  users,
  memberships,
  notifications,
  activityLogs,
} from "@/lib/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { generateId, calculateWorkingDays } from "@/lib/utils";

const createLeaveSchema = z.object({
  leaveTypeId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isHalfDay: z.boolean().default(false),
  halfDayPart: z.enum(["morning", "afternoon"]).optional(),
  reason: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (ctx, req) => {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [];

    // Filter by organization through memberships
    if (userId) {
      conditions.push(eq(leaveRequests.userId, userId));
    }
    if (status) conditions.push(eq(leaveRequests.status, status as any));
    if (from) conditions.push(gte(leaveRequests.startDate, new Date(from)));
    if (to) conditions.push(lte(leaveRequests.endDate, new Date(to)));

    const requests = await db
      .select({
        request: leaveRequests,
        leaveType: leaveTypes,
        user: users,
      })
      .from(leaveRequests)
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .innerJoin(memberships, eq(leaveRequests.userId, memberships.userId))
      .where(
        and(
          eq(memberships.organizationId, ctx.organizationId),
          ...conditions
        )
      )
      .orderBy(desc(leaveRequests.createdAt));

    return apiSuccess(requests);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx, req) => {
    const body = await req.json();
    const parsed = createLeaveSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.message);

    const startDate = new Date(parsed.data.startDate);
    const endDate = new Date(parsed.data.endDate);
    const days = parsed.data.isHalfDay
      ? 0.5
      : calculateWorkingDays(startDate, endDate);

    const requestId = generateId();
    const [request] = await db
      .insert(leaveRequests)
      .values({
        id: requestId,
        userId: ctx.userId,
        leaveTypeId: parsed.data.leaveTypeId,
        startDate,
        endDate,
        days,
        isHalfDay: parsed.data.isHalfDay,
        halfDayPart: parsed.data.halfDayPart,
        reason: parsed.data.reason,
        status: "PENDING",
      })
      .returning();

    // Notify managers
    const managers = await db
      .select()
      .from(memberships)
      .where(eq(memberships.organizationId, ctx.organizationId));

    // Activity log
    await db.insert(activityLogs).values({
      id: generateId(),
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "created",
      entity: "leave_request",
      entityId: requestId,
      newValue: { days, startDate: parsed.data.startDate, endDate: parsed.data.endDate },
    });

    return apiSuccess(request, 201);
  });
}
