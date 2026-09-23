/**
 * Seed script for TeamOS demo data.
 * Run with: npx tsx scripts/seed.ts
 *
 * Creates a demo organization with realistic data including:
 * - 1 demo user (demo@teamos.app / demo1234)
 * - 5 team members
 * - 3 projects with tasks
 * - Time entries and leave requests
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as bcrypt from "bcryptjs";
import * as schema from "../lib/db/schema";
import { eq, and } from "drizzle-orm";
import "dotenv/config";

const queryClient = postgres(process.env.DATABASE_URL!);
const db = drizzle(queryClient, { schema });

function id() {
  return crypto.randomUUID();
}

async function main() {
  console.log("🌱 Seeding TeamOS demo data...\n");

  // ─── Users ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const USERS = [
    { id: id(), name: "Sophie Martin", email: "demo@teamos.app", image: null },
    { id: id(), name: "Thomas Dubois", email: "thomas@teamos.app", image: null },
    { id: id(), name: "Emma Bernard", email: "emma@teamos.app", image: null },
    { id: id(), name: "Lucas Petit", email: "lucas@teamos.app", image: null },
    { id: id(), name: "Chloé Moreau", email: "chloe@teamos.app", image: null },
    { id: id(), name: "Maxime Lefevre", email: "maxime@teamos.app", image: null },
  ];

  // Check if demo user already exists
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, "demo@teamos.app")).limit(1);
  if (existing.length > 0) {
    console.log("✋ Demo data already exists. Skipping seed.");
    process.exit(0);
  }

  for (const user of USERS) {
    await db.insert(schema.users).values({
      id: user.id,
      name: user.name,
      email: user.email,
      password: passwordHash,
      image: user.image,
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`✅ Created ${USERS.length} users`);

  // ─── Organization ─────────────────────────────────────────────────────────
  const orgId = id();
  await db.insert(schema.organizations).values({
    id: orgId,
    name: "Acme Digital",
    slug: "acme-digital",
    description: "Agence digitale spécialisée en développement web et mobile",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`✅ Created organization: Acme Digital`);

  // ─── Roles ────────────────────────────────────────────────────────────────
  const ROLES = [
    { id: id(), name: "Owner" },
    { id: id(), name: "Admin" },
    { id: id(), name: "Manager" },
    { id: id(), name: "Employee" },
    { id: id(), name: "Guest" },
  ];

  for (const role of ROLES) {
    await db.insert(schema.roles).values({
      id: role.id,
      organizationId: orgId,
      name: role.name,
      createdAt: new Date(),
    });
  }

  const ownerRole = ROLES.find((r) => r.name === "Owner")!;
  const managerRole = ROLES.find((r) => r.name === "Manager")!;
  const employeeRole = ROLES.find((r) => r.name === "Employee")!;
  console.log(`✅ Created ${ROLES.length} roles`);

  // ─── Memberships ──────────────────────────────────────────────────────────
  const MEMBERSHIP_ROLES = [
    { user: USERS[0], role: ownerRole },
    { user: USERS[1], role: managerRole },
    { user: USERS[2], role: employeeRole },
    { user: USERS[3], role: employeeRole },
    { user: USERS[4], role: employeeRole },
    { user: USERS[5], role: managerRole },
  ];

  for (const { user, role } of MEMBERSHIP_ROLES) {
    await db.insert(schema.memberships).values({
      id: id(),
      organizationId: orgId,
      userId: user.id,
      roleId: role.id,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`✅ Created ${MEMBERSHIP_ROLES.length} memberships`);

  // ─── Task Statuses ────────────────────────────────────────────────────────
  const STATUSES = [
    { id: id(), name: "Backlog", color: "#94a3b8", category: "BACKLOG" as const, position: 0 },
    { id: id(), name: "À faire", color: "#64748b", category: "TODO" as const, position: 1 },
    { id: id(), name: "En cours", color: "#3b82f6", category: "IN_PROGRESS" as const, position: 2 },
    { id: id(), name: "En révision", color: "#f59e0b", category: "IN_REVIEW" as const, position: 3 },
    { id: id(), name: "Terminé", color: "#10b981", category: "DONE" as const, position: 4 },
  ];

  for (const status of STATUSES) {
    await db.insert(schema.taskStatuses).values({
      id: status.id,
      organizationId: orgId,
      name: status.name,
      color: status.color,
      category: status.category,
      position: status.position,
    });
  }

  const backlogStatus = STATUSES.find((s) => s.category === "BACKLOG")!;
  const todoStatus = STATUSES.find((s) => s.category === "TODO")!;
  const inProgressStatus = STATUSES.find((s) => s.category === "IN_PROGRESS")!;
  const inReviewStatus = STATUSES.find((s) => s.category === "IN_REVIEW")!;
  const doneStatus = STATUSES.find((s) => s.category === "DONE")!;
  console.log(`✅ Created ${STATUSES.length} task statuses`);

  // ─── Work Schedules ───────────────────────────────────────────────────────
  for (const user of USERS) {
    await db.insert(schema.workSchedules).values({
      id: id(),
      organizationId: orgId,
      userId: user.id,
      mondayHours: 8,
      tuesdayHours: 8,
      wednesdayHours: 8,
      thursdayHours: 8,
      fridayHours: 8,
      saturdayHours: 0,
      sundayHours: 0,
    });
  }
  console.log(`✅ Created work schedules`);

  // ─── Leave Types ──────────────────────────────────────────────────────────
  const LEAVE_TYPES = [
    { id: id(), name: "Congés payés", color: "#10b981", requireApproval: true },
    { id: id(), name: "RTT", color: "#3b82f6", requireApproval: true },
    { id: id(), name: "Maladie", color: "#f59e0b", requireApproval: false },
    { id: id(), name: "Télétravail", color: "#8b5cf6", requireApproval: false },
    { id: id(), name: "Formation", color: "#06b6d4", requireApproval: true },
  ];

  for (const lt of LEAVE_TYPES) {
    await db.insert(schema.leaveTypes).values({
      id: lt.id,
      organizationId: orgId,
      name: lt.name,
      color: lt.color,
      requireApproval: lt.requireApproval,
      createdAt: new Date(),
    });
  }
  console.log(`✅ Created ${LEAVE_TYPES.length} leave types`);

  // ─── Projects ─────────────────────────────────────────────────────────────
  const PROJECTS = [
    {
      id: id(),
      name: "Refonte Site Web",
      description: "Refonte complète du site corporate avec nouveau design system",
      color: "#6366f1",
      status: "ACTIVE" as const,
      priority: "HIGH" as const,
      client: "Acme Corp",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-11-30"),
    },
    {
      id: id(),
      name: "Application Mobile",
      description: "Développement de l'application iOS/Android pour les clients",
      color: "#3b82f6",
      status: "ACTIVE" as const,
      priority: "URGENT" as const,
      client: null,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-12-31"),
    },
    {
      id: id(),
      name: "Campagne Marketing Q4",
      description: "Stratégie et exécution de la campagne marketing du 4ème trimestre",
      color: "#f59e0b",
      status: "PLANNING" as const,
      priority: "MEDIUM" as const,
      client: null,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-12-15"),
    },
  ];

  for (const project of PROJECTS) {
    await db.insert(schema.projects).values({
      id: project.id,
      organizationId: orgId,
      name: project.name,
      description: project.description,
      color: project.color,
      status: project.status,
      priority: project.priority,
      client: project.client,
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`✅ Created ${PROJECTS.length} projects`);

  // ─── Tasks ────────────────────────────────────────────────────────────────
  const now = new Date();
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

  const TASKS = [
    // Project 1: Refonte Site Web
    { title: "Audit UX du site actuel", projectId: PROJECTS[0].id, statusId: doneStatus.id, priority: "HIGH" as const, assigneeId: USERS[1].id, estimateHours: 8, dueDate: addDays(now, -20) },
    { title: "Définition du nouveau design system", projectId: PROJECTS[0].id, statusId: doneStatus.id, priority: "HIGH" as const, assigneeId: USERS[2].id, estimateHours: 16, dueDate: addDays(now, -14) },
    { title: "Maquettes de la homepage", projectId: PROJECTS[0].id, statusId: inReviewStatus.id, priority: "HIGH" as const, assigneeId: USERS[2].id, estimateHours: 12, dueDate: addDays(now, -2) },
    { title: "Intégration HTML/CSS des maquettes", projectId: PROJECTS[0].id, statusId: inProgressStatus.id, priority: "HIGH" as const, assigneeId: USERS[3].id, estimateHours: 20, dueDate: addDays(now, 7) },
    { title: "Optimisation SEO", projectId: PROJECTS[0].id, statusId: todoStatus.id, priority: "MEDIUM" as const, assigneeId: USERS[0].id, estimateHours: 6, dueDate: addDays(now, 14) },
    { title: "Tests cross-browser", projectId: PROJECTS[0].id, statusId: todoStatus.id, priority: "MEDIUM" as const, assigneeId: USERS[3].id, estimateHours: 8, dueDate: addDays(now, 21) },
    { title: "Mise en production", projectId: PROJECTS[0].id, statusId: backlogStatus.id, priority: "HIGH" as const, assigneeId: USERS[1].id, estimateHours: 4, dueDate: addDays(now, 60) },

    // Project 2: Application Mobile
    { title: "Définition des user stories", projectId: PROJECTS[1].id, statusId: doneStatus.id, priority: "URGENT" as const, assigneeId: USERS[5].id, estimateHours: 10, dueDate: addDays(now, -10) },
    { title: "Architecture technique", projectId: PROJECTS[1].id, statusId: inProgressStatus.id, priority: "URGENT" as const, assigneeId: USERS[1].id, estimateHours: 16, dueDate: addDays(now, 3) },
    { title: "Prototype Figma", projectId: PROJECTS[1].id, statusId: inProgressStatus.id, priority: "HIGH" as const, assigneeId: USERS[2].id, estimateHours: 24, dueDate: addDays(now, 5) },
    { title: "Module d'authentification", projectId: PROJECTS[1].id, statusId: todoStatus.id, priority: "URGENT" as const, assigneeId: USERS[3].id, estimateHours: 12, dueDate: addDays(now, 14) },
    { title: "Dashboard utilisateur", projectId: PROJECTS[1].id, statusId: backlogStatus.id, priority: "HIGH" as const, assigneeId: USERS[4].id, estimateHours: 20, dueDate: addDays(now, 30) },
    { title: "API REST – endpoints core", projectId: PROJECTS[1].id, statusId: todoStatus.id, priority: "URGENT" as const, assigneeId: USERS[1].id, estimateHours: 30, dueDate: addDays(now, 7) },
    { title: "Tests unitaires", projectId: PROJECTS[1].id, statusId: backlogStatus.id, priority: "MEDIUM" as const, assigneeId: USERS[3].id, estimateHours: 16, dueDate: addDays(now, 45) },

    // Project 3: Campagne Marketing
    { title: "Brief créatif de la campagne", projectId: PROJECTS[2].id, statusId: todoStatus.id, priority: "HIGH" as const, assigneeId: USERS[5].id, estimateHours: 6, dueDate: addDays(now, 10) },
    { title: "Création des visuels", projectId: PROJECTS[2].id, statusId: backlogStatus.id, priority: "MEDIUM" as const, assigneeId: USERS[2].id, estimateHours: 20, dueDate: addDays(now, 25) },
    { title: "Rédaction des textes", projectId: PROJECTS[2].id, statusId: backlogStatus.id, priority: "MEDIUM" as const, assigneeId: USERS[0].id, estimateHours: 10, dueDate: addDays(now, 20) },

    // Standalone tasks (no project)
    { title: "Réunion hebdomadaire équipe", projectId: null, statusId: inProgressStatus.id, priority: "LOW" as const, assigneeId: USERS[0].id, estimateHours: 1, dueDate: addDays(now, 1) },
    { title: "Revoir les processus d'onboarding RH", projectId: null, statusId: todoStatus.id, priority: "MEDIUM" as const, assigneeId: USERS[5].id, estimateHours: 4, dueDate: addDays(now, 15) },
    { title: "Mettre à jour la documentation technique", projectId: null, statusId: backlogStatus.id, priority: "LOW" as const, assigneeId: USERS[1].id, estimateHours: 6, dueDate: addDays(now, 30) },
  ];

  for (let i = 0; i < TASKS.length; i++) {
    const task = TASKS[i];
    await db.insert(schema.tasks).values({
      id: id(),
      organizationId: orgId,
      title: task.title,
      description: null,
      projectId: task.projectId,
      statusId: task.statusId,
      priority: task.priority,
      assigneeId: task.assigneeId,
      creatorId: USERS[0].id,
      estimateHours: task.estimateHours,
      dueDate: task.dueDate,
      position: i * 1000,
      isBlocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`✅ Created ${TASKS.length} tasks`);

  // ─── Time Entries ─────────────────────────────────────────────────────────
  const TIME_ENTRIES = [
    { userId: USERS[0].id, hours: 7.5, description: "Revue des maquettes et feedback", date: addDays(now, -1) },
    { userId: USERS[0].id, hours: 8, description: "Réunions client et planning", date: addDays(now, -2) },
    { userId: USERS[1].id, hours: 6, description: "Architecture système", date: addDays(now, -1) },
    { userId: USERS[1].id, hours: 8, description: "Code review et mentoring", date: addDays(now, -3) },
    { userId: USERS[2].id, hours: 9, description: "Design des écrans principaux", date: addDays(now, -1) },
    { userId: USERS[3].id, hours: 7, description: "Développement frontend", date: addDays(now, -1) },
    { userId: USERS[4].id, hours: 5.5, description: "Tests et QA", date: addDays(now, -2) },
  ];

  for (const entry of TIME_ENTRIES) {
    await db.insert(schema.timeEntries).values({
      id: id(),
      userId: entry.userId,
      taskId: null,
      projectId: null,
      date: entry.date,
      hours: entry.hours,
      description: entry.description,
      startTime: entry.date,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`✅ Created ${TIME_ENTRIES.length} time entries`);

  // ─── Leave Requests ───────────────────────────────────────────────────────
  const cpType = LEAVE_TYPES.find((t) => t.name === "Congés payés")!;
  const rttType = LEAVE_TYPES.find((t) => t.name === "RTT")!;

  await db.insert(schema.leaveRequests).values([
    {
      id: id(),
      userId: USERS[4].id,
      leaveTypeId: cpType.id,
      approverId: USERS[0].id,
      startDate: addDays(now, 5),
      endDate: addDays(now, 9),
      days: 5,
      reason: "Vacances d'automne",
      status: "APPROVED",
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: id(),
      userId: USERS[3].id,
      leaveTypeId: rttType.id,
      startDate: addDays(now, 2),
      endDate: addDays(now, 2),
      days: 1,
      reason: null,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    },
  ]);
  console.log(`✅ Created 2 leave requests`);

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Demo credentials:");
  console.log("   Email:    demo@teamos.app");
  console.log("   Password: demo1234");
  console.log("\n   URL:      http://localhost:3000\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
