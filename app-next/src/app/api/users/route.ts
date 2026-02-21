import { NextResponse } from "next/server";
import { getManagerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const manager = await getManagerSession();
  if (!manager) return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  try {
    const body = await req.json();
    const { email, name } = body;
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const trimmedEmail = email.trim().toLowerCase();
    const displayName = typeof name === "string" && name.trim() ? name.trim() : trimmedEmail.split("@")[0];
    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "manager", name: displayName },
      });
      return NextResponse.json({
        id: existing.id,
        email: existing.email,
        name: displayName,
      });
    }
    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        name: displayName,
        role: "manager",
      },
    });
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
