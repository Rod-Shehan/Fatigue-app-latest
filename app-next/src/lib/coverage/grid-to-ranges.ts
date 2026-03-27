import { MINUTES_PER_DAY } from "./derive-minute-coverage";

/** Legacy 48 half-hour slots → minute ranges (end capped at capAtMin). */
export function halfHourSlotsToRanges(
  slots: boolean[] | undefined,
  capAtMin: number
): { startMin: number; endMin: number }[] {
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

/** 1440 minute booleans → ranges (same coordinates as event-derived segments). */
export function minuteBooleansToRanges(
  slots: boolean[] | undefined,
  capAtMin: number
): { startMin: number; endMin: number }[] {
  if (!slots || slots.length < MINUTES_PER_DAY) return [];
  const ranges: { startMin: number; endMin: number }[] = [];
  let start: number | null = null;
  for (let i = 0; i < MINUTES_PER_DAY; i++) {
    const on = !!slots[i];
    if (on && start === null) start = i;
    if (!on && start !== null) {
      ranges.push({ startMin: start, endMin: Math.min(i, capAtMin) });
      start = null;
    }
  }
  if (start !== null) {
    ranges.push({ startMin: start, endMin: Math.min(MINUTES_PER_DAY, capAtMin) });
  }
  return ranges;
}
