"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Briefcase, Coffee, Moon, Square } from "lucide-react";
import { ACTIVITY_THEME, type ActivityKey } from "@/lib/theme";
import { ThemeToggle } from "@/components/theme-toggle";

const WORK_TARGET_MINUTES = 5 * 60;
const BREAK_TARGET_MINUTES = 20;

function formatCountdown(mins: number): string {
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}

const EVENT_ICONS: Record<ActivityKey, React.ComponentType<{ className?: string }>> = {
  work: Briefcase,
  break: Coffee,
  rest: Moon,
  stop: Square,
};
const EVENT_LABELS: Record<ActivityKey, string> = {
  work: "Work",
  break: "Break",
  rest: "Rest",
  stop: "End Shift",
};

/** Break follows work, work follows break. When idle or after End Shift, next is Work. */
function getNextWorkBreakType(currentType: string | null): "work" | "break" {
  return currentType === "work" ? "break" : "work";
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MIN_BREAK_TOTAL_MINUTES = 20;
  const MIN_BREAK_BLOCK_MINUTES = 10;
  const BREAK_BLOCKS_REQUIRED = 1;
const CONFIRM_RESET_MS = 2500;

function getDurationMinutes(start: string, end: string) {
  return Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

type DayData = { events?: { time: string; type: string }[] };

export default function LogBar({
  days,
  currentDayIndex,
  weekStarting,
  onLogEvent,
  onEndShiftRequest,
  leadingIcon,
}: {
  days: DayData[];
  currentDayIndex: number;
  weekStarting: string;
  onLogEvent: (dayIndex: number, type: string) => void;
  /** When provided, End Shift (second tap) calls this instead of onLogEvent so the parent can show end km input. */
  onEndShiftRequest?: (dayIndex: number) => void;
  /** Optional icon shown to the left of the "Today" label in the top header row. */
  leadingIcon?: React.ReactNode;
}) {
  const [pendingType, setPendingType] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  const day = days[currentDayIndex];
  const events = day?.events || [];
  const lastEvent = events[events.length - 1];
  const currentType = lastEvent && lastEvent.type !== "stop" ? lastEvent.type : null;

  const elapsedMinutes = currentType && lastEvent ? Math.floor((Date.now() - new Date(lastEvent.time).getTime()) / 60000) : 0;
  const contextualBar = (() => {
    if (!currentType || currentType === "stop") return null;
    if (currentType === "work") {
      const target = WORK_TARGET_MINUTES;
      const pct = Math.min(100, (elapsedMinutes / target) * 100);
      const remaining = Math.max(0, target - elapsedMinutes);
      return { type: "work" as const, elapsed: elapsedMinutes, target, pct, remaining, color: ACTIVITY_THEME.work.hex, label: "5h" };
    }
    if (currentType === "break") {
      const target = BREAK_TARGET_MINUTES;
      const pct = Math.min(100, (elapsedMinutes / target) * 100);
      const remaining = Math.max(0, target - elapsedMinutes);
      return { type: "break" as const, elapsed: elapsedMinutes, target, pct, remaining, color: ACTIVITY_THEME.break.hex, label: "20m" };
    }
    return null;
  })();

  const currentDayLabel = (() => {
    if (!weekStarting) return DAY_NAMES[currentDayIndex];
    const d = new Date(weekStarting);
    d.setDate(d.getDate() + currentDayIndex);
    return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  })();
  const currentDayLabelShort = (() => {
    if (!weekStarting) return DAY_NAMES[currentDayIndex];
    const d = new Date(weekStarting);
    d.setDate(d.getDate() + currentDayIndex);
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  })();

  const clearPending = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setPendingType(null);
  }, []);

  useEffect(() => {
    clearPending();
  }, [currentDayIndex, clearPending]);

  const getBreakWarning = (newType: string) => {
    if (newType !== "work") return null;
    const segments: number[] = [];
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].type !== "break") break;
      const end = i + 1 < events.length ? new Date(events[i + 1].time).getTime() : Date.now();
      const start = new Date(events[i].time).getTime();
      segments.unshift(Math.floor((end - start) / 60000));
    }
    const totalMins = segments.reduce((a, b) => a + b, 0);
    const blocksOf10 = segments.filter((m) => m >= MIN_BREAK_BLOCK_MINUTES).length;
    if (totalMins < MIN_BREAK_TOTAL_MINUTES || blocksOf10 < BREAK_BLOCKS_REQUIRED)
      return `20 min break for ea 5 hours work time - 10 min minimum x 2`;
    return null;
  };

  const handleLog = (type: string) => {
    if (type === currentType) return;

    if (pendingType === type) {
      clearPending();
      if (type === "stop" && onEndShiftRequest) {
        onEndShiftRequest(currentDayIndex);
        return;
      }
      const warning = getBreakWarning(type);
      if (warning && !window.confirm(`⚠️ ${warning}\n\nLog work anyway?`)) return;
      onLogEvent(currentDayIndex, type);
      return;
    }

    setPendingType(type);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(clearPending, CONFIRM_RESET_MS);
  };

  const barContent = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-base min-w-0">
        {leadingIcon != null && (
          <span className="flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0" aria-hidden>
            {leadingIcon}
          </span>
        )}
        <span className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold shrink-0">Today</span>
        <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums shrink-0">
          <span className="hidden sm:inline">{currentDayLabel}</span>
          <span className="sm:hidden">{currentDayLabelShort}</span>
        </span>
        {currentType && (
          <span className="text-slate-500 dark:text-slate-400 shrink-0">
            <span className="hidden sm:inline">— current activity: </span>
            <span className="sm:hidden">· </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{currentType}</span>
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex items-center gap-3 shrink-0">
          {(() => {
            const nextWorkBreak = getNextWorkBreakType(currentType);
            const isPending = pendingType === nextWorkBreak;
            const theme = ACTIVITY_THEME[nextWorkBreak];
            const isStartingShift = nextWorkBreak === "work" && (currentType === null || currentType === "stop");
            const primaryLabel = isStartingShift ? "Start shift" : EVENT_LABELS[nextWorkBreak];
            return (
              <button
                type="button"
                onClick={() => handleLog(nextWorkBreak)}
                className={`flex items-center justify-center gap-4 px-10 py-5 rounded-2xl text-white text-lg font-bold transition-all duration-150 active:scale-95 shadow-lg min-h-[64px] min-w-[180px] shrink-0 ${theme.button} ${isPending ? "ring-2 ring-white ring-offset-2 ring-offset-slate-200 dark:ring-offset-slate-800 animate-pulse" : ""}`}
              >
                {React.createElement(EVENT_ICONS[nextWorkBreak], { className: "w-8 h-8" })}
                {isPending ? "Tap again to log" : primaryLabel}
              </button>
            );
          })()}
          {(() => {
            const type = "stop";
            const isPending = pendingType === type;
            const isDisabled = currentType === type;
            const theme = ACTIVITY_THEME[type];
            const buttonColors = isPending
              ? "bg-red-500 hover:bg-red-600 disabled:bg-red-300"
              : theme.button;
            return (
              <button
                type="button"
                onClick={() => handleLog(type)}
                disabled={isDisabled}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-bold transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0 ${buttonColors} ${isPending ? "ring-2 ring-white ring-offset-2 ring-offset-slate-200 dark:ring-offset-slate-800 animate-pulse" : ""}`}
              >
                {React.createElement(EVENT_ICONS[type], { className: "w-4 h-4" })}
                {isPending ? "Tap again to end shift" : EVENT_LABELS[type]}
              </button>
            );
          })()}
        </div>
      </div>

      {contextualBar && (
        <div className="pt-1">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {contextualBar.type === "work" && "WORK — BREAK DUE BEFORE 5H"}
              {contextualBar.type === "break" && "Break — 20 min"}
            </span>
            <span className="text-xs font-mono text-slate-600 dark:text-slate-300 tabular-nums">
              {formatCountdown(contextualBar.elapsed)} / {contextualBar.label}
              <span className="text-slate-400 dark:text-slate-500 ml-1">→ {formatCountdown(contextualBar.remaining)} left</span>
            </span>
          </div>
          <div className="relative h-8 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="absolute inset-0 rounded-full">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                style={{ width: `${contextualBar.pct}%`, backgroundColor: contextualBar.color }}
              />
              {contextualBar.type === "work" && [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-white/60"
                  style={{ left: `${(i / 5) * 100}%` }}
                  aria-hidden
                />
              ))}
              {contextualBar.type === "break" && [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-white/60"
                  style={{ left: `${(i / 4) * 100}%` }}
                  aria-hidden
                />
              ))}
            </div>
            {contextualBar.pct > 0 && contextualBar.pct < 100 && (
              <div
                className="absolute top-1/2 w-2.5 h-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-black dark:bg-white border-2 border-slate-400 dark:border-slate-300 shadow-md pointer-events-none z-10"
                style={{ left: `${contextualBar.pct}%` }}
                title="Current progress"
                aria-hidden
              />
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* In-flow spacer so title/save row sit below the fixed bar; same structure = same height */}
      <div className="max-w-[1400px] mx-auto px-4 py-3 invisible pointer-events-none select-none flex items-start gap-3" aria-hidden>
        <div className="flex-1 min-w-0">{barContent}</div>
        <div className="w-9 h-9 shrink-0" />
      </div>
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-md px-4 py-3">
        <div className="max-w-[1400px] mx-auto flex items-start gap-3">
          <div className="flex-1 min-w-0">{barContent}</div>
          <div className="shrink-0 pt-0.5">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </>
  );
}
