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
  CalendarClock,
  Umbrella,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getDueDateLabel, getInitials, getPriorityBg } from "@/lib/utils";

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
  accentColor,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  variant?: "default" | "warning" | "danger" | "success";
  href?: string;
  sublabel?: string;
  accentColor?: string;
}) {
  const variantStyles = {
    default: { text: "text-primary", bg: "bg-primary/8" },
    warning: { text: "text-amber-600", bg: "bg-amber-50" },
    danger: { text: "text-red-600", bg: "bg-red-50" },
    success: { text: "text-emerald-600", bg: "bg-emerald-50" },
  };

  const s = variantStyles[variant];

  const content = (
    <Card className={cn(
      "bg-card border border-border transition-all duration-150",
      href && "hover:border-primary/30 hover:shadow-md cursor-pointer"
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {label}
            </p>
            <p className={cn("text-2xl font-bold tracking-tight", s.text)}>
              {value}
            </p>
            {sublabel && (
              <p className="text-[12px] text-muted-foreground">{sublabel}</p>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl shrink-0", s.bg)}>
            <Icon className={cn("h-4 w-4", s.text)} />
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
      {/* Alert banners */}
      {(stats.overdueTasks > 0 || stats.blockedTasks > 0 || stats.absentToday > 0) && (
        <div className="flex flex-wrap gap-2">
          {stats.overdueTasks > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-100">
              <AlertTriangle className="h-3 w-3" />
              {stats.overdueTasks} tâche{stats.overdueTasks > 1 ? "s" : ""} en retard
            </div>
          )}
          {stats.blockedTasks > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
              <Ban className="h-3 w-3" />
              {stats.blockedTasks} tâche{stats.blockedTasks > 1 ? "s" : ""} bloquée{stats.blockedTasks > 1 ? "s" : ""}
            </div>
          )}
          {stats.absentToday > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
              <Umbrella className="h-3 w-3" />
              {stats.absentToday} personne{stats.absentToday > 1 ? "s" : ""} absente{stats.absentToday > 1 ? "s" : ""} aujourd'hui
            </div>
          )}
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Collaborateurs"
          value={stats.totalMembers}
          icon={Users}
          href="/teams"
          sublabel={stats.absentToday > 0 ? `${stats.absentToday} absent${stats.absentToday > 1 ? "s" : ""} aujourd'hui` : "Tous présents"}
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
          sublabel={`${stats.weeklyLogged.toFixed(1)}h enregistrées`}
        />
      </div>

      {/* My tasks + Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* My tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[13px] font-semibold">Mes tâches</CardTitle>
              <Link href="/my-work/tasks">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  Voir tout <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/60 p-3 text-center border border-border/50">
                <p className="text-xl font-bold text-foreground">{stats.myTasks}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">En cours</p>
              </div>
              <div className={cn(
                "rounded-lg p-3 text-center border",
                stats.myOverdue > 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"
              )}>
                <p className={cn(
                  "text-xl font-bold",
                  stats.myOverdue > 0 ? "text-red-600" : "text-emerald-600"
                )}>
                  {stats.myOverdue}
                </p>
                <p className={cn(
                  "text-[11px] mt-0.5 font-medium",
                  stats.myOverdue > 0 ? "text-red-500" : "text-emerald-500"
                )}>
                  En retard
                </p>
              </div>
            </div>
            <Link href="/my-work/tasks">
              <Button variant="outline" size="sm" className="w-full text-[12px] h-8">
                Ouvrir mes tâches
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Upcoming deadlines */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[13px] font-semibold">Échéances à venir</CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  Voir tout <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CalendarClock className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Aucune échéance à venir</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {upcomingDeadlines.slice(0, 6).map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors group"
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: task.statusColor }}
                    />
                    <p className="flex-1 text-[13px] truncate group-hover:text-primary transition-colors">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        className={cn("text-[10px] px-1.5 py-0 h-4", getPriorityBg(task.priority))}
                        variant="outline"
                      >
                        {task.priority}
                      </Badge>
                      <span className={cn(
                        "text-[11px] whitespace-nowrap font-medium",
                        task.dueDate && new Date(task.dueDate) < new Date()
                          ? "text-red-500"
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

      {/* Projects + Absences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent projects */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[13px] font-semibold">Projets récents</CardTitle>
              <Link href="/projects">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  Voir tout <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FolderKanban className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Aucun projet actif</p>
                <Link href="/projects">
                  <Button size="sm" className="mt-3 text-xs h-7">Créer un projet</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: project.color }}
                    >
                      {project.name[0].toUpperCase()}
                    </div>
                    <p className="flex-1 text-[13px] font-medium truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </p>
                    {project.isAtRisk ? (
                      <Badge variant="warning" className="text-[10px] h-5">À risque</Badge>
                    ) : (
                      <Badge variant="success" className="text-[10px] h-5">En cours</Badge>
                    )}
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
              <CardTitle className="text-[13px] font-semibold">Absents aujourd'hui</CardTitle>
              <Link href="/leave">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  Calendrier <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {absentUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Tout le monde est présent 🎉</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {absentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border/50"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.image ?? undefined} />
                      <AvatarFallback className="text-[9px] font-semibold bg-primary/10 text-primary">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[12px] font-medium">{user.name.split(" ")[0]}</span>
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
