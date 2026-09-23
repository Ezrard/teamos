import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/api/middleware";
import { db } from "@/lib/db";
import { timeEntries, tasks, projects } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { generateId } from "@/lib/utils";

const createTimeEntrySchema = z.object({
  taskId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  startTime: z.string(),
  endTime: z.string().optional().nullable(),
  hours: z.number().min(0).optional().nullable(),
  isTimer: z.boolean().default(false),
  date: z.string(),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (ctx, req) => {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId") ?? ctx.userId;
    const taskId = searchParams.get("taskId");
    const projectId = searchParams.get("projectId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [eq(timeEntries.userId, userId)];
    if (taskId) conditions.push(eq(timeEntries.taskId, taskId));
    if (projectId) conditions.push(eq(timeEntries.projectId, projectId));
    if (from) conditions.push(gte(timeEntries.date, new Date(from)));
    if (to) conditions.push(lte(timeEntries.date, new Date(to)));

    const entries = await db
      .select()
      .from(timeEntries)
      .where(and(...conditions))
      .orderBy(desc(timeEntries.date));

    return apiSuccess(entries);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx, req) => {
    const body = await req.json();
    const parsed = createTimeEntrySchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.message);

    const entryId = generateId();
    let hours = parsed.data.hours;

    // Calculate hours from start/end if not provided
    if (!hours && parsed.data.endTime) {
      const start = new Date(parsed.data.startTime);
      const end = new Date(parsed.data.endTime);
      hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }

    const [entry] = await db
      .insert(timeEntries)
      .values({
        id: entryId,
        userId: ctx.userId,
        ...parsed.data,
        hours,
        startTime: new Date(parsed.data.startTime),
        endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : null,
        date: new Date(parsed.data.date),
      })
      .returning();

    return apiSuccess(entry, 201);
  });
}
