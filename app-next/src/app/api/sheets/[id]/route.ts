import { NextResponse } from "next/server";
import { getSessionForSheetAccess, canAccessSheet, getManagerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPreviousWeekSunday, isNextWeekOrLater } from "@/lib/weeks";

function parseDays(daysJson: string): unknown[] {
  try {
    const parsed = JSON.parse(daysJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sheetToJson(row: {
  id: string;
  driverName: string;
  secondDriver: string | null;
  driverType: string;
  destination: string | null;
  last24hBreak: string | null;
  weekStarting: string;
  days: string;
  status: string;
  signature: string | null;
  signedAt: Date | null;
  createdById: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    driver_name: row.driverName,
    second_driver: row.secondDriver,
    driver_type: row.driverType,
    destination: row.destination,
    last_24h_break: row.last24hBreak,
    week_starting: row.weekStarting,
    days: parseDays(row.days),
    status: row.status,
    signature: row.signature,
    signed_at: row.signedAt?.toISOString() ?? null,
    created_by: row.createdById,
    created_date: row.createdAt.toISOString(),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await getSessionForSheetAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const sheet = await prisma.fatigueSheet.findUnique({ where: { id } });
    if (!sheet) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccessSheet(sheet, access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(sheetToJson(sheet));
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await getSessionForSheetAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const sheet = await prisma.fatigueSheet.findUnique({ where: { id } });
    if (!sheet) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccessSheet(sheet, access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const {
      driver_name,
      second_driver,
      driver_type,
      destination,
      last_24h_break,
      week_starting,
      days,
      status,
      signature,
      signed_at,
    } = body;

    if (week_starting !== undefined && isNextWeekOrLater(week_starting)) {
      const current = await prisma.fatigueSheet.findUnique({ where: { id } });
      if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const driverName = (driver_name !== undefined ? driver_name : current.driverName)?.trim() || "";
      if (!driverName || driverName === "Draft") {
        return NextResponse.json(
          { error: "Set the driver name before moving this sheet to next week." },
          { status: 400 }
        );
      }
      const previousWeekSunday = getPreviousWeekSunday(week_starting);
      const prevSheet = await prisma.fatigueSheet.findFirst({
        where: {
          driverName,
          weekStarting: previousWeekSunday,
        },
      });
      if (!prevSheet || prevSheet.status !== "completed") {
        return NextResponse.json(
          {
            error: `Complete and sign the sheet for the week of ${previousWeekSunday} before starting the next week.`,
            code: "PREVIOUS_WEEK_INCOMPLETE",
            week_starting: previousWeekSunday,
            sheet_id: prevSheet?.id,
          },
          { status: 400 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (driver_name !== undefined) data.driverName = driver_name;
    if (second_driver !== undefined) data.secondDriver = second_driver;
    if (driver_type !== undefined) data.driverType = driver_type;
    if (destination !== undefined) data.destination = destination;
    if (last_24h_break !== undefined) data.last24hBreak = last_24h_break || null;
    if (week_starting !== undefined) data.weekStarting = week_starting;
    if (days !== undefined) data.days = JSON.stringify(days);
    if (status !== undefined) data.status = status;
    if (signature !== undefined) data.signature = signature;
    if (signed_at !== undefined) data.signedAt = signed_at ? new Date(signed_at) : null;
    const updated = await prisma.fatigueSheet.update({
      where: { id },
      data: data as Parameters<typeof prisma.fatigueSheet.update>[0]["data"],
    });
    return NextResponse.json(sheetToJson(updated));
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const manager = await getManagerSession();
    if (!manager) return NextResponse.json({ error: "Manager access required" }, { status: 403 });
    const { id } = await params;
    await prisma.fatigueSheet.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
