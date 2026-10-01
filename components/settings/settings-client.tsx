"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import {
  Loader2,
  User,
  Building2,
  Clock,
  Shield,
  ChevronDown,
  ChevronRight,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Permission {
  resource: string;
  action: string;
  scope: "ALL" | "TEAM" | "OWN";
}

interface RoleData {
  id: string;
  name: string;
  color: string;
  isSystem: boolean;
  permissions: Permission[];
}

interface MemberData {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
}

interface SettingsClientProps {
  user: { id: string; name: string; email: string; image: string | null };
  org: { id: string; name: string; slug: string };
  schedule: {
    mondayHours: number;
    tuesdayHours: number;
    wednesdayHours: number;
    thursdayHours: number;
    fridayHours: number;
  } | null;
  organizationId: string;
  currentRoleName: string;
  isOwner: boolean;
  isAdmin: boolean;
  roles: RoleData[];
  members: MemberData[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = [
  { key: "mondayHours" as const, label: "Lundi" },
  { key: "tuesdayHours" as const, label: "Mardi" },
  { key: "wednesdayHours" as const, label: "Mercredi" },
  { key: "thursdayHours" as const, label: "Jeudi" },
  { key: "fridayHours" as const, label: "Vendredi" },
];

const RESOURCES = [
  { key: "projects", label: "Projets" },
  { key: "tasks", label: "Tâches" },
  { key: "teams", label: "Équipes" },
  { key: "users", label: "Membres" },
  { key: "leave", label: "Congés" },
  { key: "time", label: "Temps" },
  { key: "reports", label: "Rapports" },
  { key: "settings", label: "Paramètres" },
];

const ACTIONS = [
  { key: "view", label: "Voir" },
  { key: "create", label: "Créer" },
  { key: "edit", label: "Modifier" },
  { key: "delete", label: "Supprimer" },
  { key: "approve", label: "Approuver" },
  { key: "assign", label: "Assigner" },
];

const SCOPES = [
  { key: "ALL" as const, label: "Tout" },
  { key: "TEAM" as const, label: "Équipe" },
  { key: "OWN" as const, label: "Propre" },
];

// ─── Permissions matrix ───────────────────────────────────────────────────────

function PermMatrix({
  role,
  editable,
  onSave,
}: {
  role: RoleData;
  editable: boolean;
  onSave: (roleId: string, perms: Permission[]) => Promise<void>;
}) {
  // Build a map: resource → action → scope | null
  const toMap = (perms: Permission[]) => {
    const m: Record<string, Record<string, "ALL" | "TEAM" | "OWN">> = {};
    for (const p of perms) {
      if (!m[p.resource]) m[p.resource] = {};
      m[p.resource][p.action] = p.scope;
    }
    return m;
  };

  const [permMap, setPermMap] = useState(() => toMap(role.permissions));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isDirty =
    JSON.stringify(permMap) !== JSON.stringify(toMap(role.permissions));

  const toggle = (resource: string, action: string, scope: "ALL" | "TEAM" | "OWN") => {
    if (!editable) return;
    setPermMap((prev) => {
      const next = { ...prev };
      if (!next[resource]) next[resource] = {};
      if (next[resource][action] === scope) {
        // Deselect
        const r = { ...next[resource] };
        delete r[action];
        next[resource] = r;
      } else {
        next[resource] = { ...next[resource], [action]: scope };
      }
      return next;
    });
  };

  const toPermList = (): Permission[] =>
    Object.entries(permMap).flatMap(([resource, actions]) =>
      Object.entries(actions).map(([action, scope]) => ({
        resource,
        action,
        scope,
      }))
    );

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(role.id, toPermList());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground w-28">
                Ressource
              </th>
              {ACTIONS.map((a) => (
                <th
                  key={a.key}
                  className="text-center px-2 py-2 font-medium text-muted-foreground"
                >
                  {a.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map((res, ri) => (
              <tr
                key={res.key}
                className={cn("border-b last:border-0", ri % 2 === 0 ? "bg-background" : "bg-muted/20")}
              >
                <td className="px-3 py-2 font-medium text-foreground">{res.label}</td>
                {ACTIONS.map((act) => {
                  const currentScope = permMap[res.key]?.[act.key];
                  return (
                    <td key={act.key} className="px-2 py-1.5 text-center">
                      {editable ? (
                        <div className="flex items-center justify-center gap-0.5">
                          {SCOPES.map((sc) => (
                            <button
                              key={sc.key}
                              title={sc.label}
                              onClick={() => toggle(res.key, act.key, sc.key)}
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                                currentScope === sc.key
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              )}
                            >
                              {sc.label[0]}
                            </button>
                          ))}
                        </div>
                      ) : currentScope ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
                          <Check className="h-2.5 w-2.5" />
                          {SCOPES.find((s) => s.key === currentScope)?.label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="h-8 text-xs"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            {saved ? "✓ Enregistré" : "Enregistrer les permissions"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            T = Tout · É = Équipe · P = Propre
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SettingsClient({
  user,
  org,
  schedule,
  organizationId,
  currentRoleName,
  isOwner,
  isAdmin,
  roles,
  members,
}: SettingsClientProps) {
  const router = useRouter();

  type Tab = "profile" | "org" | "schedule" | "roles";
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile
  const [profileForm, setProfileForm] = useState({ name: user.name, email: user.email });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Schedule
  const [scheduleForm, setScheduleForm] = useState(
    schedule ?? {
      mondayHours: 8,
      tuesdayHours: 8,
      wednesdayHours: 8,
      thursdayHours: 8,
      fridayHours: 8,
    }
  );
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  // Roles expanded state
  const [expandedRoles, setExpandedRoles] = useState<string[]>([]);

  // Transfer ownership
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferConfirm, setTransferConfirm] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);

  const handleProfileSave = async () => {
    setProfileLoading(true);
    try {
      await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleScheduleSave = async () => {
    setScheduleLoading(true);
    try {
      await fetch("/api/work-schedules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": organizationId,
        },
        body: JSON.stringify(scheduleForm),
      });
      setScheduleSaved(true);
      setTimeout(() => setScheduleSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleSavePermissions = async (roleId: string, perms: Permission[]) => {
    await fetch(`/api/roles/${roleId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: perms }),
    });
    router.refresh();
  };

  const handleTransferOwnership = async () => {
    if (!transferTargetId) return;
    setTransferLoading(true);
    try {
      const res = await fetch("/api/organizations/transfer-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerId: transferTargetId }),
      });
      if (res.ok) {
        setTransferConfirm(false);
        setTransferTargetId("");
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTransferLoading(false);
    }
  };

  const totalWeeklyHours = Object.values(scheduleForm).reduce((a, b) => a + b, 0);

  const tabs = [
    { id: "profile" as const, label: "Mon profil", icon: User },
    { id: "org" as const, label: "Organisation", icon: Building2 },
    { id: "schedule" as const, label: "Horaires", icon: Clock },
    ...(isAdmin ? [{ id: "roles" as const, label: "Rôles & Accès", icon: Shield }] : []),
  ];

  const toggleRole = (id: string) =>
    setExpandedRoles((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );

  const ROLE_ORDER = ["Owner", "Admin", "Manager", "Team Lead", "Employee", "Guest"];
  const sortedRoles = [...roles].sort(
    (a, b) => ROLE_ORDER.indexOf(a.name) - ROLE_ORDER.indexOf(b.name)
  );

  const transferTarget = members.find((m) => m.id === transferTargetId);

  return (
    <div className="flex gap-6 max-w-4xl">
      {/* Sidebar */}
      <div className="w-44 shrink-0">
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6">

        {/* ── PROFILE ── */}
        {activeTab === "profile" && (
          <div className="border rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Mon profil</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {currentRoleName}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {getInitials(user.name || user.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user.name || "—"}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Nom complet
              </label>
              <Input
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Email
              </label>
              <Input
                value={profileForm.email}
                onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                type="email"
                className="h-9 text-sm"
              />
            </div>

            <Button
              onClick={handleProfileSave}
              disabled={profileLoading}
              className="h-9 text-sm"
            >
              {profileLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {profileSaved ? "✓ Enregistré" : "Enregistrer les modifications"}
            </Button>
          </div>
        )}

        {/* ── ORGANISATION ── */}
        {activeTab === "org" && (
          <div className="space-y-6">
            <div className="border rounded-xl p-6 space-y-4">
              <h2 className="font-semibold">Organisation</h2>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Nom
                </label>
                <Input value={org.name} readOnly className="h-9 text-sm bg-muted" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Identifiant (slug)
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    task.io/
                  </span>
                  <Input value={org.slug} readOnly className="h-9 text-sm bg-muted" />
                </div>
              </div>

              {!isOwner && (
                <p className="text-xs text-muted-foreground">
                  Pour modifier les informations de l'organisation, contactez un Owner.
                </p>
              )}
            </div>

            {/* Transfer ownership — Owner only */}
            {isOwner && (
              <div className="border border-destructive/30 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h2 className="font-semibold text-destructive">Transfert de propriété</h2>
                </div>

                <p className="text-sm text-muted-foreground">
                  Transférez la propriété à un autre membre. Vous deviendrez Admin.
                  Cette action est irréversible (sauf si le nouveau Owner vous retransfère la propriété).
                </p>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Nouveau propriétaire
                  </label>
                  <select
                    value={transferTargetId}
                    onChange={(e) => {
                      setTransferTargetId(e.target.value);
                      setTransferConfirm(false);
                    }}
                    className="w-full h-9 text-sm border rounded-md px-3 bg-background"
                  >
                    <option value="">Sélectionner un membre…</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.roleName})
                      </option>
                    ))}
                  </select>
                </div>

                {transferTargetId && !transferConfirm && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setTransferConfirm(true)}
                  >
                    Transférer à {transferTarget?.name}
                  </Button>
                )}

                {transferConfirm && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium">
                      Confirmer le transfert à{" "}
                      <strong>{transferTarget?.name}</strong> ?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vous perdrez le rôle Owner et deviendrez Admin.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={handleTransferOwnership}
                        disabled={transferLoading}
                      >
                        {transferLoading && (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        )}
                        Confirmer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setTransferConfirm(false)}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SCHEDULE ── */}
        {activeTab === "schedule" && (
          <div className="border rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Horaires de travail</h2>
              <span className="text-xs text-muted-foreground">
                Total:{" "}
                <strong className="text-foreground">{totalWeeklyHours}h/semaine</strong>
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              Définissez vos heures de travail quotidiennes pour le calcul de la charge et des
              congés.
            </p>

            <div className="space-y-3">
              {DAY_LABELS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-4">
                  <span className="text-sm w-24 text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="range"
                      min={0}
                      max={12}
                      step={0.5}
                      value={scheduleForm[key]}
                      onChange={(e) =>
                        setScheduleForm((f) => ({
                          ...f,
                          [key]: parseFloat(e.target.value),
                        }))
                      }
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-10 text-right">
                      {scheduleForm[key]}h
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleScheduleSave}
              disabled={scheduleLoading}
              className="h-9 text-sm"
            >
              {scheduleLoading && (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              )}
              {scheduleSaved ? "✓ Enregistré" : "Enregistrer les horaires"}
            </Button>
          </div>
        )}

        {/* ── ROLES & PERMISSIONS ── */}
        {activeTab === "roles" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold">Rôles & Permissions</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Définissez ce que chaque rôle peut faire dans l'organisation.
                <br />
                <span className="text-xs">
                  Portée :{" "}
                  <strong>T</strong> = Tout ·{" "}
                  <strong>É</strong> = Équipe ·{" "}
                  <strong>P</strong> = Propre uniquement
                </span>
              </p>
            </div>

            {sortedRoles.map((role) => {
              const isExpanded = expandedRoles.includes(role.id);
              const canEdit = isOwner && role.name !== "Owner";

              return (
                <div key={role.id} className="border rounded-xl overflow-hidden">
                  <button
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => toggleRole(role.id)}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: role.color }}
                    />
                    <span className="font-medium text-sm flex-1">{role.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {role.permissions.length} permission
                      {role.permissions.length !== 1 ? "s" : ""}
                    </span>
                    {role.name === "Owner" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                        Accès total
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t">
                      {role.name === "Owner" ? (
                        <p className="text-sm text-muted-foreground py-2">
                          Le Owner a accès à toutes les fonctionnalités sans restriction.
                          Ses permissions ne sont pas modifiables.
                        </p>
                      ) : (
                        <PermMatrix
                          role={role}
                          editable={canEdit}
                          onSave={handleSavePermissions}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
