import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { memberships, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";

/**
 * Returns the active organization ID for the current user,
 * respecting the cookie-selected org (from the org switcher).
 */
export async function getActiveOrgId(userId: string): Promise<string> {
  const allMemberships = await db
    .select({ orgId: memberships.organizationId })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.status, "ACTIVE")
      )
    );

  if (allMemberships.length === 0) {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const selectedOrgId = cookieStore.get("selected-org-id")?.value;

  if (selectedOrgId && allMemberships.some((m) => m.orgId === selectedOrgId)) {
    return selectedOrgId;
  }

  return allMemberships[0].orgId;
}
