"use client";

import React, { useState, useCallback } from "react";
import { Plus, Kanban, List, Calendar, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { KanbanView } from "./kanban-view";
import { ListView } from "./list-view";
import { CreateTaskDialog } from "./create-task-dialog";
import { EditTaskDialog } from "./edit-task-dialog";

export interface TaskData {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  statusId: string;
  statusName: string;
  statusColor: string;
  statusCategory: string;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeImage: string | null;
  dueDate: string | null;
  startDate: string | null;
  estimateHours: number | null;
  projectId: string | null;
  isBlocked: boolean;
  position: number;
  createdAt: string;
}

export interface StatusData {
  id: string;
  name: string;
  color: string;
  category: string;
  position: number;
}

export interface UserData {
  id: string;
  name: string;
  image: string | null;
}

export interface ProjectData {
  id: string;
  name: string;
  color: string;
}

interface TasksClientProps {
  tasks: TaskData[];
  statuses: StatusData[];
  users: UserData[];
  projects: ProjectData[];
  organizationId: string;
  currentUserId: string;
  projectId?: string;
}

type ViewType = "kanban" | "list" | "calendar" | "timeline";

export function TasksClient({
  tasks: initialTasks,
  statuses,
  users,
  projects,
  organizationId,
  currentUserId,
  projectId,
}: TasksClientProps) {
  const [view, setView] = useState<ViewType>("kanban");
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskData | null>(null);

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesAssignee = filterAssignee === "all" || t.assigneeId === filterAssignee || (filterAssignee === "me" && t.assigneeId === currentUserId);
    const matchesPriority = filterPriority === "all" || t.priority === filterPriority;
    return matchesSearch && matchesAssignee && matchesPriority;
  });

  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<TaskData>) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": organizationId,
        },
        body: JSON.stringify({
          statusId: updates.statusId,
          assigneeId: updates.assigneeId,
          priority: updates.priority,
          dueDate: updates.dueDate,
          position: updates.position,
        }),
      });
    } catch (error) {
      // Revert on error
      setTasks(initialTasks);
    }
  }, [organizationId, initialTasks]);

  const handleTaskCreated = (task: TaskData) => {
    setTasks((prev) => [task, ...prev]);
    setCreateOpen(false);
  };

  const handleTaskUpdated = (task: TaskData) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    setEditTask(null);
  };

  const views: { id: ViewType; label: string; icon: React.ElementType }[] = [
    { id: "kanban", label: "Kanban", icon: Kanban },
    { id: "list", label: "Liste", icon: List },
    { id: "calendar", label: "Calendrier", icon: Calendar },
  ];

  const defaultStatusId = statuses.find((s) => s.category === "TODO")?.id ?? statuses[0]?.id;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b bg-background flex-wrap shrink-0">
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-44 text-xs"
        />

        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="all">Tous les membres</option>
          <option value="me">Mes tâches</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="all">Toutes priorités</option>
          <option value="URGENT">Urgente</option>
          <option value="HIGH">Haute</option>
          <option value="MEDIUM">Moyenne</option>
          <option value="LOW">Basse</option>
        </select>

        <div className="flex-1" />

        {/* View switcher */}
        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all",
                view === v.id
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <v.icon className="h-3 w-3" />
              {v.label}
            </button>
          ))}
        </div>

        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Tâche
        </Button>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-hidden">
        {view === "kanban" && (
          <KanbanView
            tasks={filteredTasks}
            statuses={statuses}
            users={users}
            projects={projects}
            onTaskUpdate={handleTaskUpdate}
            onTaskEdit={setEditTask}
            organizationId={organizationId}
          />
        )}
        {view === "list" && (
          <ListView
            tasks={filteredTasks}
            statuses={statuses}
            users={users}
            projects={projects}
            onTaskUpdate={handleTaskUpdate}
            onTaskEdit={setEditTask}
            organizationId={organizationId}
          />
        )}
        {view === "calendar" && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Vue calendrier à venir</p>
          </div>
        )}
      </div>

      <CreateTaskDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleTaskCreated}
        statuses={statuses}
        users={users}
        projects={projects}
        organizationId={organizationId}
        currentUserId={currentUserId}
        defaultStatusId={defaultStatusId ?? ""}
        defaultProjectId={projectId}
      />

      <EditTaskDialog
        open={!!editTask}
        task={editTask}
        onClose={() => setEditTask(null)}
        onUpdated={handleTaskUpdated}
        statuses={statuses}
        users={users}
        projects={projects}
        organizationId={organizationId}
      />
    </div>
  );
}
