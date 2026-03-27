/**
 * Client-safe helper for display totals only (e.g. stat cards).
 * Same semantics as `getHours` in compliance (48 half-hour slots vs 1440 minutes).
 */
import { getHours } from "./compliance";

export function getHoursForDisplay(slots: boolean[] | undefined): number {
  return getHours(slots);
}
