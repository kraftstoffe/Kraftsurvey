import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isScaleType,
  parseOptions,
  QUESTION_TYPES,
  type QuestionType,
} from "@/lib/survey-types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id } = await context.params;

    const survey = await prisma.survey.findFirst({
      where: { id, ownerId: userId },
      include: {
        questions: { orderBy: { order: "asc" } },
        responses: {
          include: { answers: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
    }

    const totalResponses = survey.responses.length;
    const durations = survey.responses
      .map((r) => r.durationMs)
      .filter((d): d is number => d != null);
    const avgDurationMs =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

    const questionStats = survey.questions.map((question) => {
      const type = question.type as QuestionType;
      const allAnswers = survey.responses.flatMap((r) =>
        r.answers.filter((a) => a.questionId === question.id)
      );

      if (
        type === QUESTION_TYPES.SINGLE_CHOICE ||
        type === QUESTION_TYPES.MULTIPLE_CHOICE ||
        type === QUESTION_TYPES.DROPDOWN ||
        type === QUESTION_TYPES.YES_NO
      ) {
        const options = parseOptions(question.options);
        const counts: Record<string, number> = {};

        for (const opt of options) {
          counts[opt.label] = 0;
        }
        if (type === QUESTION_TYPES.YES_NO) {
          counts["Ja"] = 0;
          counts["Nein"] = 0;
        }

        for (const answer of allAnswers) {
          if (type === QUESTION_TYPES.MULTIPLE_CHOICE) {
            try {
              const values = JSON.parse(answer.value) as string[];
              for (const v of values) {
                counts[v] = (counts[v] ?? 0) + 1;
              }
            } catch {
              counts[answer.value] = (counts[answer.value] ?? 0) + 1;
            }
          } else {
            counts[answer.value] = (counts[answer.value] ?? 0) + 1;
          }
        }

        return {
          questionId: question.id,
          text: question.text,
          type,
          distribution: Object.entries(counts).map(([label, count]) => ({
            label,
            count,
            percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
          })),
        };
      }

      if (isScaleType(type)) {
        const values = allAnswers
          .map((a) => parseInt(a.value, 10))
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
        textAnswers: allAnswers.map((a) => a.value),
      };
    });

    const rows = survey.responses.map((response) => {
      const row: Record<string, string> = {
        id: response.id,
        createdAt: response.createdAt.toISOString(),
      };
      for (const answer of response.answers) {
        row[answer.questionId] = answer.value;
      }
      return row;
    });

    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        slug: survey.slug,
        status: survey.status,
      },
      stats: {
        totalResponses,
        avgDurationMs,
        completionRate: totalResponses > 0 ? 100 : 0,
        questionStats,
        rows,
        questions: survey.questions.map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type,
        })),
      },
    });
  } catch {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
}
