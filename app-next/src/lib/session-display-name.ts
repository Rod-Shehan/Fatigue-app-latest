import type { Session } from "next-auth";

/**
 * Display name for the logged-in user: prefers profile name, then email local-part.
 * Matches behaviour used when creating a new sheet (`new-sheet-redirect`).
 */
export function getDisplayNameFromSession(session: Session | null): string {
  const raw =
    (typeof session?.user?.name === "string" && session.user.name.trim()) ||
    (typeof session?.user?.email === "string" && session.user.email.trim()) ||
    "";
  if (!raw) return "";
  if (raw.includes("@")) return raw.split("@")[0] || "";
  return raw;
}
