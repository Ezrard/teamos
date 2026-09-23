import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  projects, memberships, tasks, taskStatuses, users,
  projectMembers,
} from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { TasksClient } from "@/components/tasks/tasks-client";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Calendar, Users, Percent } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PLANNING: { label: "Planification", color: "bg-gray-100 text-gray-700" },
  ACTIVE: { label: "Actif", color: "bg-emerald-100 text-emerald-700" },
  ON_HOLD: { label: "En pause", color: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Terminé", color: "bg-blue-100 text-blue-700" },
  ARCHIVED: { label: "Archivé", color: "bg-gray-100 text-gray-500" },
};

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [membership] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.userId, session.user.id), eq(memberships.status, "ACTIVE")))
    .limit(1);

  if (!membership) redirect("/onboarding");
  const orgId = membership.organizationId;

  // Fetch project
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.organizationId, orgId)))
    .limit(1);

  if (!project) notFound();

  const [allTasks, statuses, allUsers, projectTasksRaw] = await Promise.all([
    db
      .select({ task: tasks, status: taskStatuses, assignee: users })
      .from(tasks)
      .leftJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(and(eq(tasks.projectId, id), isNull(tasks.parentId))),
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
    db
      .select()
      .from(tasks)
      .leftJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
      .where(eq(tasks.projectId, id)),
  ]);

  // Stats
  const totalTasks = projectTasksRaw.length;
  const doneTasks = projectTasksRaw.filter((t) => t.task_statuses?.category === "DONE").length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const statusConfig = STATUS_CONFIG[project.status] ?? { label: project.status, color: "bg-gray-100 text-gray-700" };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={project.name}
        subtitle={project.client ? `Client: ${project.client}` : undefined}
        actions={
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        }
      />

      {/* Project stats bar */}
      <div className="flex items-center gap-6 px-6 py-2.5 border-b bg-muted/30 text-xs text-muted-foreground shrink-0">
        <div className="flex items-center gap-1.5">
          <Percent className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{progress}%</span>
          <span>terminé</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-foreground">{doneTasks}/{totalTasks}</span>
          <span>tâches</span>
        </div>
        {project.endDate && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>Échéance: <span className="font-medium text-foreground">{formatDate(project.endDate)}</span></span>
          </div>
        )}
        {/* Progress bar */}
        <div className="flex-1 max-w-32">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: project.color }}
            />
          </div>
        </div>
      </div>

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
        projects={[{
          id: project.id,
          name: project.name,
          color: project.color,
        }]}
        organizationId={orgId}
        currentUserId={session.user.id}
        projectId={id}
      />
    </div>
  );
}
