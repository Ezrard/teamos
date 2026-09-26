export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Sidebar } from "@/components/layout/sidebar";
import { db } from "@/lib/db";
import { memberships, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get all active organizations for this user
  const allMemberships = await db
    .select({ membership: memberships, organization: organizations })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(
      and(
        eq(memberships.userId, session.user.id),
        eq(memberships.status, "ACTIVE")
      )
    );

  if (allMemberships.length === 0) {
    redirect("/onboarding");
  }

  // Try to use the cookie-selected org, fall back to first
  const cookieStore = await cookies();
  const selectedOrgId = cookieStore.get("selected-org-id")?.value;

  const activeMembership =
    (selectedOrgId
      ? allMemberships.find((m) => m.organization.id === selectedOrgId)
      : null) ?? allMemberships[0];

  const activeOrgId = activeMembership.organization.id;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        user={session.user}
        organizationName={activeMembership.organization.name}
        organizations={allMemberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          active: m.organization.id === activeOrgId,
        }))}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
