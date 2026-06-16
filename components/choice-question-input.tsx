import {
  getOtherOption,
  normalizeOptions,
  parseChoiceAnswer,
  type ChoiceAnswerPayload,
} from "@/lib/choice-answers";
import {
  isChoiceType,
  optionLetter,
  parseOptions,
  QUESTION_TYPES,
  type QuestionType,
} from "@/lib/survey-types";
import { cn } from "@/lib/utils";

export type SurveyQuestion = {
  id: string;
  type: string;
  text: string;
  options: string | null;
  required: boolean;
  order: number;
  showIf?: string | null;
};

type ChoiceQuestionInputProps = {
  question: SurveyQuestion;
  value: ChoiceAnswerPayload | string | string[] | undefined;
  onChange: (value: ChoiceAnswerPayload) => void;
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>;
  onEnter?: () => void;
  labelledBy?: string;
  describedBy?: string;
};

function toPayload(
  value: ChoiceAnswerPayload | string | string[] | undefined,
  type: QuestionType
): ChoiceAnswerPayload {
  return parseChoiceAnswer(value, type);
}

export function ChoiceQuestionInput({
  question,
  value,
  onChange,
  inputRef,
  onEnter,
  labelledBy,
  describedBy,
}: ChoiceQuestionInputProps) {
  const type = question.type as QuestionType;
  const options = normalizeOptions(parseOptions(question.options));
  const payload = toPayload(value, type);
  const other = getOtherOption(options);

  function patch(updates: Partial<ChoiceAnswerPayload>) {
    onChange({ ...payload, ...updates });
  }

  function toggleLabel(label: string, multi: boolean) {
    if (multi) {
      const selected = payload.selected.includes(label)
        ? payload.selected.filter((l) => l !== label)
        : [...payload.selected, label];
      const opt = options.find((o) => o.label === label);
      const optionTexts = payload.optionTexts ? { ...payload.optionTexts } : undefined;
      if (!selected.includes(label) && opt && optionTexts) {
        delete optionTexts[opt.id];
      }
      const otherText =
        other && label === other.label && !selected.includes(label)
          ? undefined
          : payload.otherText;
      patch({ selected, optionTexts, otherText });
      return;
    }

    if (payload.selected[0] === label) {
      patch({ selected: [], otherText: undefined, optionTexts: undefined });
    } else {
      patch({ selected: [label], otherText: undefined, optionTexts: undefined });
    }
  }

  function setOptionText(optionId: string, text: string) {
    patch({
      optionTexts: { ...(payload.optionTexts ?? {}), [optionId]: text },
    });
  }

  const showOtherField =
    other && payload.selected.includes(other.label);

  const selectedWithText = options.filter(
    (o) => o.allowText && payload.selected.includes(o.label)
  );

  const ariaProps = {
    ...(labelledBy ? { "aria-labelledby": labelledBy } : {}),
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
  };

  return (
    <div>
      {(type === QUESTION_TYPES.SINGLE_CHOICE || type === QUESTION_TYPES.DROPDOWN) &&
        (type === QUESTION_TYPES.DROPDOWN ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="input select"
            value={payload.selected[0] ?? ""}
            {...ariaProps}
            onChange={(e) => {
              const label = e.target.value;
              if (!label) patch({ selected: [], otherText: undefined });
              else patch({ selected: [label], otherText: undefined });
            }}
          >
            <option value="">Bitte wählen…</option>
            {options.map((opt, i) => (
              <option key={opt.id} value={opt.label}>
                {optionLetter(i)} — {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-2" role="radiogroup" {...ariaProps}>
            {options.map((opt, i) => (
              <label
                key={opt.id}
                className={cn(
                  "radio-option",
                  payload.selected.includes(opt.label) && "selected"
                )}
                onClick={(e) => {
                  if (payload.selected[0] === opt.label) {
                    e.preventDefault();
                    toggleLabel(opt.label, false);
                  }
                }}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={payload.selected[0] === opt.label}
                  onChange={() => toggleLabel(opt.label, false)}
                  onClick={(e) => {
                    if (payload.selected[0] === opt.label) {
                      e.preventDefault();
                      toggleLabel(opt.label, false);
                    }
                  }}
                  className="accent-[var(--accent)]"
                />
                <span className="option-letter">{optionLetter(i)}</span>
                <span>
                  {opt.label}
                  {opt.kind === "other" && (
                    <span className="text-[var(--text-muted)] text-xs ml-1">(Freitext)</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        ))}

      {type === QUESTION_TYPES.MULTIPLE_CHOICE && (
        <div className="space-y-2" role="group" {...ariaProps}>
          {options.map((opt, i) => {
            const selected = payload.selected.includes(opt.label);
            return (
              <label
                key={opt.id}
                className={cn("checkbox-option", selected && "selected")}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleLabel(opt.label, true)}
                  className="accent-[var(--accent)]"
                />
                <span className="option-letter">{optionLetter(i)}</span>
                <span>
                  {opt.label}
                  {opt.kind === "other" && (
                    <span className="text-[var(--text-muted)] text-xs ml-1">(Freitext)</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {showOtherField && other && (
        <input
          className="input mt-3"
          value={payload.otherText ?? ""}
          onChange={(e) => patch({ otherText: e.target.value })}
          placeholder={other.textPlaceholder ?? "Bitte genauer angeben…"}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter?.();
            }
          }}
        />
      )}

      {selectedWithText.length > 0 && (
        <div className="mt-3 space-y-2">
          {selectedWithText.map((opt) => (
            <div key={opt.id}>
              <label className="mono-label block mb-1 text-[var(--text-muted)]">
                {opt.label}
              </label>
              <input
                className="input"
                value={payload.optionTexts?.[opt.id] ?? ""}
                onChange={(e) => setOptionText(opt.id, e.target.value)}
                placeholder={opt.textPlaceholder ?? "Ergänzung…"}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function isChoiceQuestionType(type: string): boolean {
  return isChoiceType(type as QuestionType);
}
