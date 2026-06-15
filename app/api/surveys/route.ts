import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";
import { surveySchema } from "@/lib/validations";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const surveys = await prisma.survey.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { responses: true, questions: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ surveys });
  } catch (error) {
    return handleRouteError(error, "surveys-list");
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireSession();
    const body = await request.json();
    const parsed = surveySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
        { status: 400 }
      );
    }

    const { title, description } = parsed.data;
    const slug = generateSlug(title);

    const survey = await prisma.survey.create({
      data: {
        title,
        description: description ?? null,
        slug,
        ownerId: userId,
      },
    });

    return NextResponse.json({ survey }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "surveys-create");
  }
}
