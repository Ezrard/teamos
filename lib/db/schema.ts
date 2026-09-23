import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  json,
  unique,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export const memberStatusEnum = pgEnum("member_status", [
  "INVITED",
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
]);

export const permScopeEnum = pgEnum("perm_scope", ["ALL", "TEAM", "OWN"]);

export const projectStatusEnum = pgEnum("project_status", [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
]);

export const priorityEnum = pgEnum("priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const statusCategoryEnum = pgEnum("status_category", [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
]);

export const dependencyTypeEnum = pgEnum("dependency_type", [
  "FINISH_TO_START",
  "START_TO_START",
  "FINISH_TO_FINISH",
  "START_TO_FINISH",
]);

export const leaveStatusEnum = pgEnum("leave_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "TASK_ASSIGNED",
  "TASK_MENTIONED",
  "TASK_COMMENT",
  "TASK_DUE_SOON",
  "TASK_OVERDUE",
  "TASK_BLOCKED",
  "PROJECT_CREATED",
  "PROJECT_UPDATED",
  "LEAVE_REQUESTED",
  "LEAVE_APPROVED",
  "LEAVE_REJECTED",
  "WORKLOAD_OVERLOAD",
  "GENERAL",
]);

export const integrationTypeEnum = pgEnum("integration_type", [
  "GOOGLE_CALENDAR",
  "GOOGLE_DRIVE",
  "SLACK",
  "MICROSOFT_TEAMS",
  "GITHUB",
  "GITLAB",
  "JIRA",
  "ASANA",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "CONNECTED",
  "DISCONNECTED",
  "ERROR",
  "PENDING",
]);

// ─── AUTHENTICATION ───────────────────────────────────────────────────────────

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (t) => [unique().on(t.provider, t.providerAccountId), index().on(t.userId)]
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    sessionToken: text("session_token").notNull().unique(),
    userId: text("user_id").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (t) => [index().on(t.userId)]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires").notNull(),
  },
  (t) => [unique().on(t.identifier, t.token)]
);

// ─── USERS ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email").unique(),
    emailVerified: timestamp("email_verified"),
    image: text("image"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    timezone: text("timezone").default("UTC").notNull(),
    locale: text("locale").default("fr").notNull(),
    bio: text("bio"),
    position: text("position"),
    department: text("department"),
    startDate: timestamp("start_date"),
  },
  (t) => [index().on(t.email)]
);

// ─── ORGANIZATIONS ───────────────────────────────────────────────────────────

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    logo: text("logo"),
    website: text("website"),
    timezone: text("timezone").default("UTC").notNull(),
    locale: text("locale").default("fr").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    workingDaysPerWeek: integer("working_days_per_week").default(5).notNull(),
    hoursPerDay: real("hours_per_day").default(8).notNull(),
    fiscalYearStart: integer("fiscal_year_start").default(1).notNull(),
    currency: text("currency").default("EUR").notNull(),
    dateFormat: text("date_format").default("DD/MM/YYYY").notNull(),
  },
  (t) => [index().on(t.slug)]
);

// ─── MEMBERSHIPS ─────────────────────────────────────────────────────────────

export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    organizationId: text("organization_id").notNull(),
    roleId: text("role_id").notNull(),
    status: memberStatusEnum("status").default("ACTIVE").notNull(),
    invitedAt: timestamp("invited_at").defaultNow().notNull(),
    joinedAt: timestamp("joined_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    unique().on(t.userId, t.organizationId),
    index().on(t.userId),
    index().on(t.organizationId),
    index().on(t.roleId),
  ]
);

// ─── ROLES & PERMISSIONS ─────────────────────────────────────────────────────

export const roles = pgTable(
  "roles",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color").default("#6366f1").notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    unique().on(t.organizationId, t.name),
    index().on(t.organizationId),
  ]
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: text("id").primaryKey(),
    roleId: text("role_id").notNull(),
    resource: text("resource").notNull(),
    action: text("action").notNull(),
    scope: permScopeEnum("scope").default("ALL").notNull(),
  },
  (t) => [unique().on(t.roleId, t.resource, t.action), index().on(t.roleId)]
);

// ─── TEAMS ────────────────────────────────────────────────────────────────────

export const teams = pgTable(
  "teams",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color").default("#6366f1").notNull(),
    icon: text("icon"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    unique().on(t.organizationId, t.name),
    index().on(t.organizationId),
  ]
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull(),
    membershipId: text("membership_id").notNull(),
    isLead: boolean("is_lead").default(false).notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.teamId, t.membershipId),
    index().on(t.teamId),
    index().on(t.membershipId),
  ]
);

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color").default("#6366f1").notNull(),
    icon: text("icon"),
    status: projectStatusEnum("status").default("PLANNING").notNull(),
    priority: priorityEnum("priority").default("MEDIUM").notNull(),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    budget: real("budget"),
    currency: text("currency").default("EUR").notNull(),
    client: text("client"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index().on(t.organizationId), index().on(t.status)]
);

export const projectTeams = pgTable(
  "project_teams",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    teamId: text("team_id").notNull(),
  },
  (t) => [unique().on(t.projectId, t.teamId)]
);

export const projectMembers = pgTable(
  "project_members",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").default("MEMBER").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.projectId, t.userId),
    index().on(t.projectId),
    index().on(t.userId),
  ]
);

// ─── TASK STATUSES ────────────────────────────────────────────────────────────

export const taskStatuses = pgTable(
  "task_statuses",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    color: text("color").default("#6366f1").notNull(),
    icon: text("icon"),
    position: integer("position").default(0).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    category: statusCategoryEnum("category").default("TODO").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.organizationId, t.name),
    index().on(t.organizationId),
  ]
);

// ─── TASKS ────────────────────────────────────────────────────────────────────

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id"),
    statusId: text("status_id").notNull(),
    assigneeId: text("assignee_id"),
    creatorId: text("creator_id").notNull(),
    parentId: text("parent_id"),
    title: text("title").notNull(),
    description: text("description"),
    priority: priorityEnum("priority").default("MEDIUM").notNull(),
    startDate: timestamp("start_date"),
    dueDate: timestamp("due_date"),
    estimateHours: real("estimate_hours"),
    position: integer("position").default(0).notNull(),
    isBlocked: boolean("is_blocked").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [
    index().on(t.organizationId),
    index().on(t.projectId),
    index().on(t.assigneeId),
    index().on(t.statusId),
    index().on(t.dueDate),
    index().on(t.priority),
  ]
);

export const taskDependencies = pgTable(
  "task_dependencies",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull(),
    dependsOnId: text("depends_on_id").notNull(),
    type: dependencyTypeEnum("type").default("FINISH_TO_START").notNull(),
  },
  (t) => [unique().on(t.taskId, t.dependsOnId)]
);

export const tags = pgTable(
  "tags",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    color: text("color").default("#6366f1").notNull(),
  },
  (t) => [unique().on(t.organizationId, t.name)]
);

export const taskTags = pgTable("task_tags", {
  taskId: text("task_id").notNull(),
  tagId: text("tag_id").notNull(),
});

// ─── COMMENTS & ATTACHMENTS ──────────────────────────────────────────────────

export const comments = pgTable(
  "comments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    taskId: text("task_id"),
    projectId: text("project_id"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index().on(t.taskId),
    index().on(t.projectId),
    index().on(t.userId),
  ]
);

export const attachments = pgTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id"),
    projectId: text("project_id"),
    name: text("name").notNull(),
    url: text("url").notNull(),
    size: integer("size"),
    mimeType: text("mime_type"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index().on(t.taskId), index().on(t.projectId)]
);

// ─── TIME TRACKING ────────────────────────────────────────────────────────────

export const timeEntries = pgTable(
  "time_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    taskId: text("task_id"),
    projectId: text("project_id"),
    description: text("description"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time"),
    hours: real("hours"),
    isTimer: boolean("is_timer").default(false).notNull(),
    date: timestamp("date").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index().on(t.userId),
    index().on(t.taskId),
    index().on(t.projectId),
    index().on(t.date),
  ]
);

// ─── WORK SCHEDULE ────────────────────────────────────────────────────────────

export const workSchedules = pgTable(
  "work_schedules",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().unique(),
    organizationId: text("organization_id").notNull(),
    mondayHours: real("monday_hours").default(8).notNull(),
    tuesdayHours: real("tuesday_hours").default(8).notNull(),
    wednesdayHours: real("wednesday_hours").default(8).notNull(),
    thursdayHours: real("thursday_hours").default(8).notNull(),
    fridayHours: real("friday_hours").default(8).notNull(),
    saturdayHours: real("saturday_hours").default(0).notNull(),
    sundayHours: real("sunday_hours").default(0).notNull(),
  },
  (t) => [index().on(t.organizationId)]
);

// ─── LEAVE MANAGEMENT ────────────────────────────────────────────────────────

export const leaveTypes = pgTable(
  "leave_types",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    color: text("color").default("#6366f1").notNull(),
    icon: text("icon"),
    allowance: real("allowance"),
    isHalfDayOk: boolean("is_half_day_ok").default(true).notNull(),
    requireApproval: boolean("require_approval").default(true).notNull(),
    countsAsWork: boolean("counts_as_work").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.organizationId, t.name),
    index().on(t.organizationId),
  ]
);

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    leaveTypeId: text("leave_type_id").notNull(),
    approverId: text("approver_id"),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    days: real("days").notNull(),
    isHalfDay: boolean("is_half_day").default(false).notNull(),
    halfDayPart: text("half_day_part"),
    status: leaveStatusEnum("status").default("PENDING").notNull(),
    reason: text("reason"),
    rejectReason: text("reject_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    approvedAt: timestamp("approved_at"),
  },
  (t) => [
    index().on(t.userId),
    index().on(t.leaveTypeId),
    index().on(t.status),
    index().on(t.startDate),
  ]
);

export const holidays = pgTable(
  "holidays",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    date: timestamp("date").notNull(),
    isRecurring: boolean("is_recurring").default(true).notNull(),
    country: text("country"),
  },
  (t) => [index().on(t.organizationId), index().on(t.date)]
);

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    organizationId: text("organization_id").notNull(),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index().on(t.userId), index().on(t.organizationId)]
);

// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    userId: text("user_id").notNull(),
    taskId: text("task_id"),
    projectId: text("project_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    oldValue: json("old_value"),
    newValue: json("new_value"),
    metadata: json("metadata"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index().on(t.organizationId),
    index().on(t.userId),
    index().on(t.taskId),
    index().on(t.projectId),
    index().on(t.createdAt),
  ]
);

// ─── INTEGRATIONS ─────────────────────────────────────────────────────────────

export const integrations = pgTable(
  "integrations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    type: integrationTypeEnum("type").notNull(),
    status: integrationStatusEnum("status").default("DISCONNECTED").notNull(),
    config: json("config"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [unique().on(t.organizationId, t.type)]
);

export const googleCalendarTokens = pgTable("google_calendar_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  calendarId: text("calendar_id"),
  syncEnabled: boolean("sync_enabled").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const googleDriveTokens = pgTable("google_drive_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  rootFolderId: text("root_folder_id"),
  syncEnabled: boolean("sync_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const driveFiles = pgTable(
  "drive_files",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id"),
    projectId: text("project_id"),
    driveFileId: text("drive_file_id").notNull(),
    name: text("name").notNull(),
    mimeType: text("mime_type"),
    webViewLink: text("web_view_link"),
    iconLink: text("icon_link"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index().on(t.taskId), index().on(t.projectId)]
);

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    isAllDay: boolean("is_all_day").default(false).notNull(),
    googleEventId: text("google_event_id"),
    taskId: text("task_id"),
    color: text("color"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index().on(t.organizationId),
    index().on(t.userId),
    index().on(t.startTime),
  ]
);

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  memberships: many(memberships),
  workSchedule: one(workSchedules),
  assignedTasks: many(tasks, { relationName: "taskAssignee" }),
  createdTasks: many(tasks, { relationName: "taskCreator" }),
  comments: many(comments),
  timeEntries: many(timeEntries),
  leaveRequests: many(leaveRequests, { relationName: "leaveEmployee" }),
  approvedLeaves: many(leaveRequests, { relationName: "leaveApprover" }),
  notifications: many(notifications),
  activityLogs: many(activityLogs),
  projectMembers: many(projectMembers),
}));

export const organizationsRelations = relations(
  organizations,
  ({ many }) => ({
    memberships: many(memberships),
    teams: many(teams),
    projects: many(projects),
    roles: many(roles),
    taskStatuses: many(taskStatuses),
    leaveTypes: many(leaveTypes),
    holidays: many(holidays),
    integrations: many(integrations),
    activityLogs: many(activityLogs),
    notifications: many(notifications),
  })
);

export const membershipsRelations = relations(memberships, ({ one, many }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
  role: one(roles, { fields: [memberships.roleId], references: [roles.id] }),
  teamMembers: many(teamMembers),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [roles.organizationId],
    references: [organizations.id],
  }),
  permissions: many(rolePermissions),
  memberships: many(memberships),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
  members: many(teamMembers),
  projects: many(projectTeams),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  teams: many(projectTeams),
  tasks: many(tasks),
  members: many(projectMembers),
  attachments: many(attachments),
  comments: many(comments),
  activityLogs: many(activityLogs),
  driveFiles: many(driveFiles),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  status: one(taskStatuses, {
    fields: [tasks.statusId],
    references: [taskStatuses.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: "taskAssignee",
  }),
  creator: one(users, {
    fields: [tasks.creatorId],
    references: [users.id],
    relationName: "taskCreator",
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  parent: one(tasks, {
    fields: [tasks.parentId],
    references: [tasks.id],
    relationName: "taskSubtasks",
  }),
  subtasks: many(tasks, { relationName: "taskSubtasks" }),
  tags: many(taskTags),
  attachments: many(attachments),
  comments: many(comments),
  timeEntries: many(timeEntries),
  activityLogs: many(activityLogs),
  driveFiles: many(driveFiles),
}));

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Membership = typeof memberships.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskStatus = typeof taskStatuses.$inferSelect;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type LeaveType = typeof leaveTypes.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
