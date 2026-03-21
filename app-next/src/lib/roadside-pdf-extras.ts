import type { FatigueSheet, PrismaClient } from "@prisma/client";
import type { ComplianceCheckResult } from "@/lib/api";
import { jurisdictionDisplayLabel } from "@/lib/jurisdiction";
import { computeComplianceForSheetExport } from "@/lib/sheet-export-compliance";
import {
  buildRoadsideSnapshotApiUrl,
  createRoadsideSnapshotToken,
  getPublicAppBaseUrl,
  isRoadsideSnapshotSigningAvailable,
} from "@/lib/roadside-snapshot-token";

export type RoadsidePdfExtras = {
  results: ComplianceCheckResult[];
  jurisdictionLabel: string;
  qrDataUrl?: string;
};

/**
 * Compliance snapshot for PDF + optional QR (when `ROADSIDE_QR_IN_PDF_ENABLED=true` and signing secret exists).
 */
export async function prepareRoadsidePdfExtras(
  prisma: PrismaClient,
  row: FatigueSheet,
  sheetId: string
): Promise<RoadsidePdfExtras> {
  const { results, jurisdictionCode } = await computeComplianceForSheetExport(prisma, row);
  const jurisdictionLabel = jurisdictionDisplayLabel(jurisdictionCode);
  let qrDataUrl: string | undefined;
  if (process.env.ROADSIDE_QR_IN_PDF_ENABLED === "true" && isRoadsideSnapshotSigningAvailable()) {
    const token = createRoadsideSnapshotToken(sheetId);
    if (token) {
      const url = buildRoadsideSnapshotApiUrl(getPublicAppBaseUrl(), sheetId, token);
      const QRCode = (await import("qrcode")).default;
      qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 120, errorCorrectionLevel: "M" });
    }
  }
  return { results, jurisdictionLabel, qrDataUrl };
}
