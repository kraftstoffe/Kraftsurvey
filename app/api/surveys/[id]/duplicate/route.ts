import { NextResponse } from "next/server";
import { SurveyStatus } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-error";
import { parseShowIf } from "@/lib/choice-answers";
import { prisma } from "@/lib/prisma";
import { getSurveyForEditor } from "@/lib/survey-access";
import { generateSlug } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id } = await context.params;

    const source = await getSurveyForEditor(id, userId);

    if (!source) {
      return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
    }

    const copyTitle = `${source.title} (Kopie)`;
    const slug = generateSlug(copyTitle);

    const survey = await prisma.$transaction(async (tx) => {
      const created = await tx.survey.create({
        data: {
          title: copyTitle,
          description: source.description,
          slug,
          status: SurveyStatus.DRAFT,
          ownerId: userId,
          thankYouTitle: source.thankYouTitle,
          thankYouMessage: source.thankYouMessage,
          thankYouLinkUrl: source.thankYouLinkUrl,
          thankYouLinkLabel: source.thankYouLinkLabel,
          closedMessage: source.closedMessage,
        },
      });

      const questionIdMap = new Map<string, string>();

      for (const question of source.questions) {
        const copy = await tx.question.create({
          data: {
            surveyId: created.id,
            type: question.type,
            text: question.text,
            options: question.options,
            required: question.required,
            maxSelections: question.maxSelections,
            order: question.order,
            showIf: null,
          },
        });
        questionIdMap.set(question.id, copy.id);
      }

      for (const question of source.questions) {
        if (!question.showIf) continue;

        const showIf = parseShowIf(question.showIf);
        if (!showIf) continue;

        const mappedQuestionId = questionIdMap.get(showIf.questionId);
        const newQuestionId = questionIdMap.get(question.id);
        if (!mappedQuestionId || !newQuestionId) continue;

        await tx.question.update({
          where: { id: newQuestionId },
          data: {
            showIf: JSON.stringify({
              ...showIf,
              questionId: mappedQuestionId,
            }),
          },
        });
      }

      return tx.survey.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          questions: { orderBy: { order: "asc" } },
          _count: { select: { responses: true } },
        },
      });
    });

    return NextResponse.json({ survey }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "survey-duplicate");
  }
}
