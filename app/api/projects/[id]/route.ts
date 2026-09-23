import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/api/middleware";
import { db } from "@/lib/db";
import { projects, activityLogs, projectMembers, tasks, projectTeams } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { generateId } from "@/lib/utils";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  client: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (ctx) => {
    const { id } = await params;
    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, id),
          eq(projects.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!project) return apiError("Project not found", 404);

    // Get members and teams
    const members = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, id));

    const teams = await db
      .select()
      .from(projectTeams)
      .where(eq(projectTeams.projectId, id));

    // Get task count
    const taskList = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, id));

    return apiSuccess({ ...project, members, teams, taskCount: taskList.length });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (ctx) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.message);

    const [existing] = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, id), eq(projects.organizationId, ctx.organizationId))
      )
      .limit(1);
    if (!existing) return apiError("Project not found", 404);

    const updateData: Record<string, any> = { ...parsed.data };
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    const [updated] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();

    await db.insert(activityLogs).values({
      id: generateId(),
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      projectId: id,
      action: "updated",
      entity: "project",
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
      .from(projects)
      .where(
        and(eq(projects.id, id), eq(projects.organizationId, ctx.organizationId))
      )
      .limit(1);
    if (!existing) return apiError("Project not found", 404);

    await db.delete(projects).where(eq(projects.id, id));

    return apiSuccess({ success: true });
  });
}
