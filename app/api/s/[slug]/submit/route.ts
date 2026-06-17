import { NextResponse } from "next/server";
import { Prisma, SurveyStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/client-ip";
import { getVisibleQuestions, parseChoiceAnswer, serializeChoiceAnswer } from "@/lib/choice-answers";
import { hashDraftToken } from "@/lib/draft-token";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { resolveSubmitFingerprint } from "@/lib/submit-fingerprint";
import { surveyAccessFilter } from "@/lib/survey-access";
import { isChoiceType, type QuestionType } from "@/lib/survey-types";
import { validateSubmitAnswers } from "@/lib/survey-validation";
import { submitResponseSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  const ip = getClientIp(request);
  const limit = checkRateLimit(`submit:${slug}:${ip}`, 20, 60 * 60 * 1000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

  const survey = await prisma.survey.findUnique({
    where: { slug },
    include: { questions: { orderBy: { order: "asc" } } },
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

  const { answers, fingerprint, durationMs, draftToken } = parsed.data;
  const session = await getSession();
  const isEditor =
    session &&
    (await prisma.survey.findFirst({
      where: { id: survey.id, ...surveyAccessFilter(session.userId) },
      select: { id: true },
    }));

  if (isEditor) {
    return NextResponse.json({ ok: true, preview: true }, { status: 201 });
  }

  const resolvedFingerprint = resolveSubmitFingerprint(
    fingerprint,
    ip,
    request.headers.get("user-agent")
  );

  const questionsForValidation = survey.questions.map((q) => ({
    id: q.id,
    type: q.type,
    options: q.options,
    showIf: q.showIf,
    required: q.required,
    maxSelections: q.maxSelections,
  }));

  const validationError = validateSubmitAnswers(questionsForValidation, answers);
  if (validationError) {
    return NextResponse.json(
      { error: validationError.message, questionId: validationError.questionId },
      { status: 400 }
    );
  }

  const answersMap = Object.fromEntries(answers.map((a) => [a.questionId, a.value]));
  const questionsForVisibility = survey.questions.map((q) => ({
    id: q.id,
    type: q.type,
    options: q.options,
    showIf: q.showIf,
  }));
  const visibleQuestions = getVisibleQuestions(questionsForVisibility, answersMap);

  const createAnswers = visibleQuestions
    .map((q) => {
      const raw = answersMap[q.id];
      if (raw === undefined) return null;

      const type = q.type as QuestionType;
      let value = raw.trim();
      if (!value || value === "[]") return null;

      if (isChoiceType(type)) {
        value = serializeChoiceAnswer(parseChoiceAnswer(raw, type));
        if (!value) return null;
      }

      return {
        questionId: q.id,
        value,
      };
    })
    .filter((a): a is { questionId: string; value: string } => a !== null);

  try {
    const response = await prisma.response.create({
      data: {
        surveyId: survey.id,
        fingerprint: resolvedFingerprint,
        durationMs: durationMs ?? null,
        answers: { create: createAnswers },
      },
    });

    if (draftToken) {
      await prisma.surveyDraft.deleteMany({
        where: { surveyId: survey.id, tokenHash: hashDraftToken(draftToken) },
      });
    }

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
