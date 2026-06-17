import {
  getVisibleQuestions,
  isAnswerEmpty,
  parseChoiceAnswer,
  serializeChoiceAnswer,
  validateChoiceAnswer,
  type QuestionLike,
} from "@/lib/choice-answers";
import { isChoiceType, parseOptions, type QuestionType } from "@/lib/survey-types";

export type QuestionForValidation = QuestionLike & {
  required: boolean;
  maxSelections?: number | null;
};

export function pruneHiddenAnswers<T>(
  questions: QuestionForValidation[],
  answers: Record<string, T>
): Record<string, T> {
  let next = { ...answers };
  let changed = true;

  while (changed) {
    changed = false;
    const visibleIds = new Set(getVisibleQuestions(questions, next).map((q) => q.id));
    for (const q of questions) {
      if (!visibleIds.has(q.id) && next[q.id] !== undefined) {
        delete next[q.id];
        changed = true;
      }
    }
  }

  return next;
}

export function findFirstInvalidVisibleQuestion(
  questions: QuestionForValidation[],
  answers: Record<string, unknown>
): { questionId: string; message: string } | null {
  const visible = getVisibleQuestions(questions, answers);

  for (const question of visible) {
    const type = question.type as QuestionType;
    const raw = answers[question.id];

    if (isChoiceType(type)) {
      const msg = validateChoiceAnswer(
        parseChoiceAnswer(raw, type),
        type,
        parseOptions(question.options),
        question.required,
        question.maxSelections
      );
      if (msg) return { questionId: question.id, message: msg };
      continue;
    }

    if (question.required && isAnswerEmpty(raw ?? "", type)) {
      return {
        questionId: question.id,
        message: "Bitte alle Pflichtfragen beantworten",
      };
    }
  }

  return null;
}

export function reconcileAnswers<T>(
  questions: QuestionForValidation[],
  answers: Record<string, T>
): Record<string, T> {
  const ids = new Set(questions.map((q) => q.id));
  const filtered: Record<string, T> = {};

  for (const [id, value] of Object.entries(answers)) {
    if (ids.has(id)) filtered[id] = value;
  }

  return pruneHiddenAnswers(questions, filtered);
}

export type SubmitAnswer = { questionId: string; value: string };

export function buildSubmitAnswers(
  questions: QuestionForValidation[],
  answers: Record<string, unknown>
): SubmitAnswer[] {
  const reconciled = reconcileAnswers(questions, answers);
  const visible = getVisibleQuestions(questions, reconciled);

  return visible.map((q) => {
    const val = reconciled[q.id];
    const type = q.type as QuestionType;

    if (isChoiceType(type)) {
      return {
        questionId: q.id,
        value: serializeChoiceAnswer(parseChoiceAnswer(val, type)),
      };
    }

    return { questionId: q.id, value: String(val ?? "") };
  });
}

/** Mirrors POST /api/s/[slug]/submit validation for client-side checks. */
export function validateSubmitAnswers(
  questions: QuestionForValidation[],
  answers: SubmitAnswer[]
): { questionId: string; message: string } | null {
  const questionIds = new Set(questions.map((q) => q.id));
  const answersMap: Record<string, string> = {};

  for (const answer of answers) {
    if (!questionIds.has(answer.questionId)) {
      return { questionId: answer.questionId, message: "Ungültige Frage" };
    }
    answersMap[answer.questionId] = answer.value;
  }

  const visible = getVisibleQuestions(questions, answersMap);
  const visibleIds = new Set(visible.map((q) => q.id));

  for (const answer of answers) {
    if (!visibleIds.has(answer.questionId)) {
      return { questionId: answer.questionId, message: "Ungültige Frage" };
    }
  }

  for (const question of questions) {
    if (!visibleIds.has(question.id)) continue;

    const type = question.type as QuestionType;
    const raw = answersMap[question.id];

    if (isChoiceType(type)) {
      const msg = validateChoiceAnswer(
        parseChoiceAnswer(raw ?? "", type),
        type,
        parseOptions(question.options),
        question.required,
        question.maxSelections
      );
      if (msg) return { questionId: question.id, message: msg };
      continue;
    }

    if (question.required && isAnswerEmpty(raw ?? "", type)) {
      return {
        questionId: question.id,
        message: "Bitte alle Pflichtfragen beantworten",
      };
    }
  }

  return null;
}

export function validateQuestionAnswer(
  question: QuestionForValidation,
  raw: unknown
): string | null {
  const type = question.type as QuestionType;

  if (isChoiceType(type)) {
    return validateChoiceAnswer(
      parseChoiceAnswer(raw, type),
      type,
      parseOptions(question.options),
      question.required,
      question.maxSelections
    );
  }

  if (question.required && isAnswerEmpty(raw ?? "", type)) {
    return "Bitte beantworte diese Pflichtfrage";
  }

  return null;
}
