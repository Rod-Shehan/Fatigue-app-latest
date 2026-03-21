import { createHmac, timingSafeEqual } from "crypto";

/** Default 14 days — link expiry for scanned QR. */
const DEFAULT_TTL_SEC = 60 * 60 * 24 * 14;

function getSecret(): string {
  return process.env.ROADSIDE_SNAPSHOT_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
}

export function isRoadsideSnapshotSigningAvailable(): boolean {
  return getSecret().length > 0;
}

export function createRoadsideSnapshotToken(sheetId: string, ttlSec = DEFAULT_TTL_SEC): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${sheetId}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ sheetId, exp, sig })).toString("base64url");
}

export function verifyRoadsideSnapshotToken(token: string): { sheetId: string; exp: number } | null {
  const secret = getSecret();
  if (!secret || !token) return null;
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as { sheetId?: string; exp?: number; sig?: string };
    if (!parsed.sheetId || typeof parsed.exp !== "number" || typeof parsed.sig !== "string") return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    const payload = `${parsed.sheetId}.${parsed.exp}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(parsed.sig, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { sheetId: parsed.sheetId, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function getPublicAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}

export function buildRoadsideSnapshotApiUrl(baseUrl: string, sheetId: string, token: string): string {
  const u = baseUrl.replace(/\/$/, "");
  return `${u}/api/sheets/${sheetId}/roadside-snapshot?t=${encodeURIComponent(token)}`;
}
