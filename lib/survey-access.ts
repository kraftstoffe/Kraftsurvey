import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function surveyAccessFilter(userId: string): Prisma.SurveyWhereInput {
  return {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };
}

export async function getSurveyForEditor(surveyId: string, userId: string) {
  return prisma.survey.findFirst({
    where: {
      id: surveyId,
      ...surveyAccessFilter(userId),
    },
    include: {
      questions: { orderBy: { order: "asc" } },
      members: {
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { responses: true } },
    },
  });
}

export async function getSurveyForOwner(surveyId: string, userId: string) {
  return prisma.survey.findFirst({
    where: { id: surveyId, ownerId: userId },
    include: {
      members: {
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });
}

export function isSurveyOwner(survey: { ownerId: string }, userId: string) {
  return survey.ownerId === userId;
}

export async function requireSurveyOwner(surveyId: string, userId: string) {
  return prisma.survey.findFirst({
    where: { id: surveyId, ownerId: userId },
  });
}
