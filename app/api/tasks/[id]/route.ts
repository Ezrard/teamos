import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/api/middleware";
import { db } from "@/lib/db";
import { tasks, taskStatuses, users, activityLogs, notifications, comments, timeEntries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { generateId } from "@/lib/utils";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  statusId: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimateHours: z.number().optional().nullable(),
  position: z.number().optional(),
  isBlocked: z.boolean().optional(),
  completedAt: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (ctx) => {
    const { id } = await params;

    const [result] = await db
      .select({
        task: tasks,
        status: taskStatuses,
        assignee: users,
      })
      .from(tasks)
      .leftJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(and(eq(tasks.id, id), eq(tasks.organizationId, ctx.organizationId)))
      .limit(1);

    if (!result) return apiError("Task not found", 404);

    // Get subtasks
    const subtasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentId, id));

    // Get comments
    const taskComments = await db
      .select({ comment: comments, user: users })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.taskId, id));

    // Get time entries
    const entries = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.taskId, id));

    const totalLogged = entries.reduce((sum, e) => sum + (e.hours ?? 0), 0);

    return apiSuccess({
      ...result,
      subtasks,
      comments: taskComments,
      timeEntries: entries,
      totalLogged,
    });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (ctx) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.message);

    const [existing] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.organizationId, ctx.organizationId)))
      .limit(1);
    if (!existing) return apiError("Task not found", 404);

    const updateData: Record<string, any> = { ...parsed.data };
    if (updateData.startDate !== undefined) {
      updateData.startDate = updateData.startDate ? new Date(updateData.startDate) : null;
    }
    if (updateData.dueDate !== undefined) {
      updateData.dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;
    }
    if (updateData.completedAt !== undefined) {
      updateData.completedAt = updateData.completedAt ? new Date(updateData.completedAt) : null;
    }

    // Auto-set completedAt when status changes to DONE
    if (updateData.statusId) {
      const [newStatus] = await db
        .select()
        .from(taskStatuses)
        .where(eq(taskStatuses.id, updateData.statusId))
        .limit(1);
      if (newStatus?.category === "DONE" && !existing.completedAt) {
        updateData.completedAt = new Date();
      } else if (newStatus?.category !== "DONE") {
        updateData.completedAt = null;
      }
    }

    const [updated] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();

    // Send notification if assignee changed
    if (
      updateData.assigneeId &&
      updateData.assigneeId !== existing.assigneeId &&
      updateData.assigneeId !== ctx.userId
    ) {
      await db.insert(notifications).values({
        id: generateId(),
        userId: updateData.assigneeId,
        organizationId: ctx.organizationId,
        type: "TASK_ASSIGNED",
        title: "Tâche assignée",
        body: updated.title,
        link: `/tasks/${id}`,
      });
    }

    // Activity log
    await db.insert(activityLogs).values({
      id: generateId(),
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      taskId: id,
      projectId: updated.projectId,
      action: "updated",
      entity: "task",
      entityId: id,
      oldValue: existing as any,
      newValue: updated as any,
    });

    return apiSuccess(updated);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (ctx) => {
    const { id } = await params;

    const [existing] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.organizationId, ctx.organizationId)))
      .limit(1);
    if (!existing) return apiError("Task not found", 404);

    await db.delete(tasks).where(eq(tasks.id, id));

    return apiSuccess({ success: true });
  });
}
