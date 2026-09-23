import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/api/middleware";
import { db } from "@/lib/db";
import {
  projects,
  projectMembers,
  projectTeams,
  activityLogs,
} from "@/lib/db/schema";
import { eq, and, desc, ilike, inArray } from "drizzle-orm";
import { z } from "zod";
import { generateId } from "@/lib/utils";

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  color: z.string().default("#6366f1"),
  status: z
    .enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"])
    .default("PLANNING"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  client: z.string().optional(),
  teamIds: z.array(z.string()).optional(),
  memberIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (ctx, req) => {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = db
      .select()
      .from(projects)
      .where(eq(projects.organizationId, ctx.organizationId));

    const allProjects = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, ctx.organizationId),
          status ? eq(projects.status, status as any) : undefined,
          search ? ilike(projects.name, `%${search}%`) : undefined
        )
      )
      .orderBy(desc(projects.createdAt));

    return apiSuccess(allProjects);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx, req) => {
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.message);
    }

    const { teamIds, memberIds, ...data } = parsed.data;
    const projectId = generateId();

    const [project] = await db
      .insert(projects)
      .values({
        id: projectId,
        organizationId: ctx.organizationId,
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      })
      .returning();

    // Add creator as owner
    await db.insert(projectMembers).values({
      id: generateId(),
      projectId,
      userId: ctx.userId,
      role: "OWNER",
    });

    // Add team relations
    if (teamIds && teamIds.length > 0) {
      await db.insert(projectTeams).values(
        teamIds.map((teamId) => ({
          id: generateId(),
          projectId,
          teamId,
        }))
      );
    }

    // Add members
    if (memberIds && memberIds.length > 0) {
      const uniqueMembers = memberIds.filter((id) => id !== ctx.userId);
      if (uniqueMembers.length > 0) {
        await db.insert(projectMembers).values(
          uniqueMembers.map((userId) => ({
            id: generateId(),
            projectId,
            userId,
            role: "MEMBER",
          }))
        );
      }
    }

    // Log activity
    await db.insert(activityLogs).values({
      id: generateId(),
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      projectId,
      action: "created",
      entity: "project",
      entityId: projectId,
      newValue: { name: project.name },
    });

    return apiSuccess(project, 201);
  });
}
