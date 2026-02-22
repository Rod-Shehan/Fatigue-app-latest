"use client";

import { TIME_GRID_ROWS } from "@/lib/theme";
import { getTodayLocalDateString } from "@/lib/weeks";

const TOTAL_MINUTES = 24 * 60;

/** Merge overlapping/adjacent ranges and return gaps in [0, totalMin]. */
function rangesToGaps(ranges: { startMin: number; endMin: number }[], totalMin: number): { startMin: number; endMin: number }[] {
  if (ranges.length === 0) return [{ startMin: 0, endMin: totalMin }];
  const sorted = [...ranges].sort((a, b) => a.startMin - b.startMin);
  const merged: { startMin: number; endMin: number }[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r.startMin <= last.endMin) last.endMin = Math.max(last.endMin, r.endMin);
    else merged.push({ startMin: r.startMin, endMin: r.endMin });
  }
  const gaps: { startMin: number; endMin: number }[] = [];
  let pos = 0;
  for (const r of merged) {
    if (r.startMin > pos) gaps.push({ startMin: pos, endMin: r.startMin });
    pos = Math.max(pos, r.endMin);
  }
  if (pos < totalMin) gaps.push({ startMin: pos, endMin: totalMin });
  return gaps;
}

/** Non-work is retrospective only: cap at now on the current day; no time for future days. */
function getEffectiveDayEndMinutes(dateStr: string): number {
  const today = getTodayLocalDateString();
  if (dateStr > today) return 0;
  if (dateStr < today) return 24 * 60;
  const dayStart = new Date(dateStr + "T00:00:00").getTime();
  return Math.min(24 * 60, Math.ceil((Date.now() - dayStart) / 60000));
}

/** Convert 48 half-hour slots to segment ranges (minutes), capping end at capAtMin. */
function slotsToRanges(slots: boolean[] | undefined, capAtMin: number): { startMin: number; endMin: number }[] {
  if (!slots || slots.length < 48) return [];
  const ranges: { startMin: number; endMin: number }[] = [];
  let start: number | null = null;
  for (let i = 0; i < 48; i++) {
    const slotStart = i * 30;
    const slotEnd = (i + 1) * 30;
    const on = !!slots[i];
    if (on && start === null) start = slotStart;
    if (!on && start !== null) {
      ranges.push({ startMin: start, endMin: Math.min(slotStart, capAtMin) });
      start = null;
    }
    if (on && i === 47) {
      ranges.push({ startMin: start!, endMin: Math.min(slotEnd, capAtMin) });
    }
  }
  return ranges;
}

function buildSegments(events: { time: string; type: string }[] | undefined, dateStr: string) {
  const segments: { work_time: { startMin: number; endMin: number }[]; breaks: { startMin: number; endMin: number }[]; non_work: { startMin: number; endMin: number }[] } = {
    work_time: [],
    breaks: [],
    non_work: [],
  };
  const dayStart = new Date(dateStr + "T00:00:00").getTime();
  const dayEnd = new Date(dateStr + "T23:59:59").getTime();
  const effectiveEndMin = getEffectiveDayEndMinutes(dateStr);

  if (!events?.length) {
    if (effectiveEndMin > 0) segments.non_work = [{ startMin: 0, endMin: effectiveEndMin }];
    return segments;
  }

  const workOrBreakRanges: { startMin: number; endMin: number }[] = [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.type === "stop") continue;
    const end = events[i + 1] ? new Date(events[i + 1].time).getTime() : Date.now();
    const clampedEnd = Math.min(end, dayEnd);
    const start = new Date(ev.time).getTime();
    const clampedStart = Math.max(start, dayStart);
    if (clampedStart >= clampedEnd) continue;
    let startMin = Math.floor((clampedStart - dayStart) / 60000);
    let endMin = Math.ceil((clampedEnd - dayStart) / 60000);
    endMin = Math.min(endMin, effectiveEndMin);
    if (startMin >= endMin) continue;
    if (ev.type === "work") {
      segments.work_time.push({ startMin, endMin });
      workOrBreakRanges.push({ startMin, endMin });
    } else if (ev.type === "break") {
      segments.breaks.push({ startMin, endMin });
      workOrBreakRanges.push({ startMin, endMin });
    }
  }
  if (effectiveEndMin > 0) segments.non_work = rangesToGaps(workOrBreakRanges, effectiveEndMin);
  return segments;
}

function getTotalMinutes(segs: { startMin: number; endMin: number }[]) {
  return segs.reduce((sum, s) => sum + (s.endMin - s.startMin), 0);
}

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

type DayDataGrid = {
  events?: { time: string; type: string }[];
  date?: string;
  work_time?: boolean[];
  breaks?: boolean[];
  non_work?: boolean[];
};

export default function TimeGrid({ dayData }: { dayData: DayDataGrid }) {
  const events = dayData.events || [];
  const dateStr = dayData.date || getTodayLocalDateString();
  const effectiveEndMin = getEffectiveDayEndMinutes(dateStr);

  const slotBased =
    dayData.work_time != null && dayData.breaks != null && dayData.non_work != null;
  // Prefer 1-minute boundaries from events so the grid accurately reflects the shift. Fall back to 30-min slots only when no events.
  const segments =
    events.length > 0
      ? buildSegments(events, dateStr)
      : slotBased
        ? {
            work_time: slotsToRanges(
              dayData.work_time!.map((w, i) => w && !dayData.breaks![i]),
              24 * 60
            ),
            breaks: slotsToRanges(dayData.breaks, 24 * 60),
            non_work: slotsToRanges(dayData.non_work, effectiveEndMin),
          }
        : buildSegments(events, dateStr);

  const ticks = Array.from({ length: 13 }, (_, i) => i * 2);

  return (
    <div className="select-none">
      <div className="relative h-4 mb-1" style={{ marginLeft: 72 }}>
        {ticks.map((h) => (
          <span
            key={h}
            className="absolute text-[9px] font-mono text-slate-300 dark:text-slate-500 -translate-x-1/2"
            style={{ left: `${(h / 24) * 100}%` }}
          >
            {String(h).padStart(2, "0")}
          </span>
        ))}
      </div>
      <div className="space-y-1.5">
        {TIME_GRID_ROWS.map((row) => {
          const segs = segments[row.key as keyof typeof segments];
          const totalMins = getTotalMinutes(segs);
          return (
            <div key={row.key} className="flex items-center gap-2">
              <span className="w-[68px] shrink-0 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-right">
                {row.label}
              </span>
              <div className="relative flex-1 h-5 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                {segs.map((seg, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full rounded-sm opacity-90"
                    style={{
                      left: `${(seg.startMin / TOTAL_MINUTES) * 100}%`,
                      width: `${Math.max(((seg.endMin - seg.startMin) / TOTAL_MINUTES) * 100, 0.2)}%`,
                      backgroundColor: row.color,
                    }}
                  />
                ))}
                {ticks.slice(1, -1).map((h) => (
                  <div
                    key={h}
                    className="absolute top-0 h-full border-l border-white/40 pointer-events-none"
                    style={{ left: `${(h / 24) * 100}%` }}
                  />
                ))}
              </div>
              <span className="w-14 shrink-0 text-right text-[11px] font-bold font-mono text-slate-600 dark:text-slate-300">
                {totalMins > 0 ? formatHours(totalMins) : <span className="text-slate-300 dark:text-slate-500">—</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
