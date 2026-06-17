import { describe, expect, it } from "vitest";
import { QUESTION_TYPES } from "@/lib/survey-types";
import {
  buildSubmitAnswers,
  findFirstInvalidVisibleQuestion,
  pruneHiddenAnswers,
  reconcileAnswers,
  validateSubmitAnswers,
  type QuestionForValidation,
} from "@/lib/survey-validation";

const q0: QuestionForValidation = {
  id: "q0",
  type: QUESTION_TYPES.SINGLE_CHOICE,
  options: JSON.stringify([
    { id: "a", label: "A" },
    { id: "b", label: "B" },
  ]),
  required: true,
  showIf: null,
};

const q1: QuestionForValidation = {
  id: "q1",
  type: QUESTION_TYPES.SHORT_TEXT,
  options: null,
  required: true,
  showIf: JSON.stringify({ questionId: "q0", when: "includes_option", optionId: "a" }),
};

const q2: QuestionForValidation = {
  id: "q2",
  type: QUESTION_TYPES.SHORT_TEXT,
  options: null,
  required: false,
  showIf: JSON.stringify({ questionId: "q1", when: "includes_option" }),
};

describe("pruneHiddenAnswers", () => {
  it("removes nested conditional answers when a parent answer changes", () => {
    const questions = [q0, q1, q2];
    const answers = {
      q0: "B",
      q1: "kept by mistake",
      q2: "also stale",
    };

    const pruned = pruneHiddenAnswers(questions, answers);
    expect(pruned).toEqual({ q0: "B" });
  });
});

describe("findFirstInvalidVisibleQuestion", () => {
  it("flags a required choice question with no selection", () => {
    const questions = [q0];
    const invalid = findFirstInvalidVisibleQuestion(questions, { q0: "" });
    expect(invalid).toEqual({
      questionId: "q0",
      message: "Bitte beantworte diese Pflichtfrage",
    });
  });
});

describe("buildSubmitAnswers", () => {
  it("only serializes answers for currently visible questions", () => {
    const questions = [q0, q1];
    const payload = buildSubmitAnswers(questions, { q0: "A", q1: "hello" });
    expect(payload).toEqual([
      { questionId: "q0", value: "A" },
      { questionId: "q1", value: "hello" },
    ]);
  });
});

describe("reconcileAnswers", () => {
  it("drops answers for removed questions and stale conditional answers", () => {
    const questions = [q0, q1];
    const reconciled = reconcileAnswers(questions, {
      q0: "B",
      q1: "stale",
      removed: "x",
    });
    expect(reconciled).toEqual({ q0: "B" });
  });
});

describe("validateSubmitAnswers", () => {
  it("flags a newly required visible question missing from the payload", () => {
    const questions = [
      q0,
      {
        id: "q-new",
        type: QUESTION_TYPES.SINGLE_CHOICE,
        options: q0.options,
        required: true,
        showIf: null,
      },
    ];

    const result = validateSubmitAnswers(questions, [{ questionId: "q0", value: "A" }]);
    expect(result).toEqual({
      questionId: "q-new",
      message: "Bitte beantworte diese Pflichtfrage",
    });
  });
});
