import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getServerSession(authOptions);
    const { id } = await params;
    const body = await _req.json();
    const { is_active } = body;
    const driver = await prisma.driver.update({
      where: { id },
      data: { isActive: is_active },
    });
    return NextResponse.json({
      id: driver.id,
      name: driver.name,
      licence_number: driver.licenceNumber,
      is_active: driver.isActive,
    });
  } catch (e) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getServerSession(authOptions);
    const { id } = await params;
    await prisma.driver.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }
}
