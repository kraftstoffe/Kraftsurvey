import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitResponseSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  const survey = await prisma.survey.findUnique({
    where: { slug },
    include: { questions: true },
  });

  if (!survey || survey.status !== "LIVE") {
    return NextResponse.json(
      { error: "Umfrage nicht verfügbar" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const parsed = submitResponseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const { answers, fingerprint, durationMs } = parsed.data;

  if (fingerprint) {
    const existing = await prisma.response.findFirst({
      where: { surveyId: survey.id, fingerprint },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Du hast diese Umfrage bereits ausgefüllt" },
        { status: 409 }
      );
    }
  }

  const questionIds = new Set(survey.questions.map((q) => q.id));
  const requiredIds = new Set(
    survey.questions.filter((q) => q.required).map((q) => q.id)
  );

  for (const answer of answers) {
    if (!questionIds.has(answer.questionId)) {
      return NextResponse.json({ error: "Ungültige Frage" }, { status: 400 });
    }
    requiredIds.delete(answer.questionId);
  }

  if (requiredIds.size > 0) {
    return NextResponse.json(
      { error: "Bitte alle Pflichtfragen beantworten" },
      { status: 400 }
    );
  }

  const response = await prisma.response.create({
    data: {
      surveyId: survey.id,
      fingerprint: fingerprint ?? null,
      durationMs: durationMs ?? null,
      answers: {
        create: answers.map((a) => ({
          questionId: a.questionId,
          value: a.value,
        })),
      },
    },
  });

  return NextResponse.json({ ok: true, responseId: response.id }, { status: 201 });
}
