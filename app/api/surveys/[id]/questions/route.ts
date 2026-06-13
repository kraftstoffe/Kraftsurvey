import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { questionSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

async function verifyOwnership(surveyId: string, userId: string) {
  return prisma.survey.findFirst({ where: { id: surveyId, ownerId: userId } });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id: surveyId } = await context.params;

    const survey = await verifyOwnership(surveyId, userId);
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
      },
    });

    await prisma.survey.update({
      where: { id: surveyId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id: surveyId } = await context.params;

    const survey = await verifyOwnership(surveyId, userId);
    if (!survey) {
      return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
    }

    const body = await request.json();
    const questions = body.questions as Array<{ id: string; order: number }>;

    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    await prisma.$transaction(
      questions.map((q) =>
        prisma.question.update({
          where: { id: q.id },
          data: { order: q.order },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
}
