import { NextResponse } from "next/server";
import { Prisma, SurveyStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { resolveSubmitFingerprint } from "@/lib/submit-fingerprint";
import { submitResponseSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ slug: string }> };

function isAnswerEmpty(value: string): boolean {
  return value.trim().length === 0;
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  const ip = getClientIp(request);
  const limit = checkRateLimit(`submit:${slug}:${ip}`, 20, 60 * 60 * 1000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

  const survey = await prisma.survey.findUnique({
    where: { slug },
    include: { questions: true },
  });

  if (!survey || survey.status !== SurveyStatus.LIVE) {
    return NextResponse.json(
      { error: "Umfrage nicht verfügbar" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const parsed = submitResponseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const { answers, fingerprint, durationMs } = parsed.data;
  const resolvedFingerprint = resolveSubmitFingerprint(
    fingerprint,
    ip,
    request.headers.get("user-agent")
  );

  const questionIds = new Set(survey.questions.map((q) => q.id));
  const requiredQuestions = survey.questions.filter((q) => q.required);
  const answeredRequired = new Set<string>();

  for (const answer of answers) {
    if (!questionIds.has(answer.questionId)) {
      return NextResponse.json({ error: "Ungültige Frage" }, { status: 400 });
    }
    if (!isAnswerEmpty(answer.value)) {
      const question = survey.questions.find((q) => q.id === answer.questionId);
      if (question?.required) {
        answeredRequired.add(answer.questionId);
      }
    }
  }

  if (answeredRequired.size < requiredQuestions.length) {
    return NextResponse.json(
      { error: "Bitte alle Pflichtfragen beantworten" },
      { status: 400 }
    );
  }

  try {
    const response = await prisma.response.create({
      data: {
        surveyId: survey.id,
        fingerprint: resolvedFingerprint,
        durationMs: durationMs ?? null,
        answers: {
          create: answers
            .filter((a) => !isAnswerEmpty(a.value))
            .map((a) => ({
              questionId: a.questionId,
              value: a.value.trim(),
            })),
        },
      },
    });

    return NextResponse.json({ ok: true, responseId: response.id }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Du hast diese Umfrage bereits ausgefüllt" },
        { status: 409 }
      );
    }
    console.error("[submit]", error);
    return NextResponse.json({ error: "Senden fehlgeschlagen" }, { status: 500 });
  }
}
