import { NextResponse } from "next/server";
import { getSessionForSheetAccess, canAccessSheet, getManagerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const manager = await getManagerSession();
    if (!manager) {
      return NextResponse.json({ error: "Manager access required" }, { status: 403 });
    }

    const rows = await prisma.auditEvent.findMany({
      where: { sheetId: id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        action: true,
        payload: true,
        createdAt: true,
        actor: { select: { email: true, name: true, role: true } },
      },
    });
    return NextResponse.json({
      events: rows.map((r) => ({
        id: r.id,
        action: r.action,
        payload: r.payload,
        created_at: r.createdAt.toISOString(),
        actor: r.actor,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

