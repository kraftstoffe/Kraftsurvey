import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword, normalizeEmail } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-error";
import { getClientIp } from "@/lib/client-ip";
import { prismaErrorMessage } from "@/lib/prisma-errors";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { isInviteCodeValid, isRegistrationEnabled } from "@/lib/registration";
import { registerSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    if (!isRegistrationEnabled()) {
      return NextResponse.json(
        { error: "Registrierung ist derzeit deaktiviert" },
        { status: 403 }
      );
    }

    const ip = getClientIp(request);
    const limit = checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
        { status: 400 }
      );
    }

    if (!isInviteCodeValid(parsed.data.inviteCode)) {
      return NextResponse.json({ error: "Ungültiger Einladungscode" }, { status: 403 });
    }

    const email = normalizeEmail(parsed.data.email);
    const { password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "E-Mail bereits registriert" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name: name ?? null },
    });

    await createSession(user.id);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("[register]", error);
    const message = prismaErrorMessage(error);
    if (message) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return handleRouteError(error, "register");
  }
}
