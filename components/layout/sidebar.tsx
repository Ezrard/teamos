"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Settings,
  ChevronDown,
  User,
  Bell,
  LogOut,
  Plus,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";

interface NavGroup {
  label?: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const navGroups: NavGroup[] = [
  {
    items: [
      { label: "Vue d'ensemble", href: "/dashboard", icon: LayoutDashboard },
      { label: "Mon travail", href: "/my-work", icon: User },
    ],
  },
  {
    label: "TRAVAIL",
    items: [
      { label: "Projets", href: "/projects", icon: FolderKanban },
      { label: "Tâches", href: "/tasks", icon: CheckSquare },
    ],
  },
  {
    label: "ÉQUIPE",
    items: [
      { label: "Membres", href: "/teams", icon: Users },
      { label: "Planning", href: "/planning", icon: Calendar },
    ],
  },
  {
    label: "TEMPS",
    items: [
      { label: "Suivi du temps", href: "/time", icon: Clock },
      { label: "Congés", href: "/leave", icon: Umbrella },
    ],
  },
];

interface OrgInfo {
  id: string;
  name: string;
  active?: boolean;
}

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  organizationName?: string;
  organizations?: OrgInfo[];
  unreadNotifications?: number;
}

export function Sidebar({
  user,
  organizationName,
  organizations = [],
  unreadNotifications = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const handleSwitchOrg = async (orgId: string) => {
    const currentOrg = organizations.find((o) => o.active);
    if (orgId === currentOrg?.id || switching) return;
    setSwitching(true);
    setOrgDropdownOpen(false);
    try {
      await fetch("/api/organizations/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      router.refresh();
    } finally {
      setSwitching(false);
    }
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen border-r bg-sidebar shrink-0 transition-all duration-200",
        collapsed ? "w-14" : "w-56"
      )}
      style={{ colorScheme: "dark" }}
    >
      {/* Logo + Org Switcher */}
      <div className="relative border-b border-sidebar-border">
        <div className="flex items-center h-14 px-3 gap-2">
          {/* Logo mark */}
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 cursor-pointer select-none"
            style={{ background: "linear-gradient(135deg, #6D3DF5 0%, #9B6DFA 100%)" }}
            onClick={() => setOrgDropdownOpen((o) => !o)}
          >
            <span className="text-white text-[11px] font-bold tracking-tight">
              {organizationName?.[0]?.toUpperCase() ?? "T"}
            </span>
          </div>

          {!collapsed && (
            <>
              <button
                onClick={() => setOrgDropdownOpen((o) => !o)}
                className="flex-1 flex items-center gap-1 text-left min-w-0"
              >
                <span className="text-[13px] font-semibold truncate text-sidebar-accent-foreground">
                  {organizationName ?? "TASK.IO"}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 text-sidebar-foreground/50 shrink-0 transition-transform",
                    orgDropdownOpen && "rotate-180"
                  )}
                />
              </button>

              <button
                onClick={() => setCollapsed(true)}
                className="h-6 w-6 flex items-center justify-center rounded text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors shrink-0"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full bg-background border border-border text-muted-foreground hover:text-foreground shadow-sm transition-colors z-10"
            >
              <PanelLeftOpen className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Org Dropdown */}
        {orgDropdownOpen && !collapsed && (
          <div className="absolute top-full left-0 right-0 z-50 bg-popover border border-border rounded-b-lg shadow-lg py-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitchOrg(org.id)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
              >
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-md text-white text-[10px] font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg, #6D3DF5 0%, #9B6DFA 100%)" }}
                >
                  {org.name[0].toUpperCase()}
                </div>
                <span className="flex-1 truncate text-[13px]">{org.name}</span>
                {org.active && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            ))}
            <div className="border-t border-border mt-1 pt-1">
              <Link
                href="/onboarding"
                onClick={() => setOrgDropdownOpen(false)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] hover:bg-muted transition-colors text-muted-foreground"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                Nouvelle organisation
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className="px-2 mb-1 text-[10px] font-semibold tracking-wider text-sidebar-foreground/40 uppercase">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors relative group",
                      active
                        ? "bg-primary/10 text-primary nav-active-glow"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "shrink-0 transition-colors",
                        collapsed ? "h-[18px] w-[18px]" : "h-4 w-4",
                        active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge != null && item.badge > 0 && (
                          <Badge
                            variant="destructive"
                            className="h-4 px-1 text-[10px] font-medium"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                    {/* Active dot when collapsed */}
                    {collapsed && active && (
                      <span className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Notifications + Settings */}
      <div className="px-2 pb-2 space-y-0.5">
        <Link
          href="/notifications"
          title={collapsed ? "Notifications" : undefined}
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors",
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <div className="relative shrink-0">
            <Bell className="h-4 w-4 text-sidebar-foreground/60" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] text-white font-bold">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </div>
          {!collapsed && (
            <>
              <span className="flex-1">Notifications</span>
              {unreadNotifications > 0 && (
                <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </Badge>
              )}
            </>
          )}
        </Link>

        <Link
          href="/settings"
          title={collapsed ? "Paramètres" : undefined}
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors",
            isActive("/settings")
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Settings
            className={cn(
              "h-4 w-4 shrink-0",
              isActive("/settings") ? "text-primary" : "text-sidebar-foreground/60"
            )}
          />
          {!collapsed && <span className="flex-1">Paramètres</span>}
        </Link>
      </div>

      {/* User profile */}
      <div className="border-t border-sidebar-border p-2">
        <div className="flex items-center gap-2.5 rounded-md p-1.5 hover:bg-sidebar-accent transition-colors">
          <Link href="/settings" className="flex items-center gap-2.5 flex-1 min-w-0">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={user?.image ?? undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                {getInitials(user?.name ?? user?.email ?? "?")}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate text-sidebar-accent-foreground">
                  {user?.name ?? "Utilisateur"}
                </p>
                <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.email}</p>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Se déconnecter"
              className="h-6 w-6 flex items-center justify-center rounded text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Se déconnecter"
            className="flex items-center justify-center w-full mt-1 py-1 rounded text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
}
