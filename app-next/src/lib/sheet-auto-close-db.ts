import { prisma } from "@/lib/prisma";
import { getThisWeekSunday } from "@/lib/weeks";
import { sheetEligibleForAutoClosePastWeek } from "@/lib/sheet-auto-close";

function parseDaysJson(daysJson: string): unknown[] {
  try {
    const parsed = JSON.parse(daysJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Marks eligible past-week drafts as completed (no signature) so they no longer block
 * “one draft at a time” or next-week creation. Idempotent.
 */
export async function autoCloseStaleDraftSheetsForUser(userId: string): Promise<number> {
  const thisSunday = getThisWeekSunday();
  const drafts = await prisma.fatigueSheet.findMany({
    where: {
      createdById: userId,
      status: { not: "completed" },
      weekStarting: { lt: thisSunday },
    },
    select: { id: true, weekStarting: true, days: true },
  });

  let n = 0;
  for (const row of drafts) {
    const days = parseDaysJson(row.days);
    if (!sheetEligibleForAutoClosePastWeek(row.weekStarting, days)) continue;

    await prisma.fatigueSheet.update({
      where: { id: row.id },
      data: {
        status: "completed",
        signature: null,
        signedAt: null,
      },
    });
    await prisma.auditEvent.create({
      data: {
        sheetId: row.id,
        actorId: userId,
        action: "auto_close_past_week",
        payload: {
          week_starting: row.weekStarting,
          reason: "past_week_no_live_shift",
        },
      },
    });
    n++;
  }
  return n;
}
