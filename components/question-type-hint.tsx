import { QUESTION_TYPES, isScaleType, type QuestionType } from "@/lib/survey-types";

export function QuestionTypeHint({
  type,
  required,
  maxSelections,
  id,
}: {
  type: QuestionType;
  required: boolean;
  maxSelections?: number | null;
  id?: string;
}) {
  const hints: string[] = [];

  if (required) {
    hints.push("Pflichtfrage");
  }

  switch (type) {
    case QUESTION_TYPES.MULTIPLE_CHOICE:
      if (maxSelections != null) {
        hints.push(
          maxSelections === 1
            ? "Mehrfachauswahl — maximal 1 Option"
            : `Mehrfachauswahl — maximal ${maxSelections} Optionen`
        );
      } else {
        hints.push("Mehrfachauswahl — mehrere Optionen möglich");
      }
      break;
    case QUESTION_TYPES.SINGLE_CHOICE:
    case QUESTION_TYPES.DROPDOWN:
      hints.push("Bitte eine Option wählen");
      break;
    case QUESTION_TYPES.YES_NO:
      hints.push("Ja oder Nein");
      break;
    case QUESTION_TYPES.SCALE_5:
      hints.push("Skala 1 (gar nicht) bis 5 (sehr)");
      break;
    case QUESTION_TYPES.SCALE_10:
      hints.push("Skala 1 (gar nicht) bis 10 (sehr)");
      break;
    case QUESTION_TYPES.LONG_TEXT:
      hints.push("Mehrzeilige Antwort");
      break;
    default:
      break;
  }

  if (hints.length === 0) {
    return id ? <span id={id} className="sr-only" /> : null;
  }

  return (
    <p
      id={id}
      className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]"
      role="note"
    >
      {hints.map((hint) => (
        <span
          key={hint}
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs mono-label bg-[var(--accent-dim)] text-[var(--accent)]"
        >
          {hint}
        </span>
      ))}
    </p>
  );
}

export function scaleHint(type: QuestionType): { min: string; max: string } | null {
  if (!isScaleType(type)) return null;
  return { min: "Gar nicht", max: "Sehr" };
}
