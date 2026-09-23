import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null, fmt = "dd/MM/yyyy"): string {
  if (!date) return "—";
  return format(new Date(date), fmt, { locale: fr });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: fr });
}

export function formatRelative(date: Date | string | null): string {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export function formatDuration(startTime: Date, endTime: Date): string {
  const diffMs = endTime.getTime() - startTime.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return formatHours(hours);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: "text-blue-500",
    MEDIUM: "text-yellow-500",
    HIGH: "text-orange-500",
    URGENT: "text-red-500",
  };
  return colors[priority] ?? "text-gray-500";
}

export function getPriorityBg(priority: string): string {
  const colors: Record<string, string> = {
    LOW: "bg-blue-50 text-blue-700 border-blue-200",
    MEDIUM: "bg-yellow-50 text-yellow-700 border-yellow-200",
    HIGH: "bg-orange-50 text-orange-700 border-orange-200",
    URGENT: "bg-red-50 text-red-700 border-red-200",
  };
  return colors[priority] ?? "bg-gray-50 text-gray-700 border-gray-200";
}

export function getStatusColor(category: string): string {
  const colors: Record<string, string> = {
    BACKLOG: "#94a3b8",
    TODO: "#64748b",
    IN_PROGRESS: "#3b82f6",
    IN_REVIEW: "#8b5cf6",
    DONE: "#22c55e",
    CANCELLED: "#ef4444",
  };
  return colors[category] ?? "#94a3b8";
}

export function isOverdue(dueDate: Date | string | null): boolean {
  if (!dueDate) return false;
  return isPast(new Date(dueDate));
}

export function getDueDateLabel(dueDate: Date | string | null): string {
  if (!dueDate) return "";
  const date = new Date(dueDate);
  if (isToday(date)) return "Aujourd'hui";
  if (isTomorrow(date)) return "Demain";
  if (isPast(date)) return `En retard · ${formatDate(date)}`;
  return formatDate(date);
}

export function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  holidays: Date[] = []
): number {
  let days = 0;
  const current = new Date(startDate);
  const holidayStrings = holidays.map((h) => h.toDateString());

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (
      dayOfWeek !== 0 &&
      dayOfWeek !== 6 &&
      !holidayStrings.includes(current.toDateString())
    ) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function calculateCapacity(
  schedule: {
    mondayHours: number;
    tuesdayHours: number;
    wednesdayHours: number;
    thursdayHours: number;
    fridayHours: number;
    saturdayHours: number;
    sundayHours: number;
  },
  weekStart: Date
): number {
  const days = [
    schedule.sundayHours,
    schedule.mondayHours,
    schedule.tuesdayHours,
    schedule.wednesdayHours,
    schedule.thursdayHours,
    schedule.fridayHours,
    schedule.saturdayHours,
  ];
  return days.reduce((sum, h) => sum + h, 0);
}

export function truncate(str: string, length = 50): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}
