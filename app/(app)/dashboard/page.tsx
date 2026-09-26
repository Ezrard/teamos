import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/get-org";
import { db } from "@/lib/db";
import {
  tasks,
  projects,
  memberships,
  leaveRequests,
  taskStatuses,
  users,
  timeEntries,
} from "@/lib/db/schema";
import { eq, and, lte, gte, lt } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  format,
} from "date-fns";
import { fr } from "date-fns/locale";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const now = new Date();
  const today = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const orgId = await getActiveOrgId(session.user.id);

  // Fetch dashboard data
  const [orgTasks, allProjects, allMembers, absentToday, weekEntries, doneStatuses] =
    await Promise.all([
      db
        .select({ task: tasks, status: taskStatuses })
        .from(tasks)
        .leftJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
        .where(eq(tasks.organizationId, orgId)),
      db.select().from(projects).where(eq(projects.organizationId, orgId)),
      db
        .select({ user: users })
        .from(memberships)
        .innerJoin(users, eq(memberships.userId, users.id))
        .where(
          and(
            eq(memberships.organizationId, orgId),
            eq(memberships.status, "ACTIVE")
          )
        ),
      db
        .select()
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.status, "APPROVED"),
            lte(leaveRequests.startDate, todayEnd),
            gte(leaveRequests.endDate, today)
          )
        ),
      db
        .select()
        .from(timeEntries)
        .where(
          and(
            gte(timeEntries.date, weekStart),
            lte(timeEntries.date, weekEnd)
          )
        ),
      db
        .select()
        .from(taskStatuses)
        .where(
          and(
            eq(taskStatuses.organizationId, orgId),
            eq(taskStatuses.category, "DONE")
          )
        ),
    ]);

  const doneIds = new Set(doneStatuses.map((s) => s.id));
  const activeTasks = orgTasks.filter((t) => !doneIds.has(t.task.statusId));
  const overdueTasks = activeTasks.filter(
    (t) => t.task.dueDate && t.task.dueDate < now
  );
  const blockedTasks = activeTasks.filter((t) => t.task.isBlocked);
  const myTasks = orgTasks.filter(
    (t) =>
      t.task.assigneeId === session.user?.id && !doneIds.has(t.task.statusId)
  );
  const myOverdue = myTasks.filter(
    (t) => t.task.dueDate && t.task.dueDate < now
  );

  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = activeTasks
    .filter((t) => t.task.dueDate && t.task.dueDate >= now && t.task.dueDate <= nextWeek)
    .sort((a, b) => (a.task.dueDate?.getTime() ?? 0) - (b.task.dueDate?.getTime() ?? 0))
    .slice(0, 8);

  const weeklyLogged = weekEntries.reduce((sum, e) => sum + (e.hours ?? 0), 0);
  const activeProjects = allProjects.filter((p) => p.status === "ACTIVE");
  const atRiskProjects = activeProjects.filter((p) =>
    overdueTasks.some((t) => t.task.projectId === p.id)
  );

  const absentIds = [...new Set(absentToday.map((l) => l.userId))];
  const absentUsers = allMembers.filter((m) => absentIds.includes(m.user.id));

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const stats = {
    totalMembers: allMembers.length,
    activeProjects: activeProjects.length,
    atRisk: atRiskProjects.length,
    weeklyTasks: activeTasks.length,
    overdueTasks: overdueTasks.length,
    blockedTasks: blockedTasks.length,
    absentToday: absentIds.length,
    myTasks: myTasks.length,
    myOverdue: myOverdue.length,
    weeklyLogged,
    capacityUsed: allMembers.length > 0
      ? Math.min(100, Math.round((weeklyLogged / (allMembers.length * 40)) * 100))
      : 0,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={`${greeting()}, ${session.user.name?.split(" ")[0] ?? ""}!`}
        subtitle={format(now, "EEEE d MMMM yyyy", { locale: fr })}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <DashboardClient
          stats={stats}
          upcomingDeadlines={upcomingDeadlines.map((t) => ({
            id: t.task.id,
            title: t.task.title,
            dueDate: t.task.dueDate?.toISOString() ?? null,
            priority: t.task.priority,
            statusName: t.status?.name ?? "—",
            statusColor: t.status?.color ?? "#94a3b8",
            projectId: t.task.projectId,
          }))}
          absentUsers={absentUsers.map((m) => ({
            id: m.user.id,
            name: m.user.name ?? m.user.email ?? "—",
            image: m.user.image,
          }))}
          recentProjects={activeProjects.slice(0, 4).map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            status: p.status,
            isAtRisk: atRiskProjects.some((r) => r.id === p.id),
          }))}
          organizationId={orgId}
        />
      </div>
    </div>
  );
}
