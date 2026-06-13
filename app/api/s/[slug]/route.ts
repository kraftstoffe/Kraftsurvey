import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  const survey = await prisma.survey.findUnique({
    where: { slug },
    include: {
      questions: { orderBy: { order: "asc" } },
    },
  });

  if (!survey || survey.status !== "LIVE") {
    return NextResponse.json(
      { error: survey?.status === "CLOSED" ? "Umfrage geschlossen" : "Umfrage nicht gefunden" },
      { status: survey?.status === "CLOSED" ? 410 : 404 }
    );
  }

  return NextResponse.json({
    survey: {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      slug: survey.slug,
      questions: survey.questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options,
        required: q.required,
        order: q.order,
      })),
    },
  });
}
