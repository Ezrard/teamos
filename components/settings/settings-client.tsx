"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Loader2, User, Building2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

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
}

const DAY_LABELS = [
  { key: "mondayHours" as const, label: "Lundi" },
  { key: "tuesdayHours" as const, label: "Mardi" },
  { key: "wednesdayHours" as const, label: "Mercredi" },
  { key: "thursdayHours" as const, label: "Jeudi" },
  { key: "fridayHours" as const, label: "Vendredi" },
];

export function SettingsClient({ user, org, schedule, organizationId }: SettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "org" | "schedule">("profile");

  const [profileForm, setProfileForm] = useState({ name: user.name, email: user.email });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [scheduleForm, setScheduleForm] = useState(schedule ?? {
    mondayHours: 8,
    tuesdayHours: 8,
    wednesdayHours: 8,
    thursdayHours: 8,
    fridayHours: 8,
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);

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

  const totalWeeklyHours = Object.values(scheduleForm).reduce((a, b) => a + b, 0);

  const tabs = [
    { id: "profile" as const, label: "Mon profil", icon: User },
    { id: "org" as const, label: "Organisation", icon: Building2 },
    { id: "schedule" as const, label: "Horaires", icon: Clock },
  ];

  return (
    <div className="flex gap-6 max-w-3xl">
      {/* Tabs sidebar */}
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
        {activeTab === "profile" && (
          <div className="border rounded-xl p-6 space-y-5">
            <h2 className="font-semibold">Mon profil</h2>

            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.image ?? undefined} />
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
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nom complet</label>
              <Input
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
              <Input
                value={profileForm.email}
                onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                type="email"
                className="h-9 text-sm"
              />
            </div>

            <Button onClick={handleProfileSave} disabled={profileLoading} className="h-9 text-sm">
              {profileLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {profileSaved ? "✓ Enregistré" : "Enregistrer les modifications"}
            </Button>
          </div>
        )}

        {activeTab === "org" && (
          <div className="border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold">Organisation</h2>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nom</label>
              <Input value={org.name} readOnly className="h-9 text-sm bg-muted" />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Identifiant (slug)</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground whitespace-nowrap">teamos.app/</span>
                <Input value={org.slug} readOnly className="h-9 text-sm bg-muted" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Pour modifier les informations de l'organisation, contactez un administrateur.
            </p>
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="border rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Horaires de travail</h2>
              <span className="text-xs text-muted-foreground">
                Total: <strong className="text-foreground">{totalWeeklyHours}h/semaine</strong>
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              Définissez vos heures de travail quotidiennes pour le calcul de la charge et des congés.
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
                      onChange={(e) => setScheduleForm((f) => ({ ...f, [key]: parseFloat(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-10 text-right">
                      {scheduleForm[key]}h
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleScheduleSave} disabled={scheduleLoading} className="h-9 text-sm">
              {scheduleLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {scheduleSaved ? "✓ Enregistré" : "Enregistrer les horaires"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
