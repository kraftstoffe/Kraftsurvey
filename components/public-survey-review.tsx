import { formatPublicAnswer } from "@/lib/format-public-answer";
import type { SurveyQuestion } from "@/components/choice-question-input";
import type { ChoiceAnswerPayload } from "@/lib/choice-answers";

type AnswerValue = string | string[] | ChoiceAnswerPayload;

type PublicSurveyReviewProps = {
  questions: SurveyQuestion[];
  answers: Record<string, AnswerValue>;
};

export function PublicSurveyReview({ questions, answers }: PublicSurveyReviewProps) {
  return (
    <div className="space-y-4" aria-label="Zusammenfassung deiner Antworten">
      <p className="text-sm text-[var(--text-muted)] mb-2">
        Bitte prüfe deine Angaben. Du kannst mit „Zurück“ einzelne Fragen korrigieren.
      </p>
      {questions.map((q, i) => (
        <div
          key={q.id}
          className="rounded-[var(--r-md)] border border-[var(--border-kraftgeon)] bg-[var(--surface-sunken)] p-4"
        >
          <p className="mono-label text-[var(--text-tertiary)] mb-1">Frage {i + 1}</p>
          <p className="font-medium mb-2">{q.text}</p>
          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
            {formatPublicAnswer(q, answers[q.id])}
          </p>
        </div>
      ))}
    </div>
  );
}
