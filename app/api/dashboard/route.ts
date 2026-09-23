import { NextRequest } from "next/server";
import { withAuth, apiSuccess } from "@/lib/api/middleware";
import { db } from "@/lib/db";
import {
  tasks,
  projects,
  users,
  memberships,
  leaveRequests,
  timeEntries,
  taskStatuses,
  notifications,
} from "@/lib/db/schema";
import { eq, and, lt, gte, lte, count, sql, ne } from "drizzle-orm";
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Get done statuses
    const doneStatuses = await db
      .select()
      .from(taskStatuses)
      .where(
        and(
          eq(taskStatuses.organizationId, ctx.organizationId),
          eq(taskStatuses.category, "DONE")
        )
      );
    const doneStatusIds = doneStatuses.map((s) => s.id);

    // All org tasks
    const orgTasks = await db
      .select({ task: tasks, status: taskStatuses })
      .from(tasks)
      .leftJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
      .where(eq(tasks.organizationId, ctx.organizationId));

    const activeTasks = orgTasks.filter(
      (t) => t.status?.category !== "DONE" && t.status?.category !== "CANCELLED"
    );
    const overdueTasks = activeTasks.filter(
      (t) => t.task.dueDate && t.task.dueDate < now
    );
    const blockedTasks = activeTasks.filter((t) => t.task.isBlocked);
    const inProgressTasks = activeTasks.filter(
      (t) => t.status?.category === "IN_PROGRESS"
    );
    const dueSoonTasks = activeTasks.filter((t) => {
      if (!t.task.dueDate) return false;
      const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      return t.task.dueDate <= threeDays && t.task.dueDate >= now;
    });

    // My tasks
    const myTasks = orgTasks.filter((t) => t.task.assigneeId === ctx.userId);
    const myOverdue = myTasks.filter(
      (t) =>
        t.task.dueDate &&
        t.task.dueDate < now &&
        t.status?.category !== "DONE"
    );

    // Projects
    const allProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.organizationId, ctx.organizationId));

    const activeProjects = allProjects.filter((p) => p.status === "ACTIVE");
    const onHoldProjects = allProjects.filter((p) => p.status === "ON_HOLD");

    // Members
    const members = await db
      .select({ user: users, membership: memberships })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(
        and(
          eq(memberships.organizationId, ctx.organizationId),
          eq(memberships.status, "ACTIVE")
        )
      );

    // Absent today
    const absentToday = await db
      .select()
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.status, "APPROVED"),
          lte(leaveRequests.startDate, todayEnd),
          gte(leaveRequests.endDate, today)
        )
      );

    const absentUserIds = [...new Set(absentToday.map((l) => l.userId))];

    // Time this week
    const weekEntries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          gte(timeEntries.date, weekStart),
          lte(timeEntries.date, weekEnd)
        )
      );

    const weeklyLogged = weekEntries.reduce((sum, e) => sum + (e.hours ?? 0), 0);

    // Upcoming deadlines (next 7 days)
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = activeTasks
      .filter(
        (t) =>
          t.task.dueDate &&
          t.task.dueDate >= now &&
          t.task.dueDate <= nextWeek
      )
      .slice(0, 5);

    // Unread notifications
    const unreadCount = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.userId),
          eq(notifications.isRead, false)
        )
      );

    return apiSuccess({
      tasks: {
        total: orgTasks.length,
        active: activeTasks.length,
        overdue: overdueTasks.length,
        blocked: blockedTasks.length,
        inProgress: inProgressTasks.length,
        dueSoon: dueSoonTasks.length,
      },
      myTasks: {
        total: myTasks.length,
        overdue: myOverdue.length,
      },
      projects: {
        total: allProjects.length,
        active: activeProjects.length,
        onHold: onHoldProjects.length,
        atRisk: allProjects.filter((p) =>
          orgTasks.some(
            (t) =>
              t.task.projectId === p.id &&
              t.task.dueDate &&
              t.task.dueDate < now &&
              t.status?.category !== "DONE"
          )
        ).length,
      },
      members: {
        total: members.length,
        absent: absentUserIds.length,
      },
      time: {
        weeklyLogged,
      },
      upcomingDeadlines: upcomingDeadlines.map((t) => t.task),
      absentToday: absentUserIds,
      unreadNotifications: unreadCount[0]?.count ?? 0,
    });
  });
}
