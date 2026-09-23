import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { memberships, organizations, users, workSchedules } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [membership] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.userId, session.user.id), eq(memberships.status, "ACTIVE")))
    .limit(1);

  if (!membership) redirect("/onboarding");
  const orgId = membership.organizationId;

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  const [schedule] = await db
    .select()
    .from(workSchedules)
    .where(and(eq(workSchedules.organizationId, orgId), eq(workSchedules.userId, session.user.id)))
    .limit(1);

  if (!org || !user) redirect("/login");

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
          schedule={schedule ? {
            mondayHours: schedule.mondayHours ?? 8,
            tuesdayHours: schedule.tuesdayHours ?? 8,
            wednesdayHours: schedule.wednesdayHours ?? 8,
            thursdayHours: schedule.thursdayHours ?? 8,
            fridayHours: schedule.fridayHours ?? 8,
          } : null}
          organizationId={orgId}
        />
      </div>
    </div>
  );
}
