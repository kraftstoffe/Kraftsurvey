import { Prisma } from "@prisma/client";

export function prismaErrorMessage(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021") {
      return "Datenbank-Schema fehlt. Bitte kurz warten und erneut versuchen.";
    }
    if (error.code === "P2002") {
      return "E-Mail bereits registriert";
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Datenbank nicht erreichbar. Bitte später erneut versuchen.";
  }

  return null;
}
