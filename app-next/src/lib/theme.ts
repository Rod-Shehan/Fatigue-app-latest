/**
 * Activity theme – single source of truth for Work / Break / Non-Work Time / End Shift.
 * Used by LogBar, TimeGrid, EventLogger, and CompliancePanel.
 */

export type ActivityKey = "work" | "break" | "rest" | "stop";

export const ACTIVITY_THEME: Record<
  ActivityKey,
  {
    hex: string;
    rgb: [number, number, number];
    button: string;
    badge: string;
    statsCard: string;
    statsLabel: string;
    statsValue: string;
  }
> = {
  work: {
    hex: "#3b82f6",
    rgb: [59, 130, 246],
    button: "bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300",
    badge: "bg-blue-100 text-blue-700",
    statsCard: "bg-blue-50",
    statsLabel: "text-blue-500",
    statsValue: "text-blue-700",
  },
  break: {
    hex: "#f59e0b",
    rgb: [251, 191, 36],
    button: "bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300",
    badge: "bg-amber-100 text-amber-700",
    statsCard: "bg-amber-50",
    statsLabel: "text-amber-500",
    statsValue: "text-amber-700",
  },
  rest: {
    hex: "#10b981",
    rgb: [52, 211, 153],
    button: "bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300",
    badge: "bg-emerald-100 text-emerald-700",
    statsCard: "bg-emerald-50",
    statsLabel: "text-emerald-500",
    statsValue: "text-emerald-700",
  },
  stop: {
    hex: "#94a3b8",
    rgb: [148, 163, 184],
    button: "bg-slate-400 hover:bg-slate-500 disabled:bg-slate-300",
    badge: "bg-slate-100 text-slate-600",
    statsCard: "bg-slate-50",
    statsLabel: "text-slate-500",
    statsValue: "text-slate-700",
  },
};

/** For TimeGrid bars: key, label, hex (no stop row in grid) */
export const TIME_GRID_ROWS = [
  { key: "work_time" as const, label: "Work", color: ACTIVITY_THEME.work.hex },
  { key: "breaks" as const, label: "Breaks", color: ACTIVITY_THEME.break.hex },
  { key: "non_work" as const, label: "Non-Work Time", color: ACTIVITY_THEME.rest.hex },
];
