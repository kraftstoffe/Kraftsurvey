import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-error";
import { normalizeEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSurveyForOwner } from "@/lib/survey-access";
import { surveyMemberSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id } = await context.params;

    const survey = await getSurveyForOwner(id, userId);
    if (!survey) {
      return NextResponse.json({ error: "Nur der Owner kann Team verwalten" }, { status: 403 });
    }

    return NextResponse.json({
      owner: survey.ownerId,
      members: survey.members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
      })),
    });
  } catch (error) {
    return handleRouteError(error, "survey-members-get");
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id } = await context.params;

    const survey = await getSurveyForOwner(id, userId);
    if (!survey) {
      return NextResponse.json({ error: "Nur der Owner kann Team verwalten" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = surveyMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
        { status: 400 }
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Einladung fehlgeschlagen — prüfe die E-Mail-Adresse" },
        { status: 400 }
      );
    }

    if (user.id === survey.ownerId) {
      return NextResponse.json({ error: "Owner ist bereits Mitglied" }, { status: 400 });
    }

    const member = await prisma.surveyMember.upsert({
      where: { surveyId_userId: { surveyId: id, userId: user.id } },
      create: { surveyId: id, userId: user.id },
      update: {},
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        member: {
          id: member.id,
          userId: member.user.id,
          email: member.user.email,
          name: member.user.name,
          role: member.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, "survey-members-post");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id } = await context.params;
    const memberUserId = new URL(request.url).searchParams.get("userId");

    if (!memberUserId) {
      return NextResponse.json({ error: "userId fehlt" }, { status: 400 });
    }

    const survey = await getSurveyForOwner(id, userId);
    if (!survey) {
      return NextResponse.json({ error: "Nur der Owner kann Team verwalten" }, { status: 403 });
    }

    await prisma.surveyMember.deleteMany({
      where: { surveyId: id, userId: memberUserId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "survey-members-delete");
  }
}
