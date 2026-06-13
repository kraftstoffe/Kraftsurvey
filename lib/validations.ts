import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Mindestens 8 Zeichen"),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort erforderlich"),
});

export const surveySchema = z.object({
  title: z.string().min(1, "Titel erforderlich").max(200),
  description: z.string().max(2000).optional(),
});

export const questionSchema = z.object({
  type: z.string(),
  text: z.string().min(1, "Fragetext erforderlich"),
  options: z.string().nullable().optional(),
  required: z.boolean().optional(),
  order: z.number().int().min(0),
});

export const submitResponseSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      value: z.string(),
    })
  ),
  fingerprint: z.string().optional(),
  durationMs: z.number().int().optional(),
});
