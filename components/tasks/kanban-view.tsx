"use client";

import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, getInitials, getPriorityColor, isOverdue } from "@/lib/utils";
import { AlertTriangle, Calendar, Clock, GripVertical } from "lucide-react";
import type { TaskData, StatusData, UserData } from "./tasks-client";

interface KanbanViewProps {
  tasks: TaskData[];
  statuses: StatusData[];
  users: UserData[];
  onTaskUpdate: (taskId: string, updates: Partial<TaskData>) => void;
  organizationId: string;
}

function DroppableColumn({
  status,
  children,
  count,
}: {
  status: StatusData;
  children: React.ReactNode;
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <span className="text-xs font-semibold text-foreground">{status.name}</span>
        <span className="text-xs text-muted-foreground ml-auto bg-muted rounded-full px-1.5 py-0.5">
          {count}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 min-h-[200px] rounded-lg p-2 transition-colors",
          isOver ? "bg-primary/5 ring-2 ring-primary/20" : "bg-muted/30"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function DraggableTaskCard({
  task,
  isDragging,
}: {
  task: TaskData;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-50")}
    >
      <TaskCard task={task} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  );
}

function TaskCard({
  task,
  dragListeners,
  dragAttributes,
  isOverlay,
}: {
  task: TaskData;
  dragListeners?: ReturnType<typeof useDraggable>["listeners"];
  dragAttributes?: ReturnType<typeof useDraggable>["attributes"];
  isOverlay?: boolean;
}) {
  const overdue = task.dueDate ? isOverdue(task.dueDate) && task.statusCategory !== "DONE" : false;

  return (
    <div
      className={cn(
        "bg-background rounded-lg border p-3 group cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all",
        isOverlay && "shadow-xl rotate-1 ring-2 ring-primary/20",
        task.isBlocked && "border-red-200"
      )}
    >
      {/* Drag handle + priority */}
      <div className="flex items-start gap-1.5 mb-2">
        <div
          {...dragListeners}
          {...dragAttributes}
          className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-3 w-3" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium leading-snug line-clamp-2">{task.title}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-2.5">
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded font-medium",
          getPriorityColor(task.priority)
        )}>
          {task.priority === "URGENT" ? "Urgent" :
           task.priority === "HIGH" ? "Haute" :
           task.priority === "MEDIUM" ? "Moyenne" : "Basse"}
        </span>

        {task.isBlocked && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium flex items-center gap-0.5">
            <AlertTriangle className="h-2.5 w-2.5" />
            Bloqué
          </span>
        )}

        {task.projectId && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
            Projet
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {task.dueDate && (
            <span className={cn(
              "flex items-center gap-0.5",
              overdue && "text-red-500 font-medium"
            )}>
              <Calendar className="h-2.5 w-2.5" />
              {new Date(task.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </span>
          )}
          {task.estimateHours && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {task.estimateHours}h
            </span>
          )}
        </div>

        {task.assigneeId && (
          <Avatar className="h-5 w-5">
            <AvatarImage src={task.assigneeImage ?? undefined} />
            <AvatarFallback className="text-[8px]">
              {getInitials(task.assigneeName ?? "?")}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}

export function KanbanView({
  tasks,
  statuses,
  users,
  onTaskUpdate,
  organizationId,
}: KanbanViewProps) {
  const [activeTask, setActiveTask] = useState<TaskData | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
      setDraggingId(task.id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setDraggingId(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatusId = over.id as string;
    const task = tasks.find((t) => t.id === taskId);
    const newStatus = statuses.find((s) => s.id === newStatusId);

    if (!task || !newStatus || task.statusId === newStatusId) return;

    onTaskUpdate(taskId, {
      statusId: newStatusId,
      statusName: newStatus.name,
      statusColor: newStatus.color,
      statusCategory: newStatus.category,
    });
  };

  const tasksByStatus = statuses.reduce<Record<string, TaskData[]>>((acc, status) => {
    acc[status.id] = tasks.filter((t) => t.statusId === status.id)
      .sort((a, b) => a.position - b.position);
    return acc;
  }, {});

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto p-4">
        {statuses.map((status) => (
          <DroppableColumn
            key={status.id}
            status={status}
            count={tasksByStatus[status.id]?.length ?? 0}
          >
            {tasksByStatus[status.id]?.map((task) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                isDragging={draggingId === task.id}
              />
            ))}
          </DroppableColumn>
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <TaskCard task={activeTask} isOverlay />
        )}
      </DragOverlay>
    </DndContext>
  );
}
