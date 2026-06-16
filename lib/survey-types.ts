export const QUESTION_TYPES = {
  SHORT_TEXT: "SHORT_TEXT",
  LONG_TEXT: "LONG_TEXT",
  SINGLE_CHOICE: "SINGLE_CHOICE",
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  SCALE_5: "SCALE_5",
  SCALE_10: "SCALE_10",
  YES_NO: "YES_NO",
  DROPDOWN: "DROPDOWN",
} as const;

export type QuestionType = (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES];

export const SURVEY_STATUS = {
  DRAFT: "DRAFT",
  LIVE: "LIVE",
  CLOSED: "CLOSED",
} as const;

export type SurveyStatus = (typeof SURVEY_STATUS)[keyof typeof SURVEY_STATUS];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SHORT_TEXT: "Kurztext",
  LONG_TEXT: "Absatz",
  SINGLE_CHOICE: "Multiple Choice (eine)",
  MULTIPLE_CHOICE: "Multiple Choice (mehrere)",
  SCALE_5: "Skala 1–5",
  SCALE_10: "Skala 1–10",
  YES_NO: "Ja / Nein",
  DROPDOWN: "Dropdown",
};

export type OptionKind = "normal" | "other";

export type QuestionOption = {
  id: string;
  label: string;
  /** Sonstige-Option mit Freitext (#2 / #4) */
  kind?: OptionKind;
  /** Zusatzfeld pro Option (#5) */
  allowText?: boolean;
  textPlaceholder?: string;
};

export function parseOptions(options: string | null | undefined): QuestionOption[] {
  if (!options) return [];
  try {
    const parsed = JSON.parse(options) as QuestionOption[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((o) => ({
      id: o.id,
      label: o.label,
      kind: o.kind === "other" ? "other" : undefined,
      allowText: o.allowText === true,
      textPlaceholder: o.textPlaceholder,
    }));
  } catch {
    return [];
  }
}

export function defaultOptions(): QuestionOption[] {
  return [
    { id: crypto.randomUUID(), label: "Option 1" },
    { id: crypto.randomUUID(), label: "Option 2" },
  ];
}

/** Standard A/B/C/D-Auswahl beim Erstellen */
export function defaultLetterOptions(count = 4): QuestionOption[] {
  return Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    label: optionLetter(i),
  }));
}

export function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export type AnswerMode = "text" | "choice";

export function isTextType(type: QuestionType): boolean {
  return type === QUESTION_TYPES.SHORT_TEXT || type === QUESTION_TYPES.LONG_TEXT;
}

export function isChoiceType(type: QuestionType): boolean {
  return (
    type === QUESTION_TYPES.SINGLE_CHOICE ||
    type === QUESTION_TYPES.MULTIPLE_CHOICE ||
    type === QUESTION_TYPES.DROPDOWN
  );
}

export function getAnswerMode(type: QuestionType): AnswerMode {
  return isChoiceType(type) ? "choice" : "text";
}

export function textTypeFromVariant(variant: "short" | "long"): QuestionType {
  return variant === "long" ? QUESTION_TYPES.LONG_TEXT : QUESTION_TYPES.SHORT_TEXT;
}

export function statusLabel(status: string): string {
  switch (status) {
    case "LIVE":
      return "Live";
    case "CLOSED":
      return "Geschlossen";
    default:
      return "Entwurf";
  }
}

export function statusClass(status: string): string {
  switch (status) {
    case "LIVE":
      return "live";
    case "CLOSED":
      return "closed";
    default:
      return "draft";
  }
}

export function needsOptions(type: QuestionType): boolean {
  return (
    type === QUESTION_TYPES.SINGLE_CHOICE ||
    type === QUESTION_TYPES.MULTIPLE_CHOICE ||
    type === QUESTION_TYPES.DROPDOWN
  );
}

export function isScaleType(type: QuestionType): boolean {
  return type === QUESTION_TYPES.SCALE_5 || type === QUESTION_TYPES.SCALE_10;
}

export function scaleMax(type: QuestionType): number {
  return type === QUESTION_TYPES.SCALE_10 ? 10 : 5;
}
