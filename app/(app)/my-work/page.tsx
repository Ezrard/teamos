import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { memberships, tasks, taskStatuses, projects, users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { TasksClient } from "@/components/tasks/tasks-client";

export default async function MyWorkPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [membership] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.userId, session.user.id), eq(memberships.status, "ACTIVE")))
    .limit(1);

  if (!membership) redirect("/onboarding");
  const orgId = membership.organizationId;

  const [me] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  const [myTasks, statuses, allProjects] = await Promise.all([
    db
      .select({ task: tasks, status: taskStatuses })
      .from(tasks)
      .leftJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
      .where(
        and(
          eq(tasks.organizationId, orgId),
          eq(tasks.assigneeId, session.user.id),
          isNull(tasks.parentId)
        )
      ),
    db
      .select()
      .from(taskStatuses)
      .where(eq(taskStatuses.organizationId, orgId))
      .orderBy(taskStatuses.position),
    db.select().from(projects).where(eq(projects.organizationId, orgId)),
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Mon travail"
        subtitle={`${myTasks.length} tâche${myTasks.length !== 1 ? "s" : ""} assignée${myTasks.length !== 1 ? "s" : ""}`}
      />
      <TasksClient
        tasks={myTasks.map((t) => ({
          id: t.task.id,
          title: t.task.title,
          description: t.task.description,
          priority: t.task.priority,
          statusId: t.task.statusId,
          statusName: t.status?.name ?? "—",
          statusColor: t.status?.color ?? "#94a3b8",
          statusCategory: t.status?.category ?? "TODO",
          assigneeId: t.task.assigneeId,
          assigneeName: me?.name ?? me?.email ?? "Moi",
          assigneeImage: me?.image ?? null,
          dueDate: t.task.dueDate?.toISOString() ?? null,
          startDate: t.task.startDate?.toISOString() ?? null,
          estimateHours: t.task.estimateHours,
          projectId: t.task.projectId,
          isBlocked: t.task.isBlocked,
          position: t.task.position,
          createdAt: t.task.createdAt.toISOString(),
        }))}
        statuses={statuses.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          category: s.category,
          position: s.position,
        }))}
        users={me ? [{ id: me.id, name: me.name ?? me.email ?? "Moi", image: me.image }] : []}
        projects={allProjects.map((p) => ({ id: p.id, name: p.name, color: p.color }))}
        organizationId={orgId}
        currentUserId={session.user.id}
      />
    </div>
  );
}
