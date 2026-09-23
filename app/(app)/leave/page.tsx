import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { memberships, leaveRequests, leaveTypes, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { LeaveClient } from "@/components/leave/leave-client";

export default async function LeavePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [membership] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.userId, session.user.id), eq(memberships.status, "ACTIVE")))
    .limit(1);

  if (!membership) redirect("/onboarding");
  const orgId = membership.organizationId;

  const [myRequests, types, teamRequests] = await Promise.all([
    db
      .select({ request: leaveRequests, type: leaveTypes })
      .from(leaveRequests)
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(eq(leaveRequests.userId, session.user.id))
      .orderBy(desc(leaveRequests.startDate)),
    db.select().from(leaveTypes).where(eq(leaveTypes.organizationId, orgId)),
    db
      .select({ request: leaveRequests, user: users, type: leaveTypes })
      .from(leaveRequests)
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .innerJoin(memberships, and(
        eq(memberships.userId, leaveRequests.userId),
        eq(memberships.organizationId, orgId),
        eq(memberships.status, "ACTIVE")
      ))
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(eq(leaveRequests.status, "PENDING"))
      .orderBy(desc(leaveRequests.createdAt)),
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Congés & Absences"
        subtitle={`${myRequests.length} demande${myRequests.length !== 1 ? "s" : ""}`}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <LeaveClient
          myRequests={myRequests.map((r) => ({
            id: r.request.id,
            startDate: r.request.startDate.toISOString(),
            endDate: r.request.endDate.toISOString(),
            workingDays: r.request.days ?? 0,
            reason: r.request.reason,
            status: r.request.status,
            leaveTypeName: r.type?.name ?? "—",
            leaveTypeColor: r.type?.color ?? "#94a3b8",
          }))}
          leaveTypes={types.map((t) => ({
            id: t.id,
            name: t.name,
            color: t.color,
            requiresApproval: t.requireApproval,
          }))}
          pendingTeamRequests={teamRequests.map((r) => ({
            id: r.request.id,
            userName: r.user.name ?? r.user.email ?? "—",
            userImage: r.user.image,
            startDate: r.request.startDate.toISOString(),
            endDate: r.request.endDate.toISOString(),
            workingDays: r.request.days ?? 0,
            reason: r.request.reason,
            leaveTypeName: r.type?.name ?? "—",
          }))}
          organizationId={orgId}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
