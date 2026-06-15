import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { questionSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string; qid: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id: surveyId, qid } = await context.params;

    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, ownerId: userId },
    });
    if (!survey) {
      return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = questionSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
        { status: 400 }
      );
    }

    const existing = await prisma.question.findFirst({
      where: { id: qid, surveyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Frage nicht gefunden" }, { status: 404 });
    }

    const question = await prisma.question.update({
      where: { id: qid },
      data: parsed.data,
    });

    return NextResponse.json({ question });
  } catch (error) {
    return handleRouteError(error, "question-patch");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id: surveyId, qid } = await context.params;

    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, ownerId: userId },
    });
    if (!survey) {
      return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
    }

    const existing = await prisma.question.findFirst({
      where: { id: qid, surveyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Frage nicht gefunden" }, { status: 404 });
    }

    await prisma.question.delete({ where: { id: qid } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "question-delete");
  }
}
