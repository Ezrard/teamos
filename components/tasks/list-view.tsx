"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials, getPriorityColor, isOverdue } from "@/lib/utils";
import { AlertTriangle, Calendar, ChevronDown, ChevronUp, Clock, Pencil } from "lucide-react";
import type { TaskData, StatusData, UserData, ProjectData } from "./tasks-client";

interface ListViewProps {
  tasks: TaskData[];
  statuses: StatusData[];
  users: UserData[];
  projects: ProjectData[];
  onTaskUpdate: (taskId: string, updates: Partial<TaskData>) => void;
  onTaskEdit: (task: TaskData) => void;
  organizationId: string;
}

type SortKey = "title" | "priority" | "status" | "assignee" | "dueDate" | "createdAt";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3,
};

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: "Urgent", HIGH: "Haute", MEDIUM: "Moyenne", LOW: "Basse",
};

export function ListView({
  tasks,
  statuses,
  users,
  projects,
  onTaskUpdate,
  onTaskEdit,
  organizationId,
}: ListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "priority":
        cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
        break;
      case "status":
        cmp = a.statusName.localeCompare(b.statusName);
        break;
      case "assignee":
        cmp = (a.assigneeName ?? "").localeCompare(b.assigneeName ?? "");
        break;
      case "dueDate":
        cmp = (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
        break;
      case "createdAt":
        cmp = a.createdAt.localeCompare(b.createdAt);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      {sortKey === field ? (
        sortDir === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      ) : null}
    </button>
  );

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-background border-b z-10">
          <tr>
            <th className="text-left px-4 py-2.5 w-full">
              <SortHeader label="Tâche" field="title" />
            </th>
            <th className="text-left px-3 py-2.5 whitespace-nowrap">
              <SortHeader label="Statut" field="status" />
            </th>
            <th className="text-left px-3 py-2.5 whitespace-nowrap">
              <SortHeader label="Priorité" field="priority" />
            </th>
            <th className="text-left px-3 py-2.5 whitespace-nowrap">
              <SortHeader label="Assigné" field="assignee" />
            </th>
            <th className="text-left px-3 py-2.5 whitespace-nowrap">
              <SortHeader label="Échéance" field="dueDate" />
            </th>
            <th className="text-left px-3 py-2.5 whitespace-nowrap">
              <span className="text-xs font-medium text-muted-foreground">Estimé</span>
            </th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                Aucune tâche trouvée
              </td>
            </tr>
          ) : (
            sorted.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                statuses={statuses}
                users={users}
                projects={projects}
                onTaskUpdate={onTaskUpdate}
                onTaskEdit={onTaskEdit}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TaskRow({
  task,
  statuses,
  users,
  projects,
  onTaskUpdate,
  onTaskEdit,
}: {
  task: TaskData;
  statuses: StatusData[];
  users: UserData[];
  projects: ProjectData[];
  onTaskUpdate: (taskId: string, updates: Partial<TaskData>) => void;
  onTaskEdit: (task: TaskData) => void;
}) {
  const overdue = task.dueDate ? isOverdue(task.dueDate) && task.statusCategory !== "DONE" : false;
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;

  return (
    <tr className="hover:bg-muted/30 transition-colors group">
      {/* Title */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          {task.isBlocked && (
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          )}
          <span className="text-sm font-medium line-clamp-1">{task.title}</span>
          {project && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
              style={{
                backgroundColor: project.color + "20",
                color: project.color,
              }}
            >
              {project.name}
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {task.description}
          </p>
        )}
      </td>

      {/* Status */}
      <td className="px-3 py-2.5">
        <select
          value={task.statusId}
          onChange={(e) => {
            const newStatus = statuses.find((s) => s.id === e.target.value);
            if (newStatus) {
              onTaskUpdate(task.id, {
                statusId: newStatus.id,
                statusName: newStatus.name,
                statusColor: newStatus.color,
                statusCategory: newStatus.category,
              });
            }
          }}
          className="text-[11px] rounded px-2 py-0.5 border-0 bg-transparent cursor-pointer hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
          style={{ color: task.statusColor }}
        >
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </td>

      {/* Priority */}
      <td className="px-3 py-2.5">
        <select
          value={task.priority}
          onChange={(e) => onTaskUpdate(task.id, { priority: e.target.value })}
          className={cn(
            "text-[11px] rounded px-2 py-0.5 border-0 bg-transparent cursor-pointer hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium",
            getPriorityColor(task.priority)
          )}
        >
          <option value="URGENT">Urgent</option>
          <option value="HIGH">Haute</option>
          <option value="MEDIUM">Moyenne</option>
          <option value="LOW">Basse</option>
        </select>
      </td>

      {/* Assignee */}
      <td className="px-3 py-2.5">
        <select
          value={task.assigneeId ?? ""}
          onChange={(e) => onTaskUpdate(task.id, { assigneeId: e.target.value || null })}
          className="text-[11px] rounded px-2 py-0.5 border-0 bg-transparent cursor-pointer hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Non assigné</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </td>

      {/* Due date */}
      <td className="px-3 py-2.5">
        <div className={cn(
          "flex items-center gap-1 text-xs",
          overdue ? "text-red-500 font-medium" : "text-muted-foreground"
        )}>
          {task.dueDate ? (
            <>
              <Calendar className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
            </>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          )}
        </div>
      </td>

      {/* Estimate */}
      <td className="px-3 py-2.5">
        {task.estimateHours ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {task.estimateHours}h
          </div>
        ) : (
          <span className="text-muted-foreground/40 text-xs">—</span>
        )}
      </td>

      {/* Edit button */}
      <td className="px-2 py-2.5">
        <button
          onClick={() => onTaskEdit(task)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}
