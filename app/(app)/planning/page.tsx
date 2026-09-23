import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { memberships, users, tasks, taskStatuses, timeEntries, leaveRequests, leaveTypes, workSchedules } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { WorkloadClient } from "@/components/planning/workload-client";
import { startOfWeek, endOfWeek, addDays } from "date-fns";

export default async function PlanningPage() {
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

  const [allMembers, allTasks, allTimeEntries, approvedLeave, schedules] = await Promise.all([
    db
      .select({ membership: memberships, user: users })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(and(eq(memberships.organizationId, orgId), eq(memberships.status, "ACTIVE"))),
    db
      .select({ task: tasks, status: taskStatuses })
      .from(tasks)
      .leftJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
      .where(eq(tasks.organizationId, orgId)),
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
      .from(leaveRequests)
      .innerJoin(memberships, and(
        eq(memberships.userId, leaveRequests.userId),
        eq(memberships.organizationId, orgId),
        eq(memberships.status, "ACTIVE")
      ))
      .where(
        and(
          eq(leaveRequests.status, "APPROVED"),
          lte(leaveRequests.startDate, weekEnd),
          gte(leaveRequests.endDate, weekStart)
        )
      ),
    db.select().from(workSchedules).where(eq(workSchedules.organizationId, orgId)),
  ]);

  // Calculate workload per member
  const memberWorkloads = allMembers.map(({ membership: m, user }) => {
    const schedule = schedules.find((s) => s.userId === user.id) ??
      schedules.find((s) => s.userId === null) ??
      null;

    // Calculate weekly capacity (in hours)
    const dailyHours = schedule ? (
      (schedule.mondayHours ?? 0) +
      (schedule.tuesdayHours ?? 0) +
      (schedule.wednesdayHours ?? 0) +
      (schedule.thursdayHours ?? 0) +
      (schedule.fridayHours ?? 0)
    ) : 40;

    // Deduct approved leave this week
    const leave = approvedLeave.filter((l) => l.leave_requests.userId === user.id);
    const leaveDays = leave.reduce((acc, l) => acc + (l.leave_requests.days ?? 0), 0);
    const leaveHours = leaveDays * (dailyHours / 5);
    const capacity = Math.max(0, dailyHours - leaveHours);

    // Active tasks assigned to this user
    const userTasks = allTasks.filter(
      (t) => t.task.assigneeId === user.id && t.status?.category !== "DONE"
    );
    const scheduledHours = userTasks.reduce((acc, t) => acc + (t.task.estimateHours ?? 0), 0);

    // Time logged this week
    const loggedHours = allTimeEntries
      .filter((te) => te.userId === user.id)
      .reduce((acc, te) => acc + (te.hours ?? 0), 0);

    const utilization = capacity > 0 ? Math.round((scheduledHours / capacity) * 100) : 0;
    const available = Math.max(0, capacity - scheduledHours);
    const overload = scheduledHours > capacity;

    return {
      userId: user.id,
      name: user.name ?? user.email ?? "—",
      image: user.image,
      capacity,
      scheduledHours,
      loggedHours,
      utilization,
      available,
      overload,
      taskCount: userTasks.length,
      leaveHours,
    };
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Planning & Charge" subtitle="Semaine courante" />
      <div className="flex-1 overflow-y-auto p-6">
        <WorkloadClient
          members={memberWorkloads}
          weekStart={weekStart.toISOString()}
          weekEnd={weekEnd.toISOString()}
        />
      </div>
    </div>
  );
}
