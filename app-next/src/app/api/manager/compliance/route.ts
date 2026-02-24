import { NextResponse } from "next/server";
import { getManagerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runComplianceChecks } from "@/lib/compliance";
import type { ComplianceDayData } from "@/lib/compliance";
import type { ComplianceCheckResult } from "@/lib/api";
import { getPreviousWeekSunday } from "@/lib/weeks";

function parseDays(daysJson: string): ComplianceDayData[] {
  try {
    const parsed = JSON.parse(daysJson);
    return Array.isArray(parsed) ? (parsed as ComplianceDayData[]) : [];
  } catch {
    return [];
  }
}

export type ManagerComplianceItem = {
  sheetId: string;
  driver_name: string;
  week_starting: string;
  results: ComplianceCheckResult[];
};

/**
 * GET /api/manager/compliance
 * Returns all warnings and violations for every sheet the manager can see (all drivers).
 * Manager-only.
 */
export async function GET() {
  const manager = await getManagerSession();
  if (!manager) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const sheets = await prisma.fatigueSheet.findMany({
      where: {},
      orderBy: [{ weekStarting: "desc" }, { createdAt: "desc" }],
      take: 100,
    });

    const byDriverWeek = new Map<string, (typeof sheets)[0]>();
    for (const s of sheets) {
      byDriverWeek.set(`${s.driverName}|${s.weekStarting}`, s);
    }

    const items: ManagerComplianceItem[] = [];
    for (const sheet of sheets) {
      const prevWeekStarting = getPreviousWeekSunday(sheet.weekStarting);
      const prevSheet = byDriverWeek.get(`${sheet.driverName}|${prevWeekStarting}`) ?? null;
      const days = parseDays(sheet.days);
      const prevWeekDays = prevSheet ? parseDays(prevSheet.days) : null;

      const results = runComplianceChecks(days, {
        driverType: sheet.driverType ?? "solo",
        prevWeekDays,
        last24hBreak: sheet.last24hBreak ?? undefined,
        weekStarting: sheet.weekStarting,
        prevWeekStarting: prevSheet?.weekStarting ?? undefined,
      });

      items.push({
        sheetId: sheet.id,
        driver_name: sheet.driverName,
        week_starting: sheet.weekStarting,
        results,
      });
    }

    return NextResponse.json({ items });
  } catch (e) {
    console.error("Manager compliance error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
