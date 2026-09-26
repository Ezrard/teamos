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
  ChevronRight,
  User,
  Bell,
  LogOut,
  Plus,
  Check,
  Building2,
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
  const [expanded, setExpanded] = useState<string[]>([]);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

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
    <aside className="flex flex-col w-60 shrink-0 h-screen border-r bg-sidebar">
      {/* Organization switcher */}
      <div className="relative border-b">
        <button
          onClick={() => setOrgDropdownOpen((o) => !o)}
          className="flex items-center gap-2.5 px-4 h-14 w-full hover:bg-sidebar-accent transition-colors"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary text-primary-foreground text-xs font-bold shrink-0">
            {organizationName?.[0]?.toUpperCase() ?? "T"}
          </div>
          <span className="text-sm font-semibold truncate flex-1 text-left">
            {organizationName ?? "TeamOS"}
          </span>
          <ChevronDown className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0",
            orgDropdownOpen && "rotate-180"
          )} />
        </button>

        {orgDropdownOpen && (
          <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-b-lg shadow-lg py-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitchOrg(org.id)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                  {org.name[0].toUpperCase()}
                </div>
                <span className="flex-1 truncate">{org.name}</span>
                {org.active && (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
              </button>
            ))}
            <div className="border-t mt-1 pt-1">
              <Link
                href="/onboarding"
                onClick={() => setOrgDropdownOpen(false)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-muted-foreground"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Nouvelle organisation
              </Link>
            </div>
          </div>
        )}
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
