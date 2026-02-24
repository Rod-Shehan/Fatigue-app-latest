/**
 * Rolling time model: events are a single continuous timeline.
 * Days are only used to know "where" events came from (for display); rules use time only.
 */

export type RollingEvent = {
  time: string;
  type: string;
  dayIndex: number;
};

type DayWithEvents = { events?: { time: string; type: string }[] };

/**
 * Flatten all events from all days and sort by time (ascending).
 * Each event gets dayIndex so callers can still attribute to a day for display.
 */
export function getEventsInTimeOrder(days: DayWithEvents[]): RollingEvent[] {
  const withDay = days.flatMap((day, dayIndex) =>
    (day.events ?? []).map((ev) => ({ time: ev.time, type: ev.type, dayIndex }))
  );
  withDay.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  return withDay;
}

/**
 * Last "stop" (end shift) time in ms before optional cutoff, or null if none.
 */
export function getLastStopTime(events: RollingEvent[], beforeTimeMs?: number): number | null {
  const cutoff = beforeTimeMs ?? Infinity;
  let last: number | null = null;
  for (const ev of events) {
    const t = new Date(ev.time).getTime();
    if (ev.type === "stop" && t < cutoff && (last === null || t > last)) last = t;
  }
  return last;
}

/**
 * Rest (non-work) hours since the last stop event, as of asOfMs.
 * Returns null if there has never been a stop (no "last shift").
 */
export function getRestHoursSinceLastStop(events: RollingEvent[], asOfMs: number): number | null {
  const lastStop = getLastStopTime(events, asOfMs + 1);
  if (lastStop === null) return null;
  return (asOfMs - lastStop) / (3600 * 1000);
}

/** Minimum rest hours required between shifts (e.g. WA 7h). */
const DEFAULT_MIN_REST_HOURS = 7;

/**
 * Returns an insufficient-rest message if, as of asOfMs, rest since last stop is below minHours.
 * Returns null if no stop exists or rest is sufficient.
 */
export function getInsufficientRestMessage(
  events: RollingEvent[],
  asOfMs: number,
  minRestHours: number = DEFAULT_MIN_REST_HOURS
): string | null {
  const restHours = getRestHoursSinceLastStop(events, asOfMs);
  if (restHours === null) return null;
  if (restHours >= minRestHours) return null;
  return `Less than ${minRestHours} hours non-work time since last shift. Starting work may not meet rest requirements.`;
}
