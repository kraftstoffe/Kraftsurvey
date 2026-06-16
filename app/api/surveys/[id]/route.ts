import { NextResponse } from "next/server";
import { SurveyStatus } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import {
  getSurveyForEditor,
  isSurveyOwner,
} from "@/lib/survey-access";
import { surveySchema, surveySettingsSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_STATUSES = new Set<string>(Object.values(SurveyStatus));

function normalizeLinkUrl(url: string | null | undefined): string | null {
  if (!url || url.trim() === "") return null;
  return url.trim();
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id } = await context.params;
    const survey = await getSurveyForEditor(id, userId);

    if (!survey) {
      return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({
      survey: {
        ...survey,
        isOwner: isSurveyOwner(survey, userId),
      },
    });
  } catch (error) {
    return handleRouteError(error, "survey-get");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id } = await context.params;
    const body = await request.json();

    const survey = await getSurveyForEditor(id, userId);
    if (!survey) {
      return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
    }

    const parsed = surveySettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.status !== undefined && !isSurveyOwner(survey, userId)) {
      return NextResponse.json(
        { error: "Nur der Owner kann den Status ändern" },
        { status: 403 }
      );
    }

    if (data.status !== undefined) {
      if (!VALID_STATUSES.has(data.status)) {
        return NextResponse.json({ error: "Ungültiger Status" }, { status: 400 });
      }
      if (data.status === SurveyStatus.LIVE && survey.questions.length === 0) {
        return NextResponse.json(
          { error: "Mindestens eine Frage erforderlich" },
          { status: 400 }
        );
      }
    }

    if (data.title !== undefined || data.description !== undefined) {
      const meta = surveySchema.safeParse({
        title: data.title ?? survey.title,
        description: data.description ?? survey.description ?? undefined,
      });
      if (!meta.success) {
        return NextResponse.json(
          { error: meta.error.issues[0]?.message ?? "Ungültige Eingabe" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.survey.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.thankYouTitle !== undefined && { thankYouTitle: data.thankYouTitle }),
        ...(data.thankYouMessage !== undefined && { thankYouMessage: data.thankYouMessage }),
        ...(data.thankYouLinkUrl !== undefined && {
          thankYouLinkUrl: normalizeLinkUrl(data.thankYouLinkUrl),
        }),
        ...(data.thankYouLinkLabel !== undefined && { thankYouLinkLabel: data.thankYouLinkLabel }),
        ...(data.closedMessage !== undefined && { closedMessage: data.closedMessage }),
        ...(data.status !== undefined && { status: data.status as SurveyStatus }),
      },
      include: {
        questions: { orderBy: { order: "asc" } },
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
        _count: { select: { responses: true } },
      },
    });

    return NextResponse.json({
      survey: { ...updated, isOwner: isSurveyOwner(updated, userId) },
    });
  } catch (error) {
    return handleRouteError(error, "survey-patch");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id } = await context.params;

    const survey = await getSurveyForEditor(id, userId);
    if (!survey || !isSurveyOwner(survey, userId)) {
      return NextResponse.json({ error: "Nur der Owner kann löschen" }, { status: 403 });
    }

    await prisma.survey.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "survey-delete");
  }
}
