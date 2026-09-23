import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { memberships, notifications } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { NotificationsClient } from "@/components/notifications/notifications-client";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [membership] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.userId, session.user.id), eq(memberships.status, "ACTIVE")))
    .limit(1);

  if (!membership) redirect("/onboarding");
  const orgId = membership.organizationId;

  const items = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, session.user.id),
        eq(notifications.organizationId, orgId)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout lu"}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <NotificationsClient
          notifications={items.map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            link: n.link,
            isRead: n.isRead,
            createdAt: n.createdAt.toISOString(),
          }))}
          organizationId={orgId}
        />
      </div>
    </div>
  );
}
