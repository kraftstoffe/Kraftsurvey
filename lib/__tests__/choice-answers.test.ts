import { describe, expect, it } from "vitest";
import {
  parseChoiceAnswer,
  serializeChoiceAnswer,
  validateChoiceAnswer,
} from "@/lib/choice-answers";
import { QUESTION_TYPES } from "@/lib/survey-types";

const options = [
  { id: "1", label: "Option A" },
  { id: "2", label: "Option B" },
  { id: "3", label: "Option C" },
];

describe("parseChoiceAnswer MULTIPLE_CHOICE", () => {
  it("accepts a single selection stored as a plain label string", () => {
    const payload = parseChoiceAnswer("Option A", QUESTION_TYPES.MULTIPLE_CHOICE);
    expect(payload.selected).toEqual(["Option A"]);
  });

  it("accepts multiple selections stored as a JSON array string", () => {
    const payload = parseChoiceAnswer(
      '["Option A","Option B"]',
      QUESTION_TYPES.MULTIPLE_CHOICE
    );
    expect(payload.selected).toEqual(["Option A", "Option B"]);
  });

  it("round-trips a single multiple-choice selection through serialize", () => {
    const serialized = serializeChoiceAnswer({ selected: ["Option A"] });
    expect(serialized).toBe("Option A");

    const reparsed = parseChoiceAnswer(serialized, QUESTION_TYPES.MULTIPLE_CHOICE);
    expect(reparsed.selected).toEqual(["Option A"]);
  });
});

describe("validateChoiceAnswer MULTIPLE_CHOICE", () => {
  it("accepts one required selection", () => {
    const msg = validateChoiceAnswer(
      { selected: ["Option A"] },
      QUESTION_TYPES.MULTIPLE_CHOICE,
      options,
      true,
      null
    );
    expect(msg).toBeNull();
  });

  it("rejects zero required selections", () => {
    const msg = validateChoiceAnswer(
      { selected: [] },
      QUESTION_TYPES.MULTIPLE_CHOICE,
      options,
      true,
      null
    );
    expect(msg).toBe("Bitte beantworte diese Pflichtfrage");
  });
});
