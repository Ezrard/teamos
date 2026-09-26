import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tasks, taskStatuses, users, projects, memberships } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { TasksClient } from "@/components/tasks/tasks-client";
import { getActiveOrgId } from "@/lib/get-org";

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getActiveOrgId(session.user.id);

  const [allTasks, statuses, allUsers, allProjects] = await Promise.all([
    db
      .select({
        task: tasks,
        status: taskStatuses,
        assignee: users,
      })
      .from(tasks)
      .leftJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(and(eq(tasks.organizationId, orgId), isNull(tasks.parentId))),
    db
      .select()
      .from(taskStatuses)
      .where(eq(taskStatuses.organizationId, orgId))
      .orderBy(taskStatuses.position),
    db
      .select({ user: users })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(and(eq(memberships.organizationId, orgId), eq(memberships.status, "ACTIVE"))),
    db.select().from(projects).where(eq(projects.organizationId, orgId)),
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Tâches"
        subtitle={`${allTasks.length} tâche${allTasks.length > 1 ? "s" : ""}`}
      />
      <TasksClient
        tasks={allTasks.map((t) => ({
          id: t.task.id,
          title: t.task.title,
          description: t.task.description,
          priority: t.task.priority,
          statusId: t.task.statusId,
          statusName: t.status?.name ?? "—",
          statusColor: t.status?.color ?? "#94a3b8",
          statusCategory: t.status?.category ?? "TODO",
          assigneeId: t.task.assigneeId,
          assigneeName: t.assignee?.name ?? null,
          assigneeImage: t.assignee?.image ?? null,
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
        users={allUsers.map((m) => ({
          id: m.user.id,
          name: m.user.name ?? m.user.email ?? "—",
          image: m.user.image,
        }))}
        projects={allProjects.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
        }))}
        organizationId={orgId}
        currentUserId={session.user.id}
      />
    </div>
  );
}
