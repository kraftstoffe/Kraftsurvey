import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, normalizeEmail, verifyPassword } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-error";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
    if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
        { status: 400 }
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const { password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "E-Mail oder Passwort falsch" },
        { status: 401 }
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    return handleRouteError(error, "login");
  }
}
