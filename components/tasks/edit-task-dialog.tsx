"use client";

import React, { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { TaskData, StatusData, UserData, ProjectData } from "./tasks-client";

const schema = z.object({
  title: z.string().min(1, "Le titre est requis").max(500),
  description: z.string().optional(),
  statusId: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assigneeId: z.string().optional(),
  projectId: z.string().optional(),
  dueDate: z.string().optional(),
  estimateHours: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface EditTaskDialogProps {
  open: boolean;
  task: TaskData | null;
  onClose: () => void;
  onUpdated: (task: TaskData) => void;
  statuses: StatusData[];
  users: UserData[];
  projects: ProjectData[];
  organizationId: string;
}

export function EditTaskDialog({
  open,
  task,
  onClose,
  onUpdated,
  statuses,
  users,
  projects,
  organizationId,
}: EditTaskDialogProps) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
  });

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description ?? "",
        statusId: task.statusId,
        priority: (task.priority as FormData["priority"]) ?? "MEDIUM",
        assigneeId: task.assigneeId ?? "",
        projectId: task.projectId ?? "",
        dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
        estimateHours: task.estimateHours != null ? String(task.estimateHours) : "",
      });
    }
  }, [task, reset]);

  const onSubmit = async (data: FormData) => {
    if (!task) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": organizationId,
        },
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          statusId: data.statusId,
          priority: data.priority,
          assigneeId: data.assigneeId || null,
          projectId: data.projectId || null,
          dueDate: data.dueDate || null,
          estimateHours: data.estimateHours ? parseFloat(data.estimateHours) : null,
        }),
      });

      if (!res.ok) throw new Error("Erreur lors de la mise à jour");

      const status = statuses.find((s) => s.id === data.statusId);
      const assignee = users.find((u) => u.id === data.assigneeId);

      const updated: TaskData = {
        ...task,
        title: data.title,
        description: data.description || null,
        statusId: data.statusId,
        statusName: status?.name ?? task.statusName,
        statusColor: status?.color ?? task.statusColor,
        statusCategory: status?.category ?? task.statusCategory,
        priority: data.priority,
        assigneeId: data.assigneeId || null,
        assigneeName: assignee?.name ?? null,
        assigneeImage: assignee?.image ?? null,
        projectId: data.projectId || null,
        dueDate: data.dueDate || null,
        estimateHours: data.estimateHours ? parseFloat(data.estimateHours) : null,
      };

      onUpdated(updated);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier la tâche</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <Input
              {...register("title")}
              placeholder="Titre de la tâche"
              className="text-sm font-medium"
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <textarea
              {...register("description")}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              placeholder="Description (optionnel)"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Statut</label>
              <select
                {...register("statusId")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Priorité</label>
              <select
                {...register("priority")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="LOW">Basse</option>
                <option value="MEDIUM">Moyenne</option>
                <option value="HIGH">Haute</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>

          {/* Assignee + Project */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Assigné à</label>
              <select
                {...register("assigneeId")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Non assigné</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Projet / Étiquette</label>
              <select
                {...register("projectId")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Aucun</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date + Estimate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Échéance</label>
              <Input {...register("dueDate")} type="date" className="text-sm h-9" />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Estimation (heures)</label>
              <Input
                {...register("estimateHours")}
                type="number"
                min="0.5"
                step="0.5"
                placeholder="Ex: 4"
                className="text-sm h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
