import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type DayRow = {
  truck_rego?: string;
  start_kms?: number | null;
  end_kms?: number | null;
};

/**
 * GET /api/rego-kms?rego=XXX
 * Returns the maximum end_kms ever recorded for this rego across all sheets (all drivers).
 * Used to validate that new start/end km entries are never lower than previous.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rego = searchParams.get("rego")?.trim();
  if (!rego) {
    return NextResponse.json({ error: "Missing rego" }, { status: 400 });
  }

  try {
    const sheets = await prisma.fatigueSheet.findMany({
      select: { days: true },
    });

    let maxEndKms: number | null = null;

    for (const sheet of sheets) {
      const days = JSON.parse(sheet.days) as DayRow[];
      if (!Array.isArray(days)) continue;
      for (const day of days) {
        const dayRego = (day.truck_rego ?? "").trim();
        if (dayRego.toLowerCase() !== rego.toLowerCase()) continue;
        const end = day.end_kms;
        if (end != null && typeof end === "number" && !Number.isNaN(end)) {
          if (maxEndKms === null || end > maxEndKms) maxEndKms = end;
        }
      }
    }

    return NextResponse.json({ maxEndKms });
  } catch (e) {
    console.error("rego-kms", e);
    return NextResponse.json({ error: "Failed to get rego kms" }, { status: 500 });
  }
}
