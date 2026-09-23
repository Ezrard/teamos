"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  FolderKanban,
  TrendingUp,
  ArrowRight,
  Ban,
  Timer,
  CalendarClock,
  Umbrella,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDate, getDueDateLabel, getInitials, getPriorityBg } from "@/lib/utils";

interface DashboardClientProps {
  stats: {
    totalMembers: number;
    activeProjects: number;
    atRisk: number;
    weeklyTasks: number;
    overdueTasks: number;
    blockedTasks: number;
    absentToday: number;
    myTasks: number;
    myOverdue: number;
    weeklyLogged: number;
    capacityUsed: number;
  };
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    priority: string;
    statusName: string;
    statusColor: string;
    projectId: string | null;
  }>;
  absentUsers: Array<{
    id: string;
    name: string;
    image: string | null;
  }>;
  recentProjects: Array<{
    id: string;
    name: string;
    color: string;
    status: string;
    isAtRisk: boolean;
  }>;
  organizationId: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  href,
  sublabel,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  variant?: "default" | "warning" | "danger" | "success";
  href?: string;
  sublabel?: string;
}) {
  const colors = {
    default: "text-primary",
    warning: "text-amber-500",
    danger: "text-red-500",
    success: "text-emerald-500",
  };

  const content = (
    <Card className={cn("transition-all hover:shadow-md", href && "cursor-pointer hover:border-primary/30")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {label}
            </p>
            <p className={cn("text-2xl font-bold", colors[variant])}>{value}</p>
            {sublabel && (
              <p className="text-xs text-muted-foreground">{sublabel}</p>
            )}
          </div>
          <div className={cn("p-2 rounded-lg bg-muted", colors[variant])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

export function DashboardClient({
  stats,
  upcomingDeadlines,
  absentUsers,
  recentProjects,
  organizationId,
}: DashboardClientProps) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Alerts */}
      {(stats.overdueTasks > 0 || stats.blockedTasks > 0 || stats.absentToday > 0) && (
        <div className="flex flex-wrap gap-2">
          {stats.overdueTasks > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200">
              <AlertTriangle className="h-3 w-3" />
              {stats.overdueTasks} tâche{stats.overdueTasks > 1 ? "s" : ""} en retard
            </div>
          )}
          {stats.blockedTasks > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
              <Ban className="h-3 w-3" />
              {stats.blockedTasks} tâche{stats.blockedTasks > 1 ? "s" : ""} bloquée{stats.blockedTasks > 1 ? "s" : ""}
            </div>
          )}
          {stats.absentToday > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
              <Umbrella className="h-3 w-3" />
              {stats.absentToday} personne{stats.absentToday > 1 ? "s" : ""} absente{stats.absentToday > 1 ? "s" : ""} aujourd'hui
            </div>
          )}
        </div>
      )}

      {/* Main stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Collaborateurs"
          value={stats.totalMembers}
          icon={Users}
          href="/teams"
          sublabel={`${stats.absentToday} absent${stats.absentToday > 1 ? "s" : ""} aujourd'hui`}
        />
        <StatCard
          label="Projets actifs"
          value={stats.activeProjects}
          icon={FolderKanban}
          href="/projects"
          variant={stats.atRisk > 0 ? "warning" : "default"}
          sublabel={stats.atRisk > 0 ? `${stats.atRisk} en risque` : "Tous à temps"}
        />
        <StatCard
          label="Tâches actives"
          value={stats.weeklyTasks}
          icon={CheckCircle2}
          href="/tasks"
          variant={stats.overdueTasks > 0 ? "danger" : "default"}
          sublabel={`${stats.overdueTasks} en retard`}
        />
        <StatCard
          label="Capacité utilisée"
          value={`${stats.capacityUsed}%`}
          icon={TrendingUp}
          href="/planning/workload"
          variant={stats.capacityUsed > 90 ? "danger" : stats.capacityUsed > 75 ? "warning" : "success"}
          sublabel={`${stats.weeklyLogged.toFixed(1)}h enregistrées cette semaine`}
        />
      </div>

      {/* My tasks quick view + capacity bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* My tasks */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Mes tâches</CardTitle>
              <Link href="/my-work/tasks">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  Voir tout <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xl font-bold">{stats.myTasks}</p>
                <p className="text-xs text-muted-foreground mt-0.5">En cours</p>
              </div>
              <div className={cn(
                "rounded-lg p-3 text-center",
                stats.myOverdue > 0 ? "bg-red-50" : "bg-emerald-50"
              )}>
                <p className={cn(
                  "text-xl font-bold",
                  stats.myOverdue > 0 ? "text-red-600" : "text-emerald-600"
                )}>
                  {stats.myOverdue}
                </p>
                <p className={cn(
                  "text-xs mt-0.5",
                  stats.myOverdue > 0 ? "text-red-600" : "text-emerald-600"
                )}>
                  En retard
                </p>
              </div>
            </div>
            <Link href="/my-work/tasks">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Ouvrir mes tâches
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Upcoming deadlines */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Échéances à venir</CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  Voir tout <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CalendarClock className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Aucune échéance à venir</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {upcomingDeadlines.slice(0, 6).map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors group"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: task.statusColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        className={cn("text-[10px] px-1.5 py-0", getPriorityBg(task.priority))}
                        variant="outline"
                      >
                        {task.priority}
                      </Badge>
                      <span className={cn(
                        "text-xs whitespace-nowrap",
                        task.dueDate && new Date(task.dueDate) < new Date()
                          ? "text-red-500 font-medium"
                          : "text-muted-foreground"
                      )}>
                        {task.dueDate ? getDueDateLabel(task.dueDate) : "—"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects + Absent users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Projects status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Projets récents</CardTitle>
              <Link href="/projects">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  Voir tout <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FolderKanban className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Aucun projet actif</p>
                <Link href="/projects">
                  <Button size="sm" className="mt-3 text-xs">Créer un projet</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors group"
                  >
                    <div
                      className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: project.color }}
                    >
                      {project.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </p>
                    </div>
                    <div>
                      {project.isAtRisk ? (
                        <Badge variant="warning" className="text-[10px]">
                          À risque
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">
                          En cours
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Absent today */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Absents aujourd'hui</CardTitle>
              <Link href="/leave">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  Calendrier <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {absentUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Tout le monde est présent 🎉</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {absentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.image ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{user.name.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
