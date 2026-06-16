import { NextResponse } from "next/server";
import { SurveyStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { surveyAccessFilter } from "@/lib/survey-access";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  const survey = await prisma.survey.findUnique({
    where: { slug },
    include: {
      questions: { orderBy: { order: "asc" } },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
  }

  if (survey.status === SurveyStatus.CLOSED) {
    return NextResponse.json(
      {
        error: "Umfrage geschlossen",
        closed: true,
        closedMessage:
          survey.closedMessage?.trim() ||
          "Diese Umfrage ist nicht mehr verfügbar.",
        survey: {
          title: survey.title,
          slug: survey.slug,
        },
      },
      { status: 410 }
    );
  }

  if (survey.status !== SurveyStatus.LIVE) {
    return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
  }

  const session = await getSession();
  const canEdit = session
    ? await prisma.survey.findFirst({
        where: { id: survey.id, ...surveyAccessFilter(session.userId) },
        select: { id: true },
      })
    : null;
  const previewMode = Boolean(canEdit);

  return NextResponse.json({
    previewMode,
    survey: {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      slug: survey.slug,
      thankYouTitle: survey.thankYouTitle,
      thankYouMessage: survey.thankYouMessage,
      thankYouLinkUrl: survey.thankYouLinkUrl,
      thankYouLinkLabel: survey.thankYouLinkLabel,
      questions: survey.questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options,
        required: q.required,
        showIf: q.showIf,
        maxSelections: q.maxSelections,
        order: q.order,
      })),
    },
  });
}
