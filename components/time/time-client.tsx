"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Play, Square, Plus, Clock, Trash2, Calendar } from "lucide-react";

interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  description: string | null;
  taskId: string | null;
  taskTitle: string | null;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
}

interface TaskOption {
  id: string;
  title: string;
  projectId: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
  color: string;
}

interface TimeClientProps {
  entries: TimeEntry[];
  tasks: TaskOption[];
  projects: ProjectOption[];
  organizationId: string;
  weekStart: string;
  weekEnd: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TimeClient({
  entries: initialEntries,
  tasks,
  projects,
  organizationId,
  weekStart,
  weekEnd,
}: TimeClientProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerDesc, setTimerDesc] = useState("");
  const [timerTask, setTimerTask] = useState("");
  const [timerProject, setTimerProject] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const startRef = useRef<number>(0);

  // Manual entry form
  const [showManual, setShowManual] = useState(false);
  const [manualHours, setManualHours] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualDesc, setManualDesc] = useState("");
  const [manualTask, setManualTask] = useState("");
  const [manualProject, setManualProject] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isRunning) {
      startRef.current = Date.now() - elapsed * 1000;
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const handleStartStop = async () => {
    if (isRunning) {
      // Stop and save
      setIsRunning(false);
      const hours = elapsed / 3600;
      if (hours >= 0.05) {
        await saveEntry({
          hours: Math.round(hours * 100) / 100,
          description: timerDesc || null,
          taskId: timerTask || null,
          projectId: timerProject || null,
          date: new Date().toISOString().split("T")[0],
        });
      }
      setElapsed(0);
      setTimerDesc("");
      setTimerTask("");
      setTimerProject("");
    } else {
      setIsRunning(true);
    }
  };

  const saveEntry = async (data: {
    hours: number;
    description: string | null;
    taskId: string | null;
    projectId: string | null;
    date: string;
  }) => {
    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": organizationId,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const entry = await res.json();
        const task = tasks.find((t) => t.id === data.taskId);
        const project = projects.find((p) => p.id === data.projectId);
        setEntries((prev) => [{
          id: entry.id,
          date: data.date,
          hours: data.hours,
          description: data.description,
          taskId: data.taskId,
          taskTitle: task?.title ?? null,
          projectId: data.projectId,
          projectName: project?.name ?? null,
          projectColor: project?.color ?? null,
        }, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualSave = async () => {
    if (!manualHours || parseFloat(manualHours) <= 0) return;
    setSaving(true);
    await saveEntry({
      hours: parseFloat(manualHours),
      description: manualDesc || null,
      taskId: manualTask || null,
      projectId: manualProject || null,
      date: manualDate,
    });
    setManualHours("");
    setManualDesc("");
    setManualTask("");
    setManualProject("");
    setShowManual(false);
    setSaving(false);
  };

  const totalHours = entries.reduce((acc, e) => acc + e.hours, 0);

  // Group entries by date
  const grouped = entries.reduce<Record<string, TimeEntry[]>>((acc, entry) => {
    const date = entry.date.split("T")[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  const weekLabel = `${new Date(weekStart).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${new Date(weekEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Timer card */}
      <div className="border rounded-xl p-5 bg-card shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Sur quoi travaillez-vous ?"
              value={timerDesc}
              onChange={(e) => setTimerDesc(e.target.value)}
              className="border-0 shadow-none p-0 text-base font-medium focus-visible:ring-0 h-auto"
              disabled={isRunning}
            />
          </div>
          <div className="font-mono text-2xl font-bold tabular-nums w-28 text-right">
            {formatDuration(elapsed)}
          </div>
          <Button
            size="icon"
            variant={isRunning ? "destructive" : "default"}
            className="h-10 w-10 rounded-full shrink-0"
            onClick={handleStartStop}
          >
            {isRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </Button>
        </div>

        {/* Timer task/project selects */}
        <div className="flex items-center gap-2 pt-3 border-t">
          <select
            value={timerTask}
            onChange={(e) => {
              setTimerTask(e.target.value);
              const task = tasks.find((t) => t.id === e.target.value);
              if (task?.projectId) setTimerProject(task.projectId);
            }}
            className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            disabled={isRunning}
          >
            <option value="">Tâche (optionnel)</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <select
            value={timerProject}
            onChange={(e) => setTimerProject(e.target.value)}
            className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            disabled={isRunning}
          >
            <option value="">Projet (optionnel)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Manual entry */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Cette semaine · {weekLabel}</h3>
            <p className="text-xs text-muted-foreground">{totalHours.toFixed(1)}h loggées</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowManual((s) => !s)}
          >
            <Plus className="h-3.5 w-3.5" />
            Entrée manuelle
          </Button>
        </div>

        {showManual && (
          <div className="border rounded-lg p-4 mb-4 bg-muted/20 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                <Input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Heures</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder="Ex: 2.5"
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <Input
              placeholder="Description du travail effectué"
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={manualTask}
                onChange={(e) => {
                  setManualTask(e.target.value);
                  const task = tasks.find((t) => t.id === e.target.value);
                  if (task?.projectId) setManualProject(task.projectId);
                }}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Tâche (optionnel)</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <select
                value={manualProject}
                onChange={(e) => setManualProject(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Projet (optionnel)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs" onClick={handleManualSave} disabled={saving || !manualHours}>
                Enregistrer
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowManual(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Entries grouped by day */}
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dayEntries]) => {
              const dayTotal = dayEntries.reduce((acc, e) => acc + e.hours, 0);
              return (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs font-semibold">{dayTotal.toFixed(1)}h</span>
                  </div>
                  <div className="space-y-1.5">
                    {dayEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/20 transition-colors group">
                        {entry.projectColor && (
                          <div
                            className="w-2 h-8 rounded-full shrink-0"
                            style={{ backgroundColor: entry.projectColor }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {entry.description ?? entry.taskTitle ?? "Sans description"}
                          </p>
                          {(entry.projectName || entry.taskTitle) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {[entry.projectName, entry.taskTitle !== entry.description ? entry.taskTitle : null]
                                .filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {entry.hours.toFixed(1)}h
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

          {entries.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Aucune entrée cette semaine</p>
              <p className="text-xs mt-1">Démarrez le chronomètre ou ajoutez une entrée manuelle</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
