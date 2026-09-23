"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getInitials, formatDate } from "@/lib/utils";
import { Mail, Search, UserPlus, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface MemberData {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  roleId: string | null;
  roleName: string;
  joinedAt: string;
}

interface RoleData {
  id: string;
  name: string;
}

interface TeamsClientProps {
  members: MemberData[];
  roles: RoleData[];
  organizationId: string;
  currentUserId: string;
  currentMembershipId: string;
  currentRoleId: string;
}

const ROLE_COLORS: Record<string, string> = {
  "Owner": "bg-purple-100 text-purple-700",
  "Admin": "bg-blue-100 text-blue-700",
  "Manager": "bg-indigo-100 text-indigo-700",
  "Team Lead": "bg-cyan-100 text-cyan-700",
  "Employee": "bg-gray-100 text-gray-700",
  "Guest": "bg-slate-100 text-slate-600",
};

export function TeamsClient({
  members,
  roles,
  organizationId,
  currentUserId,
  currentMembershipId,
  currentRoleId,
}: TeamsClientProps) {
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState(roles.find((r) => r.name === "Employee")?.id ?? roles[0]?.id ?? "");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviteLoading(true);
    setInviteError("");
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": organizationId,
        },
        body: JSON.stringify({ email: inviteEmail, roleId: inviteRoleId }),
      });
      if (!res.ok) {
        const body = await res.json();
        setInviteError(body.error ?? "Erreur lors de l'invitation");
      } else {
        setInviteSuccess(true);
        setTimeout(() => {
          setInviteOpen(false);
          setInviteSuccess(false);
          setInviteEmail("");
        }, 1500);
      }
    } catch {
      setInviteError("Une erreur est survenue");
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher un membre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex-1" />
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-3.5 w-3.5" />
          Inviter
        </Button>
      </div>

      {/* Member table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Membre</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Rôle</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Membre depuis</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                  Aucun membre trouvé
                </td>
              </tr>
            ) : (
              filtered.map((member) => (
                <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.image ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.name}
                          {member.userId === currentUserId && (
                            <span className="ml-1.5 text-[10px] text-muted-foreground">(moi)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.roleName] ?? "bg-gray-100 text-gray-700"}`}>
                      {member.roleName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(member.joinedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {roles.map((role) => {
          const count = members.filter((m) => m.roleId === role.id).length;
          if (count === 0) return null;
          return (
            <div key={role.id} className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{role.name}</p>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Inviter un membre</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {inviteSuccess ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="font-medium">Invitation envoyée !</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Un email a été envoyé à {inviteEmail}
                </p>
              </div>
            ) : (
              <>
                {inviteError && (
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    {inviteError}
                  </p>
                )}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Adresse email
                  </label>
                  <Input
                    type="email"
                    placeholder="prenom.nom@entreprise.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="h-9"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Rôle
                  </label>
                  <select
                    value={inviteRoleId}
                    onChange={(e) => setInviteRoleId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
          {!inviteSuccess && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviteLoading}>
                Annuler
              </Button>
              <Button onClick={handleInvite} disabled={inviteLoading || !inviteEmail}>
                {inviteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Envoyer
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
