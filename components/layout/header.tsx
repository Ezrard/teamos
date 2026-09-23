"use client";

import React, { useState, useCallback } from "react";
import { Search, Bell, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  unreadNotifications?: number;
  organizationId?: string;
}

export function Header({
  title,
  subtitle,
  actions,
  unreadNotifications = 0,
  organizationId,
}: HeaderProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchOpen(false);
        setSearchQuery("");
      }
    },
    [searchQuery, router]
  );

  return (
    <header className="flex items-center gap-4 h-14 px-6 border-b bg-background shrink-0">
      {/* Title */}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold truncate">{title}</h1>
            {subtitle && (
              <span className="text-xs text-muted-foreground">· {subtitle}</span>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-1">
        {searchOpen ? (
          <form onSubmit={handleSearch} className="flex items-center gap-1">
            <Input
              autoFocus
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </form>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/notifications")}
        >
          <Bell className="h-4 w-4" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white font-medium">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Button>
      </div>

      {/* Actions */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
