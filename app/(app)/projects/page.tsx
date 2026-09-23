import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, memberships, tasks, taskStatuses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { ProjectsClient } from "@/components/projects/projects-client";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [membership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, session.user.id),
        eq(memberships.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!membership) redirect("/onboarding");
  const orgId = membership.organizationId;

  const allProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.organizationId, orgId));

  // Get task counts per project
  const allTasks = await db
    .select({ task: tasks, status: taskStatuses })
    .from(tasks)
    .leftJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
    .where(eq(tasks.organizationId, orgId));

  const projectsWithStats = allProjects.map((project) => {
    const projectTasks = allTasks.filter((t) => t.task.projectId === project.id);
    const doneTasks = projectTasks.filter((t) => t.status?.category === "DONE");
    const overdueTasks = projectTasks.filter(
      (t) =>
        t.task.dueDate &&
        t.task.dueDate < new Date() &&
        t.status?.category !== "DONE"
    );

    return {
      ...project,
      taskCount: projectTasks.length,
      doneCount: doneTasks.length,
      overdueCount: overdueTasks.length,
      progress: projectTasks.length > 0
        ? Math.round((doneTasks.length / projectTasks.length) * 100)
        : 0,
    };
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Projets" subtitle={`${allProjects.length} projet${allProjects.length > 1 ? "s" : ""}`} />
      <div className="flex-1 overflow-y-auto p-6">
        <ProjectsClient
          projects={projectsWithStats}
          organizationId={orgId}
          userId={session.user.id}
        />
      </div>
    </div>
  );
}
