import { formatChoiceAnswerForDisplay, parseChoiceAnswer, serializeChoiceAnswer } from "@/lib/choice-answers";
import {
  isChoiceType,
  isScaleType,
  parseOptions,
  QUESTION_TYPES,
  type QuestionType,
} from "@/lib/survey-types";
import type { SurveyQuestion } from "@/components/choice-question-input";

type AnswerValue = string | string[] | ReturnType<typeof parseChoiceAnswer>;

export function formatPublicAnswer(
  question: SurveyQuestion,
  value: AnswerValue | undefined
): string {
  if (value === undefined || value === null || value === "") return "—";

  const type = question.type as QuestionType;

  if (isChoiceType(type)) {
    const payload = parseChoiceAnswer(value, type);
    if (payload.selected.length === 0) return "—";
    return formatChoiceAnswerForDisplay(
      serializeChoiceAnswer(payload),
      type,
      parseOptions(question.options)
    );
  }

  if (type === QUESTION_TYPES.YES_NO || isScaleType(type)) {
    const text = String(value).trim();
    return text || "—";
  }

  const text = String(value).trim();
  return text || "—";
}

export function estimateSurveyMinutes(questionCount: number, visibleCount?: number): number {
  const count = visibleCount && visibleCount > 0 ? visibleCount : questionCount;
  if (count <= 0) return 1;
  return Math.max(1, Math.ceil(count * 0.35));
}
