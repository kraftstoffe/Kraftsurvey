import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getSurveyForEditor } from "@/lib/survey-access";

type RouteContext = { params: Promise<{ id: string; responseId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id: surveyId, responseId } = await context.params;

    const survey = await getSurveyForEditor(surveyId, userId);

    if (!survey) {
      return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
    }

    const response = await prisma.response.findFirst({
      where: { id: responseId, surveyId },
      select: { id: true },
    });

    if (!response) {
      return NextResponse.json({ error: "Antwort nicht gefunden" }, { status: 404 });
    }

    await prisma.response.delete({ where: { id: responseId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "response-delete");
  }
}
