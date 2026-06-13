import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json({ user });
}
