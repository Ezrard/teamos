"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Bell, X, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
}: HeaderProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
    <header className="flex items-center gap-4 h-14 px-6 border-b bg-background/90 backdrop-blur-md shrink-0 sticky top-0 z-20 shadow-sm">
      {/* Breadcrumb / Title */}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="flex flex-col">
            <h1 className="text-[15px] font-bold text-foreground truncate leading-tight">{title}</h1>
            {subtitle && (
              <span className="text-[11px] text-muted-foreground capitalize">{subtitle}</span>
            )}
          </div>
        )}
      </div>

      {/* Global search trigger */}
      <button
        onClick={() => setSearchOpen(true)}
        className={cn(
          "hidden sm:flex items-center gap-2 px-3 h-8 rounded-md border border-border",
          "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
          "text-[13px] transition-colors w-44"
        )}
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">Rechercher…</span>
        <kbd className="hidden sm:flex items-center gap-0.5 px-1 h-5 rounded bg-background border border-border text-[10px] text-muted-foreground font-mono">
          <span>⌘K</span>
        </kbd>
      </button>

      {/* Mobile search */}
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => setSearchOpen(true)}
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* Notifications */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/notifications")}
      >
        <Bell className="h-4 w-4" />
        {unreadNotifications > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] text-white font-bold">
            {unreadNotifications > 9 ? "9+" : unreadNotifications}
          </span>
        )}
      </Button>

      {/* Actions */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}

      {/* Search overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-foreground/20 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSearchOpen(false);
              setSearchQuery("");
            }
          }}
        >
          <div className="w-full max-w-lg mx-4 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
            <form onSubmit={handleSearch}>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Rechercher projets, tâches, membres…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                  className="h-6 w-6 flex items-center justify-center rounded bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
            <div className="px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {["/projects", "/tasks", "/teams"].map((href, i) => {
                  const labels = ["Projets", "Tâches", "Équipes"];
                  return (
                    <button
                      key={href}
                      onClick={() => { router.push(href); setSearchOpen(false); }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted hover:bg-accent text-[12px] text-muted-foreground hover:text-accent-foreground transition-colors"
                    >
                      {labels[i]}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground/60 text-center">
                Appuyez sur <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Entrée</kbd> pour rechercher · <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Esc</kbd> pour fermer
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
