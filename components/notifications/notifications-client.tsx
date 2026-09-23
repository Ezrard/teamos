"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { Bell, BellOff, CheckCheck, ExternalLink } from "lucide-react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsClientProps {
  notifications: NotificationItem[];
  organizationId: string;
}

const TYPE_COLORS: Record<string, string> = {
  TASK_ASSIGNED: "bg-blue-100 text-blue-700",
  TASK_MENTIONED: "bg-purple-100 text-purple-700",
  TASK_COMMENT: "bg-indigo-100 text-indigo-700",
  TASK_DUE_SOON: "bg-amber-100 text-amber-700",
  TASK_OVERDUE: "bg-red-100 text-red-700",
  TASK_BLOCKED: "bg-red-100 text-red-700",
  PROJECT_CREATED: "bg-green-100 text-green-700",
  PROJECT_UPDATED: "bg-green-100 text-green-700",
  LEAVE_REQUESTED: "bg-cyan-100 text-cyan-700",
  LEAVE_APPROVED: "bg-emerald-100 text-emerald-700",
  LEAVE_REJECTED: "bg-red-100 text-red-700",
  WORKLOAD_OVERLOAD: "bg-orange-100 text-orange-700",
  GENERAL: "bg-gray-100 text-gray-700",
};

const TYPE_LABELS: Record<string, string> = {
  TASK_ASSIGNED: "Tâche assignée",
  TASK_MENTIONED: "Mention",
  TASK_COMMENT: "Commentaire",
  TASK_DUE_SOON: "Échéance proche",
  TASK_OVERDUE: "En retard",
  TASK_BLOCKED: "Bloqué",
  PROJECT_CREATED: "Nouveau projet",
  PROJECT_UPDATED: "Projet modifié",
  LEAVE_REQUESTED: "Congé demandé",
  LEAVE_APPROVED: "Congé approuvé",
  LEAVE_REJECTED: "Congé refusé",
  WORKLOAD_OVERLOAD: "Surcharge",
  GENERAL: "Notification",
};

export function NotificationsClient({ notifications: initial, organizationId }: NotificationsClientProps) {
  const [items, setItems] = useState(initial);
  const [marking, setMarking] = useState(false);

  const unreadCount = items.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    setMarking(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "x-organization-id": organizationId },
      });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } finally {
      setMarking(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <BellOff className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Aucune notification</p>
        <p className="text-xs text-muted-foreground mt-1">Vous êtes à jour !</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {items.length} notification{items.length > 1 ? "s" : ""}
          </span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
              {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={marking}
            className="text-xs h-7"
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {/* Notifications list */}
      <div className="space-y-1">
        {items.map((n) => (
          <div
            key={n.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border transition-colors",
              n.isRead ? "bg-background" : "bg-muted/30 border-primary/20"
            )}
          >
            {/* Unread dot */}
            <div className="mt-1.5 shrink-0">
              {!n.isRead ? (
                <div className="w-2 h-2 rounded-full bg-primary" />
              ) : (
                <div className="w-2 h-2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                  TYPE_COLORS[n.type] ?? "bg-gray-100 text-gray-700"
                )}>
                  {TYPE_LABELS[n.type] ?? n.type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(new Date(n.createdAt))}
                </span>
              </div>
              <p className="text-sm font-medium mt-0.5">{n.title}</p>
              {n.body && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
              )}
            </div>

            {/* Link */}
            {n.link && (
              <Link
                href={n.link}
                className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
