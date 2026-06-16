import {
  isChoiceType,
  parseOptions,
  QUESTION_TYPES,
  type QuestionOption,
  type QuestionType,
} from "@/lib/survey-types";

/** Stored in Answer.value for choice questions with Sonstige / Zusatzfelder. */
export type ChoiceAnswerPayload = {
  selected: string[];
  otherText?: string;
  optionTexts?: Record<string, string>;
};

export type QuestionShowIf = {
  questionId: string;
  when: "includes_option" | "includes_other" | "includes_option_with_text";
  optionId?: string;
};

export function parseShowIf(raw: string | null | undefined): QuestionShowIf | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as QuestionShowIf;
    if (!parsed?.questionId || !parsed?.when) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getOtherOption(options: QuestionOption[]): QuestionOption | undefined {
  return options.find((o) => o.kind === "other");
}

export function normalizeOptions(options: QuestionOption[]): QuestionOption[] {
  return options.map((o) => ({
    id: o.id,
    label: o.label,
    kind: o.kind === "other" ? "other" : "normal",
    allowText: o.allowText === true,
    textPlaceholder: o.textPlaceholder,
  }));
}

export function createOtherOption(label = "Sonstige"): QuestionOption {
  return {
    id: crypto.randomUUID(),
    label,
    kind: "other",
  };
}

export function isStructuredChoiceValue(raw: unknown): raw is ChoiceAnswerPayload {
  if (!raw || typeof raw !== "object") return false;
  const v = raw as ChoiceAnswerPayload;
  return Array.isArray(v.selected);
}

/** Parse client or stored answer into structured choice payload. */
export function parseChoiceAnswer(
  value: unknown,
  type: QuestionType
): ChoiceAnswerPayload {
  if (isStructuredChoiceValue(value)) {
    return {
      selected: [...value.selected],
      otherText: value.otherText,
      optionTexts: value.optionTexts ? { ...value.optionTexts } : undefined,
    };
  }

  if (type === QUESTION_TYPES.MULTIPLE_CHOICE) {
    if (Array.isArray(value)) {
      return { selected: value.map(String) };
    }
    if (typeof value === "string" && value.startsWith("[")) {
      try {
        const arr = JSON.parse(value) as string[];
        return { selected: Array.isArray(arr) ? arr.map(String) : [] };
      } catch {
        return { selected: [] };
      }
    }
    return { selected: [] };
  }

  if (typeof value === "string") {
    if (value.startsWith("{")) {
      try {
        const parsed = JSON.parse(value) as ChoiceAnswerPayload;
        if (Array.isArray(parsed.selected)) return parsed;
      } catch {
        /* legacy plain string */
      }
    }
    return { selected: value ? [value] : [] };
  }

  return { selected: [] };
}

export function serializeChoiceAnswer(payload: ChoiceAnswerPayload): string {
  const hasExtras =
    Boolean(payload.otherText?.trim()) ||
    Boolean(
      payload.optionTexts &&
        Object.values(payload.optionTexts).some((t) => t.trim().length > 0)
    );

  if (!hasExtras) {
    if (payload.selected.length <= 1) {
      return payload.selected[0] ?? "";
    }
    return JSON.stringify(payload.selected);
  }

  return JSON.stringify({
    selected: payload.selected,
    ...(payload.otherText?.trim() ? { otherText: payload.otherText.trim() } : {}),
    ...(payload.optionTexts && Object.keys(payload.optionTexts).length > 0
      ? {
          optionTexts: Object.fromEntries(
            Object.entries(payload.optionTexts).filter(([, t]) => t.trim())
          ),
        }
      : {}),
  });
}

export function formatChoiceAnswerForDisplay(
  value: string,
  type: QuestionType,
  options: QuestionOption[]
): string {
  if (!isChoiceType(type)) return value;

  const payload = parseChoiceAnswer(value, type);
  const parts = payload.selected.map((label) => {
    const opt = options.find((o) => o.label === label);
    if (!opt) return label;

    if (opt.kind === "other" && payload.otherText?.trim()) {
      return `${label}: ${payload.otherText.trim()}`;
    }
    if (opt.allowText && payload.optionTexts?.[opt.id]?.trim()) {
      return `${label}: ${payload.optionTexts[opt.id].trim()}`;
    }
    return label;
  });

  return parts.join(", ");
}

type QuestionLike = {
  id: string;
  type: string;
  options: string | null;
  showIf?: string | null;
};

export function evaluateShowIf(
  showIf: QuestionShowIf | null,
  answers: Record<string, unknown>,
  questions: QuestionLike[]
): boolean {
  if (!showIf) return true;

  const parent = questions.find((q) => q.id === showIf.questionId);
  if (!parent || !isChoiceType(parent.type as QuestionType)) return false;

  const parentOptions = normalizeOptions(parseOptions(parent.options));
  const parentAnswer = parseChoiceAnswer(
    answers[showIf.questionId],
    parent.type as QuestionType
  );

  if (showIf.when === "includes_other") {
    const other = getOtherOption(parentOptions);
    if (!other) return false;
    return parentAnswer.selected.includes(other.label);
  }

  if (showIf.when === "includes_option_with_text") {
    if (!showIf.optionId) return false;
    const opt = parentOptions.find((o) => o.id === showIf.optionId);
    if (!opt) return false;
    if (!parentAnswer.selected.includes(opt.label)) return false;
    return Boolean(parentAnswer.optionTexts?.[opt.id]?.trim());
  }

  if (showIf.when === "includes_option") {
    if (showIf.optionId) {
      const opt = parentOptions.find((o) => o.id === showIf.optionId);
      return opt ? parentAnswer.selected.includes(opt.label) : false;
    }
    return parentAnswer.selected.length > 0;
  }

  return true;
}

export function getVisibleQuestions<T extends QuestionLike>(
  questions: T[],
  answers: Record<string, unknown>
): T[] {
  return questions.filter((q) =>
    evaluateShowIf(parseShowIf(q.showIf ?? null), answers, questions)
  );
}

export function validateChoiceAnswer(
  payload: ChoiceAnswerPayload,
  type: QuestionType,
  options: QuestionOption[],
  required: boolean
): string | null {
  const normalized = normalizeOptions(options);
  const other = getOtherOption(normalized);

  if (required && payload.selected.length === 0) {
    return "Bitte beantworte diese Pflichtfrage";
  }

  if (other && payload.selected.includes(other.label)) {
    if (!payload.otherText?.trim()) {
      return `Bitte gib bei „${other.label}“ an, was du meinst`;
    }
  }

  for (const opt of normalized) {
    if (!opt.allowText || !payload.selected.includes(opt.label)) continue;
    if (required && !payload.optionTexts?.[opt.id]?.trim()) {
      return `Bitte ergänze deine Antwort zu „${opt.label}“`;
    }
  }

  if (type === QUESTION_TYPES.MULTIPLE_CHOICE && required && payload.selected.length === 0) {
    return "Bitte beantworte diese Pflichtfrage";
  }

  return null;
}

export function expandChoiceSelections(value: string, type: QuestionType): string[] {
  return parseChoiceAnswer(value, type).selected;
}

export function isAnswerEmpty(value: unknown, type: QuestionType): boolean {
  if (isChoiceType(type)) {
    const payload = parseChoiceAnswer(value, type);
    return payload.selected.length === 0;
  }
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return value === undefined || value === null;
}
