import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/api/middleware";
import { db } from "@/lib/db";
import {
  tasks,
  taskStatuses,
  users,
  activityLogs,
  notifications,
} from "@/lib/db/schema";
import { eq, and, desc, asc, ilike, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { generateId } from "@/lib/utils";

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  statusId: z.string(),
  assigneeId: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimateHours: z.number().optional().nullable(),
  parentId: z.string().optional().nullable(),
  position: z.number().default(0),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (ctx, req) => {
    const { searchParams } = req.nextUrl;
    const projectId = searchParams.get("projectId");
    const assigneeId = searchParams.get("assigneeId");
    const statusId = searchParams.get("statusId");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");
    const parentId = searchParams.get("parentId");
    const includeSubtasks = searchParams.get("includeSubtasks") === "true";

    const conditions = [eq(tasks.organizationId, ctx.organizationId)];
    if (projectId) conditions.push(eq(tasks.projectId, projectId));
    if (assigneeId) conditions.push(eq(tasks.assigneeId, assigneeId));
    if (statusId) conditions.push(eq(tasks.statusId, statusId));
    if (priority) conditions.push(eq(tasks.priority, priority as any));
    if (parentId === "null") conditions.push(isNull(tasks.parentId));
    else if (parentId) conditions.push(eq(tasks.parentId, parentId));
    else if (!includeSubtasks) conditions.push(isNull(tasks.parentId));

    const allTasks = await db
      .select({
        task: tasks,
        status: taskStatuses,
        assignee: users,
      })
      .from(tasks)
      .leftJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(and(...conditions))
      .orderBy(asc(tasks.position), desc(tasks.createdAt));

    if (search) {
      const filtered = allTasks.filter((t) =>
        t.task.title.toLowerCase().includes(search.toLowerCase())
      );
      return apiSuccess(filtered);
    }

    return apiSuccess(allTasks);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx, req) => {
    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.message);

    // Verify status belongs to org
    const [status] = await db
      .select()
      .from(taskStatuses)
      .where(
        and(
          eq(taskStatuses.id, parsed.data.statusId),
          eq(taskStatuses.organizationId, ctx.organizationId)
        )
      )
      .limit(1);
    if (!status) return apiError("Invalid status");

    const taskId = generateId();
    const [task] = await db
      .insert(tasks)
      .values({
        id: taskId,
        organizationId: ctx.organizationId,
        creatorId: ctx.userId,
        ...parsed.data,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      })
      .returning();

    // Send notification if assigned to someone else
    if (parsed.data.assigneeId && parsed.data.assigneeId !== ctx.userId) {
      await db.insert(notifications).values({
        id: generateId(),
        userId: parsed.data.assigneeId,
        organizationId: ctx.organizationId,
        type: "TASK_ASSIGNED",
        title: "Nouvelle tâche assignée",
        body: task.title,
        link: `/tasks/${taskId}`,
      });
    }

    // Activity log
    await db.insert(activityLogs).values({
      id: generateId(),
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      taskId,
      projectId: task.projectId,
      action: "created",
      entity: "task",
      entityId: taskId,
      newValue: { title: task.title },
    });

    return apiSuccess(task, 201);
  });
}
