"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Grid3X3, List, FolderKanban, MoreHorizontal, Calendar, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import { CreateProjectDialog } from "./create-project-dialog";

interface ProjectWithStats {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  priority: string;
  startDate: Date | null;
  endDate: Date | null;
  client: string | null;
  taskCount: number;
  doneCount: number;
  overdueCount: number;
  progress: number;
}

const STATUS_CONFIG = {
  PLANNING: { label: "Planification", color: "bg-gray-100 text-gray-700" },
  ACTIVE: { label: "Actif", color: "bg-emerald-100 text-emerald-700" },
  ON_HOLD: { label: "En pause", color: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Terminé", color: "bg-blue-100 text-blue-700" },
  ARCHIVED: { label: "Archivé", color: "bg-gray-100 text-gray-500" },
};

export function ProjectsClient({
  projects,
  organizationId,
  userId,
}: {
  projects: ProjectWithStats[];
  organizationId: string;
  userId: string;
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Rechercher un projet..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-52 text-sm"
        />
        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
          {(["all", "ACTIVE", "PLANNING", "ON_HOLD", "COMPLETED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "px-2.5 py-1 text-xs rounded transition-all",
                filterStatus === status
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {status === "all" ? "Tous" : STATUS_CONFIG[status]?.label ?? status}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
          <button
            onClick={() => setView("grid")}
            className={cn(
              "p-1.5 rounded transition-all",
              view === "grid" ? "bg-background shadow-sm" : "text-muted-foreground"
            )}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "p-1.5 rounded transition-all",
              view === "list" ? "bg-background shadow-sm" : "text-muted-foreground"
            )}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nouveau projet
        </Button>
      </div>

      {/* Projects */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FolderKanban className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm font-medium">Aucun projet trouvé</p>
          <p className="text-xs mt-1">Créez votre premier projet pour commencer</p>
          <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Créer un projet
          </Button>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        organizationId={organizationId}
        userId={userId}
      />
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectWithStats }) {
  const statusConfig = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG];

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="hover:shadow-md transition-all hover:border-primary/20 group cursor-pointer">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: project.color }}
            >
              {project.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                {project.name}
              </h3>
              {project.client && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {project.client}
                </p>
              )}
            </div>
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
              statusConfig?.color ?? "bg-gray-100 text-gray-700"
            )}>
              {statusConfig?.label ?? project.status}
            </span>
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
              {project.description}
            </p>
          )}

          {/* Progress */}
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {project.doneCount}/{project.taskCount} tâches
              </span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${project.progress}%`,
                  backgroundColor: project.color,
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              {project.endDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(project.endDate)}
                </span>
              )}
            </div>
            {project.overdueCount > 0 && (
              <span className="flex items-center gap-1 text-red-500 font-medium">
                <AlertTriangle className="h-3 w-3" />
                {project.overdueCount} en retard
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ProjectRow({ project }: { project: ProjectWithStats }) {
  const statusConfig = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG];

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors group border border-transparent hover:border-border">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs shrink-0"
          style={{ backgroundColor: project.color }}
        >
          {project.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
            {project.name}
          </p>
          {project.client && (
            <p className="text-xs text-muted-foreground">{project.client}</p>
          )}
        </div>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
          statusConfig?.color ?? "bg-gray-100 text-gray-700"
        )}>
          {statusConfig?.label ?? project.status}
        </span>
        <div className="hidden md:flex items-center gap-2 w-32">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${project.progress}%`, backgroundColor: project.color }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-8 text-right">
            {project.progress}%
          </span>
        </div>
        <div className="text-xs text-muted-foreground w-20 text-right hidden lg:block">
          {project.taskCount} tâche{project.taskCount > 1 ? "s" : ""}
        </div>
        {project.endDate && (
          <div className="text-xs text-muted-foreground w-20 text-right hidden lg:block">
            {formatDate(project.endDate)}
          </div>
        )}
        {project.overdueCount > 0 && (
          <Badge variant="destructive" className="text-[10px] hidden md:flex">
            {project.overdueCount} retard
          </Badge>
        )}
      </div>
    </Link>
  );
}
