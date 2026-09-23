import { NextRequest } from "next/server";
import { withAuth, apiSuccess } from "@/lib/api/middleware";
import { db } from "@/lib/db";
import {
  users,
  memberships,
  tasks,
  timeEntries,
  leaveRequests,
  workSchedules,
} from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { startOfWeek, endOfWeek, eachDayOfInterval, getDay } from "date-fns";

export async function GET(req: NextRequest) {
  return withAuth(req, async (ctx, req) => {
    const { searchParams } = req.nextUrl;
    const weekStr = searchParams.get("week");
    const weekDate = weekStr ? new Date(weekStr) : new Date();

    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });

    // Get all active members
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

    const workloadData = await Promise.all(
      members.map(async ({ user, membership }) => {
        // Get work schedule
        const [schedule] = await db
          .select()
          .from(workSchedules)
          .where(eq(workSchedules.userId, user.id))
          .limit(1);

        const defaultSchedule = {
          mondayHours: 8,
          tuesdayHours: 8,
          wednesdayHours: 8,
          thursdayHours: 8,
          fridayHours: 8,
          saturdayHours: 0,
          sundayHours: 0,
        };
        const sched = schedule ?? defaultSchedule;
        const dayHours = [
          sched.sundayHours,
          sched.mondayHours,
          sched.tuesdayHours,
          sched.wednesdayHours,
          sched.thursdayHours,
          sched.fridayHours,
          sched.saturdayHours,
        ];

        // Get approved leaves this week
        const leaves = await db
          .select()
          .from(leaveRequests)
          .where(
            and(
              eq(leaveRequests.userId, user.id),
              eq(leaveRequests.status, "APPROVED"),
              lte(leaveRequests.startDate, weekEnd),
              gte(leaveRequests.endDate, weekStart)
            )
          );

        // Calculate capacity accounting for leaves
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        let capacity = 0;
        const dayCapacities: Record<string, number> = {};

        for (const day of days) {
          const dayOfWeek = getDay(day);
          let dayCapacity = dayHours[dayOfWeek];

          // Subtract leave hours
          for (const leave of leaves) {
            if (day >= leave.startDate && day <= leave.endDate) {
              dayCapacity = 0;
            }
          }

          capacity += dayCapacity;
          dayCapacities[day.toISOString().split("T")[0]] = dayCapacity;
        }

        // Get tasks with estimates this week
        const userTasks = await db
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.assigneeId, user.id),
              eq(tasks.organizationId, ctx.organizationId)
            )
          );

        const scheduledHours = userTasks.reduce(
          (sum, t) => sum + (t.estimateHours ?? 0),
          0
        );

        // Get logged time this week
        const loggedEntries = await db
          .select()
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.userId, user.id),
              gte(timeEntries.date, weekStart),
              lte(timeEntries.date, weekEnd)
            )
          );

        const loggedHours = loggedEntries.reduce(
          (sum, e) => sum + (e.hours ?? 0),
          0
        );

        const utilization = capacity > 0 ? (scheduledHours / capacity) * 100 : 0;
        const overload = Math.max(0, scheduledHours - capacity);
        const available = Math.max(0, capacity - scheduledHours);

        return {
          user,
          capacity,
          scheduledHours,
          loggedHours,
          utilization,
          overload,
          available,
          isOverloaded: scheduledHours > capacity,
          leaves,
          dayCapacities,
          tasks: userTasks,
        };
      })
    );

    return apiSuccess({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      workload: workloadData,
    });
  });
}
