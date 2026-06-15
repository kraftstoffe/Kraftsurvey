import { z } from "zod";
import { QUESTION_TYPES } from "@/lib/survey-types";

const questionTypeValues = Object.values(QUESTION_TYPES) as [
  (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES],
  ...(typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES][],
];

export const MAX_PASSWORD_LENGTH = 128;
export const MAX_ANSWER_LENGTH = 10_000;

export const registerSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse").max(320),
  password: z
    .string()
    .min(8, "Mindestens 8 Zeichen")
    .max(MAX_PASSWORD_LENGTH, "Passwort zu lang"),
  name: z.string().max(200).optional(),
  inviteCode: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse").max(320),
  password: z
    .string()
    .min(1, "Passwort erforderlich")
    .max(MAX_PASSWORD_LENGTH, "Passwort zu lang"),
});

export const surveySchema = z.object({
  title: z.string().min(1, "Titel erforderlich").max(200),
  description: z.string().max(2000).optional(),
});

export const questionSchema = z.object({
  type: z.enum(questionTypeValues),
  text: z.string().min(1, "Fragetext erforderlich").max(2000),
  options: z.string().max(20_000).nullable().optional(),
  required: z.boolean().optional(),
  order: z.number().int().min(0),
});

export const submitResponseSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        value: z.string().max(MAX_ANSWER_LENGTH),
      })
    )
    .max(500),
  fingerprint: z.string().min(1).max(128).optional(),
  durationMs: z.number().int().min(0).max(86_400_000).optional(),
});

export const questionReorderSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string().min(1),
      order: z.number().int().min(0),
    })
  ),
});
