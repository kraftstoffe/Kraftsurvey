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

export const surveySettingsSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  thankYouTitle: z.string().max(200).nullable().optional(),
  thankYouMessage: z.string().max(2000).nullable().optional(),
  thankYouLinkUrl: z
    .union([z.string().url("Ungültige URL").max(500), z.literal(""), z.null()])
    .optional(),
  thankYouLinkLabel: z.string().max(100).nullable().optional(),
  closedMessage: z.string().max(2000).nullable().optional(),
  status: z.enum(["DRAFT", "LIVE", "CLOSED"]).optional(),
});

export const surveyMemberSchema = z.object({
  email: z.string().email("Ungültige E-Mail").max(320),
});

export const MAX_DRAFT_ANSWER_KEYS = 200;
export const MAX_DRAFT_JSON_BYTES = 500_000;

export const bulkDeleteResponsesSchema = z.object({
  all: z.boolean().optional(),
  before: z.string().datetime().optional(),
}).refine((d) => d.all === true || Boolean(d.before), {
  message: "Entweder all oder before angeben",
});

export const surveyDraftLoadSchema = z.object({
  load: z.literal(true),
  token: z.string().min(1).max(128),
});

export const surveyDraftSchema = z
  .object({
    token: z.string().min(1).max(128).optional(),
    answers: z.record(z.string(), z.unknown()),
    step: z.number().int().min(0).max(500),
    phase: z.enum(["questions", "review"]).optional(),
    fingerprint: z.string().min(1).max(128).optional(),
  })
  .refine((d) => Object.keys(d.answers).length <= MAX_DRAFT_ANSWER_KEYS, {
    message: "Zu viele gespeicherte Antworten",
  })
  .refine((d) => JSON.stringify(d.answers).length <= MAX_DRAFT_JSON_BYTES, {
    message: "Entwurf ist zu groß",
  });

export const questionSchema = z.object({
  type: z.enum(questionTypeValues),
  text: z.string().min(1, "Fragetext erforderlich").max(2000),
  options: z.string().max(20_000).nullable().optional(),
  required: z.boolean().optional(),
  showIf: z.string().max(2000).nullable().optional(),
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
  preview: z.boolean().optional(),
  draftToken: z.string().min(1).max(128).optional(),
});

export const questionReorderSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string().min(1),
      order: z.number().int().min(0),
    })
  ),
});
