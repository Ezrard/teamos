import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { memberships, users, roles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { TeamsClient } from "@/components/teams/teams-client";

export default async function TeamsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [membership] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.userId, session.user.id), eq(memberships.status, "ACTIVE")))
    .limit(1);

  if (!membership) redirect("/onboarding");
  const orgId = membership.organizationId;

  const [allMembers, allRoles] = await Promise.all([
    db
      .select({ membership: memberships, user: users, role: roles })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .leftJoin(roles, eq(memberships.roleId, roles.id))
      .where(and(eq(memberships.organizationId, orgId), eq(memberships.status, "ACTIVE"))),
    db.select().from(roles).where(eq(roles.organizationId, orgId)),
  ]);

  const members = allMembers.map((m) => ({
    id: m.membership.id,
    userId: m.user.id,
    name: m.user.name ?? m.user.email ?? "—",
    email: m.user.email ?? "—",
    image: m.user.image,
    roleId: m.membership.roleId,
    roleName: m.role?.name ?? "—",
    joinedAt: m.membership.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Équipe"
        subtitle={`${members.length} membre${members.length > 1 ? "s" : ""}`}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <TeamsClient
          members={members}
          roles={allRoles.map((r) => ({ id: r.id, name: r.name }))}
          organizationId={orgId}
          currentUserId={session.user.id}
          currentMembershipId={membership.id}
          currentRoleId={membership.roleId ?? ""}
        />
      </div>
    </div>
  );
}
