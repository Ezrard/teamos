import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/api/middleware";
import { db } from "@/lib/db";
import { leaveRequests, notifications, activityLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { generateId } from "@/lib/utils";

const approveSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (ctx) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.message);

    const [request] = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id))
      .limit(1);

    if (!request) return apiError("Leave request not found", 404);
    if (request.status !== "PENDING") return apiError("Request already processed");

    const status = parsed.data.action === "approve" ? "APPROVED" : "REJECTED";

    const [updated] = await db
      .update(leaveRequests)
      .set({
        status,
        approverId: ctx.userId,
        approvedAt: status === "APPROVED" ? new Date() : null,
        rejectReason: parsed.data.reason,
      })
      .where(eq(leaveRequests.id, id))
      .returning();

    // Notify employee
    await db.insert(notifications).values({
      id: generateId(),
      userId: request.userId,
      organizationId: ctx.organizationId,
      type: status === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
      title: status === "APPROVED" ? "Congé approuvé" : "Congé refusé",
      body: parsed.data.reason,
      link: `/leave`,
    });

    await db.insert(activityLogs).values({
      id: generateId(),
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: status.toLowerCase(),
      entity: "leave_request",
      entityId: id,
      newValue: { status },
    });

    return apiSuccess(updated);
  });
}
