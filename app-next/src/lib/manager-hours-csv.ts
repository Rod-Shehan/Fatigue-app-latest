/**
 * Manager "small business export": CSV of per-day work / break / non-work minutes from sheet data.
 * Uses the same slot and event rules as the driver UI (local calendar day boundaries for events).
 * Not payroll, tax, or award advice — raw operational data only.
 */

import type { DayData, FatigueSheet } from "@/lib/api";
import { getSheetDayDateString, sheetWeeksOverlap } from "@/lib/weeks";

const TOTAL_MIN = 24 * 60;
const MIN_BREAK_BLOCK_MINUTES = 10;

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

function rangesToGaps(
  ranges: { startMin: number; endMin: number }[],
  totalMin: number
): { startMin: number; endMin: number }[] {
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

function localDayStartMs(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function localDayEndMs(ymd: string): number {
  return localDayStartMs(ymd) + 24 * 60 * 60 * 1000 - 1;
}

function getEffectiveEndMin(dateStr: string, todayStr: string): number {
  if (dateStr > todayStr) return 0;
  if (dateStr < todayStr) return TOTAL_MIN;
  const n = new Date();
  return Math.min(TOTAL_MIN, n.getHours() * 60 + n.getMinutes());
}

function sumSegMinutes(segs: { startMin: number; endMin: number }[]): number {
  return segs.reduce((sum, s) => sum + (s.endMin - s.startMin), 0);
}

function buildSegmentsFromEvents(
  events: { time: string; type: string }[] | undefined,
  dateStr: string,
  effectiveEndMin: number
): {
  work_time: { startMin: number; endMin: number }[];
  breaks: { startMin: number; endMin: number }[];
  non_work: { startMin: number; endMin: number }[];
} {
  const segments = {
    work_time: [] as { startMin: number; endMin: number }[],
    breaks: [] as { startMin: number; endMin: number }[],
    non_work: [] as { startMin: number; endMin: number }[],
  };
  const dayStart = localDayStartMs(dateStr);
  const dayEnd = localDayEndMs(dateStr);
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
    const startMin = Math.floor((clampedStart - dayStart) / 60000);
    const endMin = Math.min(effectiveEndMin, Math.ceil((clampedEnd - dayStart) / 60000));
    if (startMin >= endMin) continue;
    const durationMinutes = endMin - startMin;
    const treatBreakAsWork = ev.type === "break" && durationMinutes < MIN_BREAK_BLOCK_MINUTES;
    if (ev.type === "work" || treatBreakAsWork) {
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

function getDaySegments(
  day: DayData,
  dateStr: string,
  todayStr: string
): {
  work_time: { startMin: number; endMin: number }[];
  breaks: { startMin: number; endMin: number }[];
  non_work: { startMin: number; endMin: number }[];
} {
  const effectiveEndMin = getEffectiveEndMin(dateStr, todayStr);
  const events = day?.events || [];
  const slotBased = day?.work_time != null && day?.breaks != null && day?.non_work != null;
  if (events.length > 0) {
    return buildSegmentsFromEvents(events, dateStr, effectiveEndMin);
  }
  if (slotBased) {
    return {
      work_time: slotsToRanges(day.work_time!.map((w, i) => w && !day.breaks![i]), TOTAL_MIN),
      breaks: slotsToRanges(day.breaks, TOTAL_MIN),
      non_work: slotsToRanges(day.non_work, effectiveEndMin),
    };
  }
  return buildSegmentsFromEvents(undefined, dateStr, effectiveEndMin);
}

function escapeCsvCell(value: string): string {
  if (/[,"\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * Build CSV text for sheets whose week overlaps `weekStarting` (or all sheets if weekStarting is null/empty).
 */
export function buildManagerHoursCsv(
  sheets: FatigueSheet[],
  weekStarting: string | null | undefined,
  todayYmd: string
): string {
  const list =
    weekStarting?.trim() ?
      sheets.filter((s) => s.week_starting && sheetWeeksOverlap(s.week_starting, weekStarting.trim()))
    : [...sheets];

  const header = [
    "sheet_id",
    "driver_name",
    "second_driver",
    "week_starting",
    "calendar_date",
    "day_index",
    "work_minutes",
    "break_minutes",
    "non_work_minutes",
    "truck_rego",
    "destination",
    "sheet_status",
  ];

  const lines: string[] = [header.map(escapeCsvCell).join(",")];

  for (const sheet of list) {
    const days = Array.isArray(sheet.days) ? sheet.days : [];
    const ws = sheet.week_starting || "";
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const day = days[dayIndex] ?? {};
      const calendarDate = ws ? getSheetDayDateString(ws, dayIndex) : "";
      const segs = getDaySegments(day, calendarDate, todayYmd);
      const row = [
        sheet.id,
        sheet.driver_name ?? "",
        sheet.second_driver ?? "",
        ws,
        calendarDate,
        String(dayIndex),
        String(sumSegMinutes(segs.work_time)),
        String(sumSegMinutes(segs.breaks)),
        String(sumSegMinutes(segs.non_work)),
        (day.truck_rego ?? "").trim(),
        (day.destination ?? "").trim(),
        sheet.status ?? "",
      ];
      lines.push(row.map((c) => escapeCsvCell(String(c))).join(","));
    }
  }

  return lines.join("\r\n");
}

export function downloadManagerHoursCsv(filename: string, csv: string): void {
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
