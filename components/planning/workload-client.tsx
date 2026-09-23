"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, getInitials } from "@/lib/utils";
import { AlertTriangle, Clock, CheckCircle2, TrendingUp } from "lucide-react";

interface MemberWorkload {
  userId: string;
  name: string;
  image: string | null;
  capacity: number;
  scheduledHours: number;
  loggedHours: number;
  utilization: number;
  available: number;
  overload: boolean;
  taskCount: number;
  leaveHours: number;
}

interface WorkloadClientProps {
  members: MemberWorkload[];
  weekStart: string;
  weekEnd: string;
}

function UtilizationBar({ value, overload }: { value: number; overload: boolean }) {
  const width = Math.min(value, 100);
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          overload ? "bg-red-500" :
          value >= 80 ? "bg-amber-500" :
          value >= 50 ? "bg-emerald-500" : "bg-blue-400"
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function WorkloadClient({ members, weekStart, weekEnd }: WorkloadClientProps) {
  const sorted = [...members].sort((a, b) => b.utilization - a.utilization);

  const weekLabel = new Date(weekStart).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) +
    " – " +
    new Date(weekEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const overloaded = members.filter((m) => m.overload).length;
  const available = members.filter((m) => m.utilization < 50).length;
  const optimal = members.filter((m) => m.utilization >= 50 && !m.overload).length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        <span>Semaine du {weekLabel}</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">Surchargés</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{overloaded}</p>
          <p className="text-xs text-muted-foreground mt-1">membre{overloaded !== 1 ? "s" : ""} en surcharge</p>
        </div>

        <div className="border rounded-lg p-4 bg-emerald-50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">Disponibles</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{available}</p>
          <p className="text-xs text-muted-foreground mt-1">membre{available !== 1 ? "s" : ""} sous 50%</p>
        </div>

        <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Optimal</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{optimal}</p>
          <p className="text-xs text-muted-foreground mt-1">membre{optimal !== 1 ? "s" : ""} en charge idéale</p>
        </div>
      </div>

      {/* Member workload list */}
      <div className="space-y-3">
        {sorted.map((member) => (
          <div
            key={member.userId}
            className={cn(
              "border rounded-lg p-4 transition-colors",
              member.overload ? "border-red-200 bg-red-50/50 dark:bg-red-950/10" : "hover:bg-muted/20"
            )}
          >
            <div className="flex items-center gap-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-2.5 w-48 shrink-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  {member.leaveHours > 0 && (
                    <p className="text-[10px] text-amber-600">
                      {member.leaveHours}h en congés
                    </p>
                  )}
                </div>
              </div>

              {/* Bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">
                    {member.scheduledHours}h planifiées / {member.capacity}h capacité
                  </span>
                  <div className="flex items-center gap-2">
                    {member.overload && (
                      <span className="text-[10px] font-medium text-red-600 flex items-center gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Surcharge
                      </span>
                    )}
                    <span className={cn(
                      "text-xs font-semibold",
                      member.overload ? "text-red-600" :
                      member.utilization >= 80 ? "text-amber-600" : "text-foreground"
                    )}>
                      {member.utilization}%
                    </span>
                  </div>
                </div>
                <UtilizationBar value={member.utilization} overload={member.overload} />
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                <div className="text-center w-14">
                  <p className="font-semibold text-foreground">{member.taskCount}</p>
                  <p>tâches</p>
                </div>
                <div className="text-center w-16">
                  <p className="font-semibold text-foreground">{member.loggedHours.toFixed(1)}h</p>
                  <p>loggées</p>
                </div>
                <div className="text-center w-16">
                  <p className={cn(
                    "font-semibold",
                    member.available > 0 ? "text-emerald-600" : "text-muted-foreground"
                  )}>
                    {member.available.toFixed(1)}h
                  </p>
                  <p>dispo.</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {sorted.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Aucun membre dans l'équipe</p>
          </div>
        )}
      </div>
    </div>
  );
}
