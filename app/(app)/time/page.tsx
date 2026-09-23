import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { memberships, users, tasks, taskStatuses, timeEntries, projects } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { TimeClient } from "@/components/time/time-client";
import { startOfWeek, endOfWeek } from "date-fns";

export default async function TimePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [membership] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.userId, session.user.id), eq(memberships.status, "ACTIVE")))
    .limit(1);

  if (!membership) redirect("/onboarding");
  const orgId = membership.organizationId;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [myEntries, myTasks, allProjects] = await Promise.all([
    db
      .select({ entry: timeEntries, task: tasks, project: projects })
      .from(timeEntries)
      .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .leftJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(
        and(
          eq(timeEntries.userId, session.user.id),
          gte(timeEntries.date, weekStart),
          lte(timeEntries.date, weekEnd)
        )
      )
      .orderBy(desc(timeEntries.date)),
    db
      .select({ task: tasks, status: taskStatuses })
      .from(tasks)
      .leftJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
      .where(and(eq(tasks.assigneeId, session.user.id), eq(tasks.organizationId, orgId))),
    db.select().from(projects).where(eq(projects.organizationId, orgId)),
  ]);

  const totalHoursThisWeek = myEntries.reduce((acc, e) => acc + (e.entry.hours ?? 0), 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Suivi du temps"
        subtitle={`${totalHoursThisWeek.toFixed(1)}h cette semaine`}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <TimeClient
          entries={myEntries.map((e) => ({
            id: e.entry.id,
            date: e.entry.date.toISOString(),
            hours: e.entry.hours ?? 0,
            description: e.entry.description,
            taskId: e.entry.taskId,
            taskTitle: e.task?.title ?? null,
            projectId: e.entry.projectId,
            projectName: e.project?.name ?? null,
            projectColor: e.project?.color ?? null,
          }))}
          tasks={myTasks
            .filter((t) => t.status?.category !== "DONE")
            .map((t) => ({
              id: t.task.id,
              title: t.task.title,
              projectId: t.task.projectId,
            }))}
          projects={allProjects.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
          }))}
          organizationId={orgId}
          weekStart={weekStart.toISOString()}
          weekEnd={weekEnd.toISOString()}
        />
      </div>
    </div>
  );
}
