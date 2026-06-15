import { NextResponse } from "next/server";
import { Prisma, SurveyStatus } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { surveySchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_STATUSES = new Set<string>(Object.values(SurveyStatus));

async function getOwnedSurvey(id: string, userId: string) {
  return prisma.survey.findFirst({
    where: { id, ownerId: userId },
    include: {
      questions: { orderBy: { order: "asc" } },
      _count: { select: { responses: true } },
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id } = await context.params;
    const survey = await getOwnedSurvey(id, userId);

    if (!survey) {
      return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ survey });
  } catch (error) {
    return handleRouteError(error, "survey-get");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id } = await context.params;
    const body = await request.json();

    const survey = await getOwnedSurvey(id, userId);
    if (!survey) {
      return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json({ error: "Ungültiger Status" }, { status: 400 });
      }
      if (body.status === SurveyStatus.LIVE && survey.questions.length === 0) {
        return NextResponse.json(
          { error: "Mindestens eine Frage erforderlich" },
          { status: 400 }
        );
      }
    }

    if (body.title !== undefined || body.description !== undefined) {
      const parsed = surveySchema.safeParse({
        title: body.title ?? survey.title,
        description: body.description ?? survey.description ?? undefined,
      });
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.survey.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status as SurveyStatus }),
      },
      include: {
        questions: { orderBy: { order: "asc" } },
        _count: { select: { responses: true } },
      },
    });

    return NextResponse.json({ survey: updated });
  } catch (error) {
    return handleRouteError(error, "survey-patch");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id } = await context.params;

    const survey = await getOwnedSurvey(id, userId);
    if (!survey) {
      return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
    }

    await prisma.survey.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "survey-delete");
  }
}
