import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRoadsideSnapshotToken } from "@/lib/roadside-snapshot-token";
import { computeComplianceForSheetExport } from "@/lib/sheet-export-compliance";
import { jurisdictionDisplayLabel } from "@/lib/jurisdiction";
import { ROADSIDE_PDF_DISCLAIMER } from "@/lib/roadside-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only compliance snapshot for roadside / QR (no session — token required).
 * Token: `createRoadsideSnapshotToken` signed with ROADSIDE_SNAPSHOT_SECRET or NEXTAUTH_SECRET.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const t = new URL(req.url).searchParams.get("t") ?? "";
    const verified = verifyRoadsideSnapshotToken(t);
    if (!verified || verified.sheetId !== id) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }
    const row = await prisma.fatigueSheet.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { results, jurisdictionCode } = await computeComplianceForSheetExport(prisma, row);
    const violations = results.filter((r) => r.type === "violation");
    const warnings = results.filter((r) => r.type === "warning");

    return NextResponse.json(
      {
        driver_name: row.driverName,
        week_starting: row.weekStarting,
        driver_type: row.driverType,
        fatigue_rules: jurisdictionDisplayLabel(jurisdictionCode),
        violations: violations.map((v) => ({ day: v.day, message: v.message })),
        warnings: warnings.map((w) => ({ day: w.day, message: w.message })),
        disclaimer: ROADSIDE_PDF_DISCLAIMER,
        link_expires_at: new Date(verified.exp * 1000).toISOString(),
        generated_at: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (e) {
    console.error("roadside-snapshot:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
