/**
 * Client-safe helper for display totals only (e.g. stat cards).
 * Compliance rule logic lives server-side in /api/compliance/check.
 */
export function getHoursForDisplay(slots: boolean[] | undefined): number {
  return (slots || []).filter(Boolean).length * 0.5;
}
