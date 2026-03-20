"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Week starting Sunday, matching DAY_LABELS[0] === Sun */
export function startOfWeekSunday(d: Date): Date {
  const c = new Date(d);
  c.setHours(12, 0, 0, 0);
  const dow = c.getDay();
  c.setDate(c.getDate() - dow);
  return c;
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export type ManagerMonthCalendarProps = {
  viewYear: number;
  viewMonth: number;
  onViewPrev: () => void;
  onViewNext: () => void;
  /** Sunday of the week being filtered */
  weekStartingYmd: string;
  activeDayIndex: number;
  onSelectDate: (weekStartingYmd: string, dayIndex: number) => void;
};

export function ManagerMonthCalendar({
  viewYear,
  viewMonth,
  onViewPrev,
  onViewNext,
  weekStartingYmd,
  activeDayIndex,
  onSelectDate,
}: ManagerMonthCalendarProps) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(12, 0, 0, 0);
    return t;
  }, []);

  const { cells, selectedDate, activeWeekSunday } = useMemo(() => {
    const activeWeekSunday = parseYMD(weekStartingYmd);
    const selected = new Date(activeWeekSunday);
    selected.setDate(selected.getDate() + activeDayIndex);

    const first = new Date(viewYear, viewMonth, 1, 12, 0, 0, 0);
    const startPad = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: ({ day: number; date: Date } | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        date: new Date(viewYear, viewMonth, d, 12, 0, 0, 0),
      });
    }
    while (cells.length % 7 !== 0) cells.push(null);

    return { cells, selectedDate: selected, activeWeekSunday };
  }, [viewYear, viewMonth, weekStartingYmd, activeDayIndex]);

  const monthTitle = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border-2 border-violet-300/70 dark:border-violet-500/45 bg-gradient-to-br from-violet-50 via-white to-sky-50 dark:from-violet-950/50 dark:via-slate-900 dark:to-sky-950/40 p-3 sm:p-4 shadow-sm shadow-violet-200/50 dark:shadow-violet-900/20">
      <div className="flex items-center justify-between gap-2 mb-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9 rounded-full text-violet-700 hover:bg-violet-200/60 dark:text-violet-300 dark:hover:bg-violet-800/40"
          onClick={onViewPrev}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-sm font-bold tracking-tight text-violet-900 dark:text-violet-200 text-center min-w-0 px-2">
          {monthTitle}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9 rounded-full text-violet-700 hover:bg-violet-200/60 dark:text-violet-300 dark:hover:bg-violet-800/40"
          onClick={onViewNext}
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div
        className="grid grid-cols-7 gap-1 text-center"
        role="grid"
        aria-label="Select work day"
      >
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 py-1.5"
            role="columnheader"
          >
            {wd}
          </div>
        ))}

        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`empty-${i}`} className="min-h-[2.25rem] sm:min-h-[2.5rem]" />;
          }

          const { date, day } = cell;
          const weekSun = startOfWeekSunday(date);
          const inActiveWeek = sameCalendarDay(weekSun, activeWeekSunday);
          const isSelected = sameCalendarDay(date, selectedDate);
          const isToday = sameCalendarDay(date, today);

          return (
            <button
              key={toYMD(date)}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              onClick={() => {
                const sun = startOfWeekSunday(date);
                onSelectDate(toYMD(sun), date.getDay());
              }}
              className={[
                "relative min-h-[2.25rem] sm:min-h-[2.5rem] rounded-xl text-sm font-semibold transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900",
                isSelected
                  ? [
                      "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/35 scale-[1.02] z-[1]",
                      /* crisp edge on gradient in light + dark */
                      "border-2 border-white/90 dark:border-violet-100/70",
                      isToday
                        ? "ring-2 ring-amber-300/95 ring-offset-2 ring-offset-white dark:ring-amber-200/80 dark:ring-offset-slate-900"
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : inActiveWeek
                    ? "bg-violet-200/70 text-violet-950 hover:bg-violet-300/80 dark:bg-violet-500/30 dark:text-violet-50 dark:hover:bg-violet-500/45"
                    : "text-slate-800 dark:text-slate-100 hover:bg-sky-200/70 dark:hover:bg-sky-800/35",
                isToday && !isSelected
                  ? "border-2 border-amber-500/95 dark:border-amber-300/90"
                  : null,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-violet-700/80 dark:text-violet-300/90 leading-snug">
        <span className="font-semibold text-violet-800 dark:text-violet-200">Tip:</span>{" "}
        <span className="opacity-90">
          Soft violet = your selected work week; bright cell = active day (light edge). Amber border = today.
        </span>
      </p>
    </div>
  );
}
