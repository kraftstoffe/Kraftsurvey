import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getSurveyForEditor, isSurveyOwner } from "@/lib/survey-access";
import {
  formatChoiceAnswerForDisplay,
  expandChoiceSelections,
} from "@/lib/choice-answers";
import {
  isChoiceType,
  isScaleType,
  isTextType,
  parseOptions,
  QUESTION_TYPES,
  type QuestionType,
} from "@/lib/survey-types";

type RouteContext = { params: Promise<{ id: string }> };

const MAX_EXPORT_ROWS = 10_000;
const MAX_TEXT_ANSWERS = 500;

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id } = await context.params;

    const survey = await getSurveyForEditor(id, userId);

    if (!survey) {
      return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
    }

    const totalResponses = await prisma.response.count({
      where: { surveyId: survey.id },
    });

    const durationAgg = await prisma.response.aggregate({
      where: { surveyId: survey.id, durationMs: { not: null } },
      _avg: { durationMs: true },
    });
    const avgDurationMs =
      durationAgg._avg.durationMs != null
        ? Math.round(durationAgg._avg.durationMs)
        : null;

    const requiredCount = survey.questions.filter((q) => q.required).length;

    let completeResponses = totalResponses;
    if (requiredCount > 0 && totalResponses > 0) {
      const completeRows = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) AS count
        FROM "Response" r
        WHERE r."surveyId" = ${survey.id}
          AND (
            SELECT COUNT(DISTINCT a."questionId")
            FROM "Answer" a
            INNER JOIN "Question" q ON q.id = a."questionId"
            WHERE a."responseId" = r.id
              AND q."required" = true
              AND TRIM(a.value) <> ''
          ) = ${requiredCount}
      `;
      completeResponses = Number(completeRows[0]?.count ?? 0);
    }

    const completionRate =
      totalResponses > 0
        ? Math.round((completeResponses / totalResponses) * 100)
        : 0;

    const answerGroups = await prisma.answer.groupBy({
      by: ["questionId", "value"],
      where: {
        question: { surveyId: survey.id },
        NOT: { value: "" },
      },
      _count: { value: true },
    });

    const answersByQuestion = new Map<string, Map<string, number>>();
    for (const row of answerGroups) {
      if (!answersByQuestion.has(row.questionId)) {
        answersByQuestion.set(row.questionId, new Map());
      }
      answersByQuestion.get(row.questionId)!.set(row.value, row._count.value);
    }

    const textQuestionIds = survey.questions
      .filter((q) => isTextType(q.type as QuestionType))
      .map((q) => q.id);

    const textAnswerRows =
      textQuestionIds.length > 0
        ? await prisma.answer.findMany({
            where: {
              questionId: { in: textQuestionIds },
              NOT: { value: "" },
            },
            select: { questionId: true, value: true },
            orderBy: { response: { createdAt: "desc" } },
            take: MAX_TEXT_ANSWERS * textQuestionIds.length,
          })
        : [];

    const textAnswersByQuestion = new Map<string, string[]>();
    for (const row of textAnswerRows) {
      const list = textAnswersByQuestion.get(row.questionId) ?? [];
      if (list.length < MAX_TEXT_ANSWERS) {
        list.push(row.value);
        textAnswersByQuestion.set(row.questionId, list);
      }
    }

    const questionStats = survey.questions.map((question) => {
      const type = question.type as QuestionType;
      const counts = answersByQuestion.get(question.id) ?? new Map<string, number>();
      const allAnswers = Array.from(counts.entries()).flatMap(([value, count]) =>
        Array.from({ length: count }, () => value)
      );

      if (
        type === QUESTION_TYPES.SINGLE_CHOICE ||
        type === QUESTION_TYPES.MULTIPLE_CHOICE ||
        type === QUESTION_TYPES.DROPDOWN ||
        type === QUESTION_TYPES.YES_NO
      ) {
        const options = parseOptions(question.options);
        const distribution: Record<string, number> = {};

        for (const opt of options) {
          distribution[opt.label] = 0;
        }
        if (type === QUESTION_TYPES.YES_NO) {
          distribution["Ja"] = 0;
          distribution["Nein"] = 0;
        }

        for (const [value, count] of counts) {
          const selections = expandChoiceSelections(value, type);
          if (selections.length > 0) {
            for (const label of selections) {
              distribution[label] = (distribution[label] ?? 0) + count;
            }
          } else if (type !== QUESTION_TYPES.MULTIPLE_CHOICE) {
            distribution[value] = (distribution[value] ?? 0) + count;
          }
        }

        return {
          questionId: question.id,
          text: question.text,
          type,
          distribution: Object.entries(distribution).map(([label, count]) => ({
            label,
            count,
            percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
          })),
        };
      }

      if (isScaleType(type)) {
        const values = allAnswers
          .map((a) => parseInt(a, 10))
          .filter((v) => !isNaN(v));
        const avg =
          values.length > 0
            ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
            : null;

        const distribution: Record<number, number> = {};
        for (const v of values) {
          distribution[v] = (distribution[v] ?? 0) + 1;
        }

        return {
          questionId: question.id,
          text: question.text,
          type,
          average: avg,
          distribution: Object.entries(distribution).map(([label, count]) => ({
            label,
            count,
          })),
        };
      }

      return {
        questionId: question.id,
        text: question.text,
        type,
        textAnswers: textAnswersByQuestion.get(question.id) ?? [],
      };
    });

    const responses = await prisma.response.findMany({
      where: { surveyId: survey.id },
      include: { answers: { select: { questionId: true, value: true } } },
      orderBy: { createdAt: "desc" },
      take: MAX_EXPORT_ROWS,
    });

    const rows = responses.map((response) => {
      const row: Record<string, string> = {
        id: response.id,
        createdAt: response.createdAt.toISOString(),
      };
      for (const answer of response.answers) {
        const q = survey.questions.find((item) => item.id === answer.questionId);
        if (q && isChoiceType(q.type as QuestionType)) {
          row[answer.questionId] = formatChoiceAnswerForDisplay(
            answer.value,
            q.type as QuestionType,
            parseOptions(q.options)
          );
        } else {
          row[answer.questionId] = answer.value;
        }
      }
      return row;
    });

    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        slug: survey.slug,
        status: survey.status,
        isOwner: isSurveyOwner(survey, userId),
      },
      stats: {
        totalResponses,
        avgDurationMs,
        completionRate,
        questionStats,
        rows,
        questions: survey.questions.map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type,
        })),
        rowsTruncated: totalResponses > MAX_EXPORT_ROWS,
      },
    });
  } catch (error) {
    return handleRouteError(error, "survey-stats");
  }
}
