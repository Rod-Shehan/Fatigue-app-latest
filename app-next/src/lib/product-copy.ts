/**
 * Product narrative: rolling time, weekly record slices, non-work as default.
 * Used for disclaimers and driver-facing copy (not legal advice).
 */

/** One paragraph: what the app is for. */
export const PRODUCT_RECORD_PROMISE =
  "Circadia keeps a weekly fatigue record automatically. Time is classified as work, break, or non-work; " +
  "if you do not log work or a break, the rest of that period is non-work—like blank days on a paper work diary. " +
  "Each week is a slice of that timeline for you to review and sign when required.";

/** Short line under major headings (e.g. Your Sheets). */
export const SHEETS_LIST_TAGLINE =
  "Your weekly record exists for compliance whether or not you logged a shift—non-work still counts.";

/** Bullets: how weeks appear to the driver in the UI. */
export const USER_VISIBLE_SHEET_STATE_BULLETS = [
  "Current regulatory week — the slice you usually open to log from now.",
  "Past weeks — history; may need your signature before you log new work after time away.",
  "Signed weeks — you have attested that slice of the record; manager acceptance is separate.",
] as const;

/** Opening / first-run style disclaimer (can be shown once or always in compact form). */
export const OPENING_DISCLAIMER_COMPACT =
  "No log does not mean no record: unlogged time in the diary is treated as non-work for display and rolling checks, unless events show otherwise.";

/** Future: block logging work at NOW until past unsigned weeks are signed (copy only). */
export const UNSIGNED_WEEKS_GATE_HINT =
  "You may need to sign past weekly records before starting a new shift entry.";

/** Driver-facing message when work logging is blocked due to unsigned past weeks. */
export function formatUnsignedPastWeeksBlockMessage(count: number): string {
  if (count <= 0) return "";
  return `You have ${count} past week record${count === 1 ? "" : "s"} that need your signature before you log new work. Sign each from Your Sheets, then return here.`;
}
