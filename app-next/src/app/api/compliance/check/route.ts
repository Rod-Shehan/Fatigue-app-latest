import { NextResponse } from "next/server";
import { getSessionForSheetAccess } from "@/lib/auth";
import { runComplianceChecks } from "@/lib/compliance";
import type { ComplianceDayData } from "@/lib/compliance";

export type ComplianceCheckPayload = {
  days: ComplianceDayData[];
  driverType?: string;
  prevWeekDays?: ComplianceDayData[] | null;
  last24hBreak?: string;
  weekStarting?: string;
  prevWeekStarting?: string;
  currentDayIndex?: number;
  slotOffsetWithinToday?: number;
};

export async function POST(req: Request) {
  const access = await getSessionForSheetAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as ComplianceCheckPayload;
    const {
      days,
      driverType = "solo",
      prevWeekDays,
      last24hBreak,
      weekStarting,
      prevWeekStarting,
      currentDayIndex,
      slotOffsetWithinToday,
    } = body;
    if (!Array.isArray(days)) {
      return NextResponse.json({ error: "days must be an array" }, { status: 400 });
    }
    const results = runComplianceChecks(days, {
      driverType,
      prevWeekDays: prevWeekDays ?? null,
      last24hBreak,
      weekStarting,
      prevWeekStarting,
      currentDayIndex,
      slotOffsetWithinToday,
    });
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Compliance check failed" },
      { status: 500 }
    );
  }
}
