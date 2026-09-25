"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Calendar,
  Clock,
  Umbrella,
  BarChart3,
  Settings,
  Plug,
  ChevronDown,
  ChevronRight,
  User,
  Gauge,
  CalendarDays,
  Timer,
  ClipboardList,
  Building2,
  Bell,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
  badge?: number;
}

const navItems: NavItem[] = [
  {
    label: "Vue d'ensemble",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Mon travail",
    href: "/my-work",
    icon: User,
  },
  {
    label: "Projets",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Tâches",
    href: "/tasks",
    icon: CheckSquare,
  },
  {
    label: "Équipes",
    href: "/teams",
    icon: Users,
  },
  {
    label: "Planning",
    href: "/planning",
    icon: Calendar,
  },
  {
    label: "Temps",
    href: "/time",
    icon: Clock,
  },
  {
    label: "Congés",
    href: "/leave",
    icon: Umbrella,
  },
  {
    label: "Paramètres",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  organizationName?: string;
  unreadNotifications?: number;
}

export function Sidebar({ user, organizationName, unreadNotifications = 0 }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>(["Mon travail", "Planning"]);

  const toggleSection = (label: string) => {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex flex-col w-60 shrink-0 h-screen border-r bg-sidebar">
      {/* Organization */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary text-primary-foreground text-xs font-bold">
          {organizationName?.[0]?.toUpperCase() ?? "T"}
        </div>
        <span className="text-sm font-semibold truncate">
          {organizationName ?? "TeamOS"}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map((item) => (
          <div key={item.label}>
            {item.children ? (
              <div>
                <button
                  onClick={() => toggleSection(item.label)}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                    "group"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {expanded.includes(item.label) ? (
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                  )}
                </button>
                {expanded.includes(item.label) && (
                  <div className="ml-3 pl-3 border-l border-sidebar-border my-0.5">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href!}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                          isActive(child.href)
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <child.icon className="h-3.5 w-3.5 shrink-0" />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={item.href!}
                className={cn(
                  "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
                  isActive(item.href)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                    {item.badge}
                  </Badge>
                ) : null}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Notifications */}
      <div className="px-2 pb-1">
        <Link
          href="/notifications"
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
            "text-sidebar-foreground hover:bg-sidebar-accent"
          )}
        >
          <Bell className="h-4 w-4 shrink-0" />
          <span className="flex-1">Notifications</span>
          {unreadNotifications > 0 && (
            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </Badge>
          )}
        </Link>
      </div>

      {/* User */}
      <div className="border-t p-3 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-md p-1.5 hover:bg-sidebar-accent transition-colors"
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={user?.image ?? undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(user?.name ?? user?.email ?? "?")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.name ?? "Utilisateur"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2.5 w-full rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
