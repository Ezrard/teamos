import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  memberships,
  organizations,
  users,
  workSchedules,
  roles,
  rolePermissions,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { SettingsClient } from "@/components/settings/settings-client";
import { getActiveOrgId } from "@/lib/get-org";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getActiveOrgId(session.user.id);

  const [membership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, session.user.id),
        eq(memberships.organizationId, orgId),
        eq(memberships.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!membership) redirect("/onboarding");

  const [org, user, schedule] = await Promise.all([
    db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1).then((r) => r[0]),
    db.select().from(users).where(eq(users.id, session.user.id)).limit(1).then((r) => r[0]),
    db
      .select()
      .from(workSchedules)
      .where(
        and(
          eq(workSchedules.organizationId, orgId),
          eq(workSchedules.userId, session.user.id)
        )
      )
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);

  if (!org || !user) redirect("/login");

  // Load current user's role
  const [currentRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, membership.roleId))
    .limit(1);

  const isOwner = currentRole?.name === "Owner";
  const isAdmin = isOwner || currentRole?.name === "Admin";

  // Load all roles with permissions (only if admin/owner)
  let allRolesWithPerms: {
    id: string;
    name: string;
    color: string;
    isSystem: boolean;
    permissions: { resource: string; action: string; scope: string }[];
  }[] = [];

  if (isAdmin) {
    const allRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.organizationId, orgId));

    const permsPerRole = await Promise.all(
      allRoles.map((r) =>
        db
          .select({
            resource: rolePermissions.resource,
            action: rolePermissions.action,
            scope: rolePermissions.scope,
          })
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, r.id))
      )
    );

    allRolesWithPerms = allRoles.map((r, i) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      isSystem: r.isSystem,
      permissions: permsPerRole[i],
    }));
  }

  // Load all active members (for transfer ownership)
  let allMembers: { id: string; name: string; email: string; roleId: string; roleName: string }[] = [];
  if (isOwner) {
    const membersRaw = await db
      .select({
        userId: memberships.userId,
        roleId: memberships.roleId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(
        and(
          eq(memberships.organizationId, orgId),
          eq(memberships.status, "ACTIVE")
        )
      );

    const allOrgRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.organizationId, orgId));

    const roleMap = Object.fromEntries(allOrgRoles.map((r) => [r.id, r.name]));

    allMembers = membersRaw
      .filter((m) => m.userId !== session.user.id)
      .map((m) => ({
        id: m.userId,
        name: m.userName ?? m.userEmail ?? "—",
        email: m.userEmail ?? "—",
        roleId: m.roleId,
        roleName: roleMap[m.roleId] ?? "—",
      }));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Paramètres" />
      <div className="flex-1 overflow-y-auto p-6">
        <SettingsClient
          user={{
            id: user.id,
            name: user.name ?? "",
            email: user.email ?? "",
            image: user.image,
          }}
          org={{
            id: org.id,
            name: org.name,
            slug: org.slug,
          }}
          schedule={
            schedule
              ? {
                  mondayHours: schedule.mondayHours ?? 8,
                  tuesdayHours: schedule.tuesdayHours ?? 8,
                  wednesdayHours: schedule.wednesdayHours ?? 8,
                  thursdayHours: schedule.thursdayHours ?? 8,
                  fridayHours: schedule.fridayHours ?? 8,
                }
              : null
          }
          organizationId={orgId}
          currentRoleName={currentRole?.name ?? ""}
          isOwner={isOwner}
          isAdmin={isAdmin}
          roles={allRolesWithPerms}
          members={allMembers}
        />
      </div>
    </div>
  );
}
