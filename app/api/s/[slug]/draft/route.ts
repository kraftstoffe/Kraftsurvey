import { NextResponse } from "next/server";
import { SurveyStatus } from "@prisma/client";
import { handleRouteError } from "@/lib/api-error";
import { getClientIp } from "@/lib/client-ip";
import {
  createDraftToken,
  draftExpiresAt,
  hashDraftToken,
} from "@/lib/draft-token";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  surveyDraftLoadSchema,
  surveyDraftSchema,
} from "@/lib/validations";

type RouteContext = { params: Promise<{ slug: string }> };

async function getLiveSurvey(slug: string) {
  return prisma.survey.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });
}

async function cleanupExpiredDrafts(surveyId: string) {
  await prisma.surveyDraft.deleteMany({
    where: { surveyId, expiresAt: { lt: new Date() } },
  });
}

function parseDraftAnswers(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const ip = getClientIp(request);
    const limit = checkRateLimit(`draft:${slug}:${ip}`, 60, 60 * 60 * 1000);
    if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

    const survey = await getLiveSurvey(slug);
    if (!survey || survey.status !== SurveyStatus.LIVE) {
      return NextResponse.json({ error: "Umfrage nicht verfügbar" }, { status: 404 });
    }

    const body = await request.json();

    if (body?.load === true) {
      const loadParsed = surveyDraftLoadSchema.safeParse(body);
      if (!loadParsed.success) {
        return NextResponse.json(
          { error: loadParsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
          { status: 400 }
        );
      }

      const draft = await prisma.surveyDraft.findFirst({
        where: {
          surveyId: survey.id,
          tokenHash: hashDraftToken(loadParsed.data.token),
          expiresAt: { gt: new Date() },
        },
      });

      if (!draft) {
        return NextResponse.json(
          { error: "Entwurf nicht gefunden oder abgelaufen" },
          { status: 404 }
        );
      }

      const answers = parseDraftAnswers(draft.answers);
      if (!answers) {
        await prisma.surveyDraft.delete({ where: { id: draft.id } });
        return NextResponse.json({ error: "Entwurf beschädigt" }, { status: 500 });
      }

      return NextResponse.json({
        answers,
        step: draft.step,
        phase: draft.phase === "review" ? "review" : "questions",
        expiresAt: draft.expiresAt.toISOString(),
      });
    }

    const parsed = surveyDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
        { status: 400 }
      );
    }

    await cleanupExpiredDrafts(survey.id);

    const { token: existingToken, answers, step, fingerprint } = parsed.data;
    const phase = parsed.data.phase ?? "questions";
    const answersJson = JSON.stringify(answers);
    const expiresAt = draftExpiresAt();

    if (existingToken) {
      const tokenHash = hashDraftToken(existingToken);
      const draft = await prisma.surveyDraft.findFirst({
        where: { surveyId: survey.id, tokenHash, expiresAt: { gt: new Date() } },
      });

      if (draft) {
        await prisma.surveyDraft.update({
          where: { id: draft.id },
          data: {
            answers: answersJson,
            step,
            phase,
            fingerprint: fingerprint ?? draft.fingerprint,
            expiresAt,
          },
        });
        return NextResponse.json({ token: existingToken, expiresAt: expiresAt.toISOString() });
      }
    }

    const token = createDraftToken();
    await prisma.surveyDraft.create({
      data: {
        surveyId: survey.id,
        tokenHash: hashDraftToken(token),
        fingerprint: fingerprint ?? null,
        answers: answersJson,
        step,
        phase,
        expiresAt,
      },
    });

    return NextResponse.json({ token, expiresAt: expiresAt.toISOString() }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "survey-draft-post");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const ip = getClientIp(request);
    const limit = checkRateLimit(`draft-del:${slug}:${ip}`, 30, 60 * 60 * 1000);
    if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

    let token: string | null = null;
    try {
      const body = await request.json();
      if (body?.token && typeof body.token === "string") token = body.token;
    } catch {
      token = new URL(request.url).searchParams.get("token");
    }

    if (!token) {
      return NextResponse.json({ error: "Token fehlt" }, { status: 400 });
    }

    const survey = await getLiveSurvey(slug);
    if (!survey) {
      return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
    }

    await prisma.surveyDraft.deleteMany({
      where: { surveyId: survey.id, tokenHash: hashDraftToken(token) },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "survey-draft-delete");
  }
}
