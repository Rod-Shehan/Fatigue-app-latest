import { NextResponse } from "next/server";

// Public connectivity probe used for reliable online/offline detection.
export async function GET() {
  return new NextResponse(null, { status: 204 });
}

export async function HEAD() {
  return new NextResponse(null, { status: 204 });
}

