import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getSurveyForEditor, isSurveyOwner } from "@/lib/survey-access";
import { bulkDeleteResponsesSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireSession();
    const { id } = await context.params;

    const survey = await getSurveyForEditor(id, userId);
    if (!survey || !isSurveyOwner(survey, userId)) {
      return NextResponse.json(
        { error: "Nur der Owner kann Antworten bulk-löschen" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = bulkDeleteResponsesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
        { status: 400 }
      );
    }

    const where = parsed.data.all
      ? { surveyId: id }
      : {
          surveyId: id,
          createdAt: { lte: new Date(parsed.data.before!) },
        };

    const result = await prisma.response.deleteMany({ where });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    return handleRouteError(error, "responses-bulk-delete");
  }
}
