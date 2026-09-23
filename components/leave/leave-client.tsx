"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Calendar, Check, X, Clock } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  reason: string | null;
  status: string;
  leaveTypeName: string;
  leaveTypeColor: string;
}

interface LeaveType {
  id: string;
  name: string;
  color: string;
  requiresApproval: boolean;
}

interface PendingTeamRequest {
  id: string;
  userName: string;
  userImage: string | null;
  startDate: string;
  endDate: string;
  workingDays: number;
  reason: string | null;
  leaveTypeName: string;
}

interface LeaveClientProps {
  myRequests: LeaveRequest[];
  leaveTypes: LeaveType[];
  pendingTeamRequests: PendingTeamRequest[];
  organizationId: string;
  currentUserId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "Approuvé", color: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Refusé", color: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Annulé", color: "bg-gray-100 text-gray-600" },
};

export function LeaveClient({
  myRequests: initialRequests,
  leaveTypes,
  pendingTeamRequests: initialPending,
  organizationId,
  currentUserId,
}: LeaveClientProps) {
  const router = useRouter();
  const [myRequests, setMyRequests] = useState(initialRequests);
  const [pendingTeam, setPendingTeam] = useState(initialPending);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  const [form, setForm] = useState({
    leaveTypeId: leaveTypes[0]?.id ?? "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const handleCreate = async () => {
    if (!form.startDate || !form.endDate) return;
    setLoading(true);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": organizationId,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const req = await res.json();
        const type = leaveTypes.find((t) => t.id === form.leaveTypeId);
        setMyRequests((prev) => [{
          id: req.id,
          startDate: req.startDate,
          endDate: req.endDate,
          workingDays: req.workingDays ?? 0,
          reason: form.reason || null,
          status: req.status,
          leaveTypeName: type?.name ?? "—",
          leaveTypeColor: type?.color ?? "#94a3b8",
        }, ...prev]);
        setCreateOpen(false);
        setForm({ leaveTypeId: leaveTypes[0]?.id ?? "", startDate: "", endDate: "", reason: "" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, action: "approve" | "reject") => {
    setApproving(requestId);
    try {
      await fetch(`/api/leave/${requestId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": organizationId,
        },
        body: JSON.stringify({ action }),
      });
      setPendingTeam((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e) {
      console.error(e);
    } finally {
      setApproving(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* My requests */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Mes demandes</h2>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Nouvelle demande
          </Button>
        </div>

        {myRequests.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Aucune demande de congés</p>
            <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Faire une demande
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {myRequests.map((req) => {
              const statusConfig = STATUS_CONFIG[req.status] ?? { label: req.status, color: "bg-gray-100 text-gray-700" };
              return (
                <div key={req.id} className="border rounded-lg p-4 flex items-center gap-4">
                  <div
                    className="w-1 h-12 rounded-full shrink-0"
                    style={{ backgroundColor: req.leaveTypeColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{req.leaveTypeName}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(req.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      {" → "}
                      {new Date(req.endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      <span className="ml-1 font-medium text-foreground">· {req.workingDays}j ouvrés</span>
                    </div>
                    {req.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{req.reason}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Team pending approvals */}
      <div className="space-y-4">
        <h2 className="font-semibold">
          À approuver
          {pendingTeam.length > 0 && (
            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
              {pendingTeam.length}
            </span>
          )}
        </h2>

        {pendingTeam.length === 0 ? (
          <div className="border rounded-lg p-6 text-center text-muted-foreground">
            <Check className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Aucune demande en attente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingTeam.map((req) => (
              <div key={req.id} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={req.userImage ?? undefined} />
                    <AvatarFallback className="text-[9px]">
                      {getInitials(req.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{req.userName}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{req.leaveTypeName}</p>
                <p className="text-xs mb-2">
                  {new Date(req.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  {" → "}
                  {new Date(req.endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  <span className="font-medium ml-1">· {req.workingDays}j</span>
                </p>
                {req.reason && (
                  <p className="text-[11px] text-muted-foreground italic mb-2 line-clamp-2">
                    "{req.reason}"
                  </p>
                )}
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 flex-1 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => handleApprove(req.id, "approve")}
                    disabled={approving === req.id}
                  >
                    {approving === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 flex-1 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleApprove(req.id, "reject")}
                    disabled={approving === req.id}
                  >
                    <X className="h-3 w-3" />
                    Refuser
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle demande de congés</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type de congés</label>
              <select
                value={form.leaveTypeId}
                onChange={(e) => setForm((f) => ({ ...f, leaveTypeId: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {leaveTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Début</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fin</label>
                <Input
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Motif (optionnel)</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className="flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                placeholder="Précisez le motif si nécessaire..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={loading}>Annuler</Button>
            <Button onClick={handleCreate} disabled={loading || !form.startDate || !form.endDate}>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
