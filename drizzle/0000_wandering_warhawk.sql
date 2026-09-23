CREATE TYPE "public"."dependency_type" AS ENUM('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('CONNECTED', 'DISCONNECTED', 'ERROR', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."integration_type" AS ENUM('GOOGLE_CALENDAR', 'GOOGLE_DRIVE', 'SLACK', 'MICROSOFT_TEAMS', 'GITHUB', 'GITLAB', 'JIRA', 'ASANA');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('INVITED', 'ACTIVE', 'INACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('TASK_ASSIGNED', 'TASK_MENTIONED', 'TASK_COMMENT', 'TASK_DUE_SOON', 'TASK_OVERDUE', 'TASK_BLOCKED', 'PROJECT_CREATED', 'PROJECT_UPDATED', 'LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'WORKLOAD_OVERLOAD', 'GENERAL');--> statement-breakpoint
CREATE TYPE "public"."perm_scope" AS ENUM('ALL', 'TEAM', 'OWN');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."status_category" AS ENUM('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_unique" UNIQUE("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"task_id" text,
	"project_id" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"old_value" json,
	"new_value" json,
	"metadata" json,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text,
	"project_id" text,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"size" integer,
	"mime_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"google_event_id" text,
	"task_id" text,
	"color" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"task_id" text,
	"project_id" text,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drive_files" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text,
	"project_id" text,
	"drive_file_id" text NOT NULL,
	"name" text NOT NULL,
	"mime_type" text,
	"web_view_link" text,
	"icon_link" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_calendar_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"calendar_id" text,
	"sync_enabled" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "google_calendar_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "google_drive_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"root_folder_id" text,
	"sync_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "google_drive_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"date" timestamp NOT NULL,
	"is_recurring" boolean DEFAULT true NOT NULL,
	"country" text
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" "integration_type" NOT NULL,
	"status" "integration_status" DEFAULT 'DISCONNECTED' NOT NULL,
	"config" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "integrations_organization_id_type_unique" UNIQUE("organization_id","type")
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"leave_type_id" text NOT NULL,
	"approver_id" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"days" real NOT NULL,
	"is_half_day" boolean DEFAULT false NOT NULL,
	"half_day_part" text,
	"status" "leave_status" DEFAULT 'PENDING' NOT NULL,
	"reason" text,
	"reject_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"icon" text,
	"allowance" real,
	"is_half_day_ok" boolean DEFAULT true NOT NULL,
	"require_approval" boolean DEFAULT true NOT NULL,
	"counts_as_work" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leave_types_organization_id_name_unique" UNIQUE("organization_id","name")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role_id" text NOT NULL,
	"status" "member_status" DEFAULT 'ACTIVE' NOT NULL,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"joined_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_user_id_organization_id_unique" UNIQUE("user_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo" text,
	"website" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"locale" text DEFAULT 'fr' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"working_days_per_week" integer DEFAULT 5 NOT NULL,
	"hours_per_day" real DEFAULT 8 NOT NULL,
	"fiscal_year_start" integer DEFAULT 1 NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"date_format" text DEFAULT 'DD/MM/YYYY' NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_members_project_id_user_id_unique" UNIQUE("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "project_teams" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"team_id" text NOT NULL,
	CONSTRAINT "project_teams_project_id_team_id_unique" UNIQUE("project_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"icon" text,
	"status" "project_status" DEFAULT 'PLANNING' NOT NULL,
	"priority" "priority" DEFAULT 'MEDIUM' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"budget" real,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"client" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"scope" "perm_scope" DEFAULT 'ALL' NOT NULL,
	CONSTRAINT "role_permissions_role_id_resource_action_unique" UNIQUE("role_id","resource","action")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_organization_id_name_unique" UNIQUE("organization_id","name")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"session_token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	CONSTRAINT "tags_organization_id_name_unique" UNIQUE("organization_id","name")
);
--> statement-breakpoint
CREATE TABLE "task_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"depends_on_id" text NOT NULL,
	"type" "dependency_type" DEFAULT 'FINISH_TO_START' NOT NULL,
	CONSTRAINT "task_dependencies_task_id_depends_on_id_unique" UNIQUE("task_id","depends_on_id")
);
--> statement-breakpoint
CREATE TABLE "task_statuses" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"icon" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"category" "status_category" DEFAULT 'TODO' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_statuses_organization_id_name_unique" UNIQUE("organization_id","name")
);
--> statement-breakpoint
CREATE TABLE "task_tags" (
	"task_id" text NOT NULL,
	"tag_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"status_id" text NOT NULL,
	"assignee_id" text,
	"creator_id" text NOT NULL,
	"parent_id" text,
	"title" text NOT NULL,
	"description" text,
	"priority" "priority" DEFAULT 'MEDIUM' NOT NULL,
	"start_date" timestamp,
	"due_date" timestamp,
	"estimate_hours" real,
	"position" integer DEFAULT 0 NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"membership_id" text NOT NULL,
	"is_lead" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_members_team_id_membership_id_unique" UNIQUE("team_id","membership_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teams_organization_id_name_unique" UNIQUE("organization_id","name")
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"task_id" text,
	"project_id" text,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"hours" real,
	"is_timer" boolean DEFAULT false NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"locale" text DEFAULT 'fr' NOT NULL,
	"bio" text,
	"position" text,
	"department" text,
	"start_date" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token"),
	CONSTRAINT "verification_tokens_identifier_token_unique" UNIQUE("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "work_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"monday_hours" real DEFAULT 8 NOT NULL,
	"tuesday_hours" real DEFAULT 8 NOT NULL,
	"wednesday_hours" real DEFAULT 8 NOT NULL,
	"thursday_hours" real DEFAULT 8 NOT NULL,
	"friday_hours" real DEFAULT 8 NOT NULL,
	"saturday_hours" real DEFAULT 0 NOT NULL,
	"sunday_hours" real DEFAULT 0 NOT NULL,
	CONSTRAINT "work_schedules_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE INDEX "accounts_user_id_index" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_organization_id_index" ON "activity_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "activity_logs_user_id_index" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_task_id_index" ON "activity_logs" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "activity_logs_project_id_index" ON "activity_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_index" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "attachments_task_id_index" ON "attachments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "attachments_project_id_index" ON "attachments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "calendar_events_organization_id_index" ON "calendar_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "calendar_events_user_id_index" ON "calendar_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calendar_events_start_time_index" ON "calendar_events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "comments_task_id_index" ON "comments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "comments_project_id_index" ON "comments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "comments_user_id_index" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "drive_files_task_id_index" ON "drive_files" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "drive_files_project_id_index" ON "drive_files" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "holidays_organization_id_index" ON "holidays" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "holidays_date_index" ON "holidays" USING btree ("date");--> statement-breakpoint
CREATE INDEX "leave_requests_user_id_index" ON "leave_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "leave_requests_leave_type_id_index" ON "leave_requests" USING btree ("leave_type_id");--> statement-breakpoint
CREATE INDEX "leave_requests_status_index" ON "leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leave_requests_start_date_index" ON "leave_requests" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "leave_types_organization_id_index" ON "leave_types" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "memberships_user_id_index" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memberships_organization_id_index" ON "memberships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "memberships_role_id_index" ON "memberships" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_index" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_organization_id_index" ON "notifications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organizations_slug_index" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "project_members_project_id_index" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_user_id_index" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_organization_id_index" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "projects_status_index" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "role_permissions_role_id_index" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "roles_organization_id_index" ON "roles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_index" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "task_statuses_organization_id_index" ON "task_statuses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tasks_organization_id_index" ON "tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tasks_project_id_index" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tasks_assignee_id_index" ON "tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "tasks_status_id_index" ON "tasks" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "tasks_due_date_index" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "tasks_priority_index" ON "tasks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "team_members_team_id_index" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_members_membership_id_index" ON "team_members" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "teams_organization_id_index" ON "teams" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "time_entries_user_id_index" ON "time_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "time_entries_task_id_index" ON "time_entries" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "time_entries_project_id_index" ON "time_entries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "time_entries_date_index" ON "time_entries" USING btree ("date");--> statement-breakpoint
CREATE INDEX "users_email_index" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "work_schedules_organization_id_index" ON "work_schedules" USING btree ("organization_id");