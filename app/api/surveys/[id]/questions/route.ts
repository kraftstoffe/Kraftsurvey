import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getSurveyForEditor } from "@/lib/survey-access";
import { validateQuestionOrder } from "@/lib/show-if-order";
import { questionSchema, questionReorderSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

async function verifyAccess(surveyId: string, userId: string) {
  return getSurveyForEditor(surveyId, userId);
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id: surveyId } = await context.params;

    const survey = await verifyAccess(surveyId, userId);
    if (!survey) {
      return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = questionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
        { status: 400 }
      );
    }

    const question = await prisma.question.create({
      data: {
        surveyId,
        type: parsed.data.type,
        text: parsed.data.text,
        options: parsed.data.options ?? null,
        required: parsed.data.required ?? false,
        order: parsed.data.order,
        showIf: parsed.data.showIf ?? null,
      },
    });

    await prisma.survey.update({
      where: { id: surveyId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "questions-create");
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id: surveyId } = await context.params;

    const survey = await verifyAccess(surveyId, userId);
    if (!survey) {
      return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = questionReorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Daten" },
        { status: 400 }
      );
    }

    const questionIds = parsed.data.questions.map((q) => q.id);
    const owned = await prisma.question.findMany({
      where: { surveyId, id: { in: questionIds } },
      select: { id: true, showIf: true },
    });

    if (owned.length !== questionIds.length) {
      return NextResponse.json({ error: "Ungültige Frage" }, { status: 400 });
    }

    const reordered = parsed.data.questions.map((q) => {
      const existing = owned.find((item) => item.id === q.id);
      return {
        id: q.id,
        order: q.order,
        showIf: existing?.showIf ?? null,
      };
    });

    const orderError = validateQuestionOrder(reordered);
    if (orderError) {
      return NextResponse.json({ error: orderError }, { status: 400 });
    }

    await prisma.$transaction(
      parsed.data.questions.map((q) =>
        prisma.question.update({
          where: { id: q.id, surveyId },
          data: { order: q.order },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "questions-reorder");
  }
}
