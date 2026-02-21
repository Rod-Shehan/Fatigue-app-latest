/**
 * Week boundaries (Sunday-based). Uses local date.
 */

/** Sunday of the current week as YYYY-MM-DD (local time). */
export function getThisWeekSunday(): string {
  const today = new Date();
  const day = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - day);
  return formatDateLocal(sunday);
}

/** Sunday of the week before the given week_starting (YYYY-MM-DD). */
export function getPreviousWeekSunday(weekStarting: string): string {
  const [y, m, d] = weekStarting.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 7);
  return formatDateLocal(date);
}

/** True if weekStarting is after this week's Sunday (i.e. "next week" or later). */
export function isNextWeekOrLater(weekStarting: string): boolean {
  const thisWeek = getThisWeekSunday();
  return weekStarting > thisWeek;
}

/** YYYY-MM-DD in local time. Use for "today" and sheet-day comparisons so non-work cap is correct. */
export function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today's date as YYYY-MM-DD (local). */
export function getTodayLocalDateString(): string {
  return formatDateLocal(new Date());
}

/** Sheet day date as YYYY-MM-DD (local): week_starting + dayIndex. */
export function getSheetDayDateString(weekStarting: string, dayIndex: number): string {
  const [y, m, d] = weekStarting.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + dayIndex);
  return formatDateLocal(date);
}
