"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  ChoiceQuestionInput,
  isChoiceQuestionType,
  type SurveyQuestion,
} from "@/components/choice-question-input";
import { PublicSurveyReview } from "@/components/public-survey-review";
import { QuestionTypeHint, scaleHint } from "@/components/question-type-hint";
import { PublicSurveySkeleton } from "@/components/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  getVisibleQuestions,
  isAnswerEmpty,
  parseChoiceAnswer,
  parseShowIf,
  serializeChoiceAnswer,
  validateChoiceAnswer,
  type ChoiceAnswerPayload,
} from "@/lib/choice-answers";
import { draftStorageKey } from "@/lib/draft-token";
import { estimateSurveyMinutes } from "@/lib/format-public-answer";
import { isSafeHttpUrl } from "@/lib/safe-url";
import {
  isScaleType,
  parseOptions,
  scaleMax,
  QUESTION_TYPES,
  type QuestionType,
} from "@/lib/survey-types";
import { cn } from "@/lib/utils";

type Survey = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  thankYouTitle?: string | null;
  thankYouMessage?: string | null;
  thankYouLinkUrl?: string | null;
  thankYouLinkLabel?: string | null;
  questions: SurveyQuestion[];
};

type AnswerValue = string | string[] | ChoiceAnswerPayload;
type Phase = "questions" | "review" | "done";
type FocusableInput = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function getFingerprint(): string {
  const key = "survey_fp";
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(key, fp);
  }
  return fp;
}

function pruneHiddenAnswers(
  questions: SurveyQuestion[],
  answers: Record<string, AnswerValue>
): Record<string, AnswerValue> {
  const visibleIds = new Set(getVisibleQuestions(questions, answers).map((q) => q.id));
  const next = { ...answers };
  let changed = false;
  for (const q of questions) {
    if (!visibleIds.has(q.id) && next[q.id] !== undefined) {
      delete next[q.id];
      changed = true;
    }
  }
  return changed ? next : answers;
}

function validateQuestion(
  question: SurveyQuestion,
  val: AnswerValue | undefined
): string | null {
  const type = question.type as QuestionType;

  if (isChoiceQuestionType(type)) {
    return validateChoiceAnswer(
      parseChoiceAnswer(val, type),
      type,
      parseOptions(question.options),
      question.required,
      question.maxSelections
    );
  }

  if (!question.required) return null;
  if (isAnswerEmpty(val, type)) return "Bitte beantworte diese Pflichtfrage";
  return null;
}

export default function PublicSurveyPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [closedInfo, setClosedInfo] = useState<{ title: string; message: string } | null>(null);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("questions");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [draftToken, setDraftToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startTime = useMemo(() => Date.now(), []);
  const inputRef = useRef<FocusableInput>(null);
  const questionPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/s/${slug}`)
      .then(async (r) => {
        const data = await r.json();
        if (r.status === 410 && data.closed) {
          setClosedInfo({
            title: data.survey?.title ?? "Umfrage geschlossen",
            message: data.closedMessage ?? "Diese Umfrage ist nicht mehr verfügbar.",
          });
          setLoading(false);
          return;
        }
        if (!r.ok) {
          setError(data.error ?? "Umfrage nicht gefunden");
          setLoading(false);
          return;
        }
        setSurvey(data.survey);
        setPreviewMode(data.previewMode === true);
        setLoading(false);
      })
      .catch(() => {
        setError("Verbindungsfehler");
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!survey || previewMode) return;
    const stored = localStorage.getItem(draftStorageKey(slug));
    if (!stored) return;

    fetch(`/api/s/${slug}/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ load: true, token: stored }),
    })
      .then(async (r) => {
        if (!r.ok) {
          localStorage.removeItem(draftStorageKey(slug));
          return;
        }
        const data = await r.json();
        const restoredAnswers = data.answers as Record<string, AnswerValue>;
        const restoredPhase: Phase = data.phase === "review" ? "review" : "questions";
        const restoredStep = data.step ?? 0;

        setAnswers(restoredAnswers);
        setDraftToken(stored);

        if (!survey) return;

        const visible = getVisibleQuestions(survey.questions, restoredAnswers);
        let firstInvalid: { index: number; message: string } | null = null;
        for (let i = 0; i < visible.length; i++) {
          const msg = validateQuestion(visible[i], restoredAnswers[visible[i].id]);
          if (msg) {
            firstInvalid = { index: i, message: msg };
            break;
          }
        }

        if (restoredPhase === "review") {
          if (firstInvalid) {
            setPhase("questions");
            setStep(firstInvalid.index);
            setFieldError(firstInvalid.message);
          } else {
            setPhase("review");
            setStep(Math.max(visible.length - 1, 0));
          }
        } else {
          setPhase("questions");
          setStep(Math.min(restoredStep, Math.max(visible.length - 1, 0)));
        }
      })
      .catch(() => undefined);
  }, [survey, slug, previewMode]);

  const visibleQuestions = useMemo(
    () => (survey ? getVisibleQuestions(survey.questions, answers) : []),
    [survey, answers]
  );

  const current = phase === "questions" ? visibleQuestions[step] : undefined;
  const progress =
    phase === "review"
      ? 100
      : visibleQuestions.length > 0
        ? ((step + 1) / visibleQuestions.length) * 100
        : 0;

  const saveDraft = useCallback(async () => {
    if (!survey || previewMode || phase === "done") return;

    const res = await fetch(`/api/s/${slug}/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: draftToken ?? undefined,
        answers,
        step: phase === "review" ? Math.max(visibleQuestions.length - 1, 0) : step,
        phase,
        fingerprint: getFingerprint(),
      }),
    });

    if (!res.ok) return;
    const data = await res.json();
    setDraftToken(data.token);
    localStorage.setItem(draftStorageKey(slug), data.token);
  }, [survey, previewMode, phase, slug, draftToken, answers, step, visibleQuestions.length]);

  useEffect(() => {
    if (!survey || previewMode || phase === "done") return;
    const timer = setTimeout(() => {
      void saveDraft();
    }, 1500);
    return () => clearTimeout(timer);
  }, [answers, step, survey, previewMode, phase, saveDraft]);

  useEffect(() => {
    if (step >= visibleQuestions.length && visibleQuestions.length > 0) {
      setStep(visibleQuestions.length - 1);
    }
  }, [step, visibleQuestions.length]);

  useEffect(() => {
    if (!current || phase !== "questions") return;
    const type = current.type as QuestionType;
    const shouldFocus =
      type === QUESTION_TYPES.SHORT_TEXT ||
      type === QUESTION_TYPES.LONG_TEXT ||
      type === QUESTION_TYPES.DROPDOWN;
    if (!shouldFocus) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [step, current?.id, phase]);

  useEffect(() => {
    if (!fieldError || !questionPanelRef.current) return;
    questionPanelRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [fieldError, step]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [step, phase]);

  function firstInvalidQuestionIndex(
    questions: SurveyQuestion[],
    answerMap: Record<string, AnswerValue>
  ): { index: number; message: string } | null {
    for (let i = 0; i < questions.length; i++) {
      const msg = validateQuestion(questions[i], answerMap[questions[i].id]);
      if (msg) return { index: i, message: msg };
    }
    return null;
  }

  function setAnswer(questionId: string, value: AnswerValue) {
    setFieldError("");
    setError("");
    setAnswers((prev) => {
      const withNew = { ...prev, [questionId]: value };
      if (!survey) return withNew;
      return pruneHiddenAnswers(survey.questions, withNew);
    });
  }

  function validateCurrent(): boolean {
    if (!current || !survey) return true;
    const msg = validateQuestion(current, answers[current.id]);
    if (msg) {
      setFieldError(msg);
      setError("");
      return false;
    }
    setFieldError("");
    setError("");
    return true;
  }

  function handleNext() {
    if (!validateCurrent()) return;
    if (step < visibleQuestions.length - 1) {
      setStep(step + 1);
      setFieldError("");
      setError("");
      return;
    }

    const invalid = firstInvalidQuestionIndex(visibleQuestions, answers);
    if (invalid) {
      setStep(invalid.index);
      setFieldError(invalid.message);
      setError("");
      return;
    }

    setPhase("review");
    setFieldError("");
    setError("");
  }

  function handleBack() {
    if (phase === "review") {
      setPhase("questions");
      setStep(Math.max(visibleQuestions.length - 1, 0));
      setFieldError("");
      setError("");
      return;
    }
    if (step > 0) {
      setStep(step - 1);
      setFieldError("");
    }
  }

  async function handleSubmit() {
    if (!survey) return;

    const invalid = firstInvalidQuestionIndex(visibleQuestions, answers);
    if (invalid) {
      setPhase("questions");
      setStep(invalid.index);
      setFieldError(invalid.message);
      setError("");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = visibleQuestions.map((q) => {
      const val = answers[q.id];
      const type = q.type as QuestionType;
      if (isChoiceQuestionType(type)) {
        return {
          questionId: q.id,
          value: serializeChoiceAnswer(parseChoiceAnswer(val, type)),
        };
      }
      return { questionId: q.id, value: String(val ?? "") };
    });

    const res = await fetch(`/api/s/${slug}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: payload,
        fingerprint: getFingerprint(),
        durationMs: Date.now() - startTime,
        preview: previewMode,
        draftToken: draftToken ?? undefined,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      const retryInvalid = firstInvalidQuestionIndex(visibleQuestions, answers);
      if (retryInvalid) {
        setPhase("questions");
        setStep(retryInvalid.index);
        setFieldError(retryInvalid.message);
        setError("");
        return;
      }
      setError(data.error ?? "Senden fehlgeschlagen");
      return;
    }

    localStorage.removeItem(draftStorageKey(slug));
    setPhase("done");
  }

  if (loading) {
    return (
      <>
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <PublicSurveySkeleton />
      </>
    );
  }

  if (closedInfo) {
    return (
      <div className="min-h-dvh kraftstoff-bg flex items-center justify-center p-6">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <div className="card p-10 text-center max-w-md">
          <h1 className="text-xl font-bold mb-2">{closedInfo.title}</h1>
          <p className="text-[var(--text-muted)]">{closedInfo.message}</p>
        </div>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-dvh kraftstoff-bg flex items-center justify-center p-6">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <div className="card p-8 text-center max-w-md">
          <p className="text-[var(--red)] mb-2">{error}</p>
          <p className="mono-label">Kraftstoff Survey</p>
        </div>
      </div>
    );
  }

  if (phase === "done" && survey) {
    const title = previewMode
      ? "Vorschau abgeschlossen"
      : survey.thankYouTitle?.trim() || "Danke!";
    const message = previewMode
      ? "Deine Test-Antworten wurden nicht gespeichert."
      : survey.thankYouMessage?.trim() ||
        "Deine Antworten wurden erfolgreich übermittelt.";

    return (
      <div className="min-h-dvh kraftstoff-bg flex items-center justify-center p-6">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <div className="card p-10 text-center max-w-md">
          <CheckCircle2
            size={48}
            className="text-[var(--green)] mx-auto mb-4"
            strokeWidth={1.75}
          />
          <h1 className="text-2xl font-bold mb-2">{title}</h1>
          <p className="text-[var(--text-muted)]">{message}</p>
          {!previewMode && survey.thankYouLinkUrl && isSafeHttpUrl(survey.thankYouLinkUrl) && (
            <a
              href={survey.thankYouLinkUrl}
              className="btn-primary mt-6 inline-flex"
              target="_blank"
              rel="noopener noreferrer"
            >
              {survey.thankYouLinkLabel?.trim() || "Weiter"}
            </a>
          )}
          <p className="mono-label mt-8 text-[var(--text-tertiary)]">
            powered by Kraftstoff Survey
          </p>
        </div>
      </div>
    );
  }

  if (!survey || visibleQuestions.length === 0) {
    return (
      <div className="min-h-dvh kraftstoff-bg flex items-center justify-center p-6">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <div className="card p-8 text-center">
          <p className="text-[var(--text-muted)]">
            {survey?.questions.length
              ? "Keine Frage passt zu deinen bisherigen Antworten."
              : "Diese Umfrage hat noch keine Fragen."}
          </p>
        </div>
      </div>
    );
  }

  const showIf = current ? parseShowIf(current.showIf) : null;
  const parentQuestion =
    showIf && survey ? survey.questions.find((q) => q.id === showIf.questionId) : undefined;
  const estMinutes = estimateSurveyMinutes(
    survey.questions.length,
    visibleQuestions.length
  );

  return (
    <div className="min-h-dvh kraftstoff-bg flex flex-col">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="px-6 pt-6 max-w-xl mx-auto w-full">
        {previewMode && (
          <div className="mb-4 rounded-[var(--r-sm)] border border-[var(--accent)]/30 bg-[var(--accent-dim)] px-4 py-3 text-sm">
            <span className="mono-label text-[var(--accent)] mr-2">Vorschau</span>
            Antworten werden nicht gespeichert.
          </div>
        )}
        <div className="mb-2 flex justify-between text-sm text-[var(--text-muted)]">
          <span>
            {phase === "review"
              ? "Zusammenfassung"
              : `Frage ${step + 1} von ${visibleQuestions.length}`}
          </span>
          <span className="mono-label">{Math.round(progress)}%</span>
        </div>
        <div
          className="progress-bar mb-8"
          role="progressbar"
          aria-label="Fortschritt"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 pb-8">
        <div className="card w-full max-w-xl p-8">
          {phase === "questions" && step === 0 && (
            <div className="mb-8 pb-6 border-b border-[var(--border-kraftgeon)]">
              <h1 className="text-2xl font-bold mb-2">{survey.title}</h1>
              {survey.description && (
                <p className="text-[var(--text-muted)] mb-3">{survey.description}</p>
              )}
              <p className="text-sm text-[var(--text-muted)]">
                Ca. {estMinutes} Min. · {survey.questions.length} Fragen
              </p>
            </div>
          )}

          {error && phase !== "review" && (
            <div className="mb-4 p-3 rounded-[var(--r-sm)] bg-[var(--red-dim)] text-[var(--red)] text-sm" role="alert">
              {error}
            </div>
          )}

          {phase === "review" ? (
            <PublicSurveyReview questions={visibleQuestions} answers={answers} />
          ) : (
            current && (
              <div
                ref={questionPanelRef}
                className={cn("question-panel", fieldError && "has-error")}
              >
                <QuestionInput
                  question={current}
                  value={answers[current.id]}
                  onChange={(val) => setAnswer(current.id, val)}
                  inputRef={inputRef}
                  onEnter={handleNext}
                  parentQuestionText={parentQuestion?.text}
                  fieldError={fieldError}
                  questionIndex={step}
                  totalQuestions={visibleQuestions.length}
                />
              </div>
            )
          )}

          <div className="flex flex-wrap justify-between mt-8 gap-3">
            <button
              type="button"
              className="btn-ghost"
              onClick={handleBack}
              disabled={phase === "questions" && step === 0}
            >
              Zurück
            </button>
            <div className="flex gap-2">
              {!previewMode && phase === "questions" && (
                <button type="button" className="btn-secondary" onClick={() => void saveDraft()}>
                  Speichern
                </button>
              )}
              {phase === "review" ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Wird gesendet…" : "Jetzt absenden"}
                </button>
              ) : step < visibleQuestions.length - 1 ? (
                <button type="button" className="btn-primary" onClick={handleNext}>
                  Weiter
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={handleNext}>
                  Antworten prüfen
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-4 mono-label text-[var(--text-tertiary)]">
        powered by Kraftstoff Survey
      </footer>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
  inputRef,
  onEnter,
  parentQuestionText,
  fieldError,
  questionIndex,
  totalQuestions,
}: {
  question: SurveyQuestion;
  value: AnswerValue | undefined;
  onChange: (val: AnswerValue) => void;
  inputRef?: React.RefObject<FocusableInput | null>;
  onEnter?: () => void;
  parentQuestionText?: string;
  fieldError?: string;
  questionIndex: number;
  totalQuestions: number;
}) {
  const type = question.type as QuestionType;
  const scaleLabels = scaleHint(type);
  const hintId = `hint-${question.id}`;
  const errorId = `error-${question.id}`;

  return (
    <fieldset className="border-0 p-0 m-0 min-w-0">
      <legend className="sr-only">
        Frage {questionIndex + 1} von {totalQuestions}: {question.text}
      </legend>

      {parentQuestionText && (
        <p className="text-sm text-[var(--text-muted)] mb-3">
          Bezug: „
          {parentQuestionText.length > 60
            ? `${parentQuestionText.slice(0, 60)}…`
            : parentQuestionText}
          “
        </p>
      )}

      <h2 className="text-lg font-medium mb-2" id={`q-${question.id}`}>
        {question.text}
        {question.required && (
          <span className="text-[var(--red)] ml-1" aria-hidden="true">
            *
          </span>
        )}
      </h2>

      <QuestionTypeHint
        type={type}
        required={question.required}
        maxSelections={question.maxSelections}
        id={hintId}
      />

      {(type === QUESTION_TYPES.SHORT_TEXT || type === QUESTION_TYPES.LONG_TEXT) &&
        (type === QUESTION_TYPES.LONG_TEXT ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className="input textarea"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Deine Antwort…"
            aria-labelledby={`q-${question.id}`}
            aria-describedby={fieldError ? errorId : hintId}
            aria-invalid={Boolean(fieldError)}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            className="input"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onEnter?.();
              }
            }}
            placeholder="Deine Antwort…"
            aria-labelledby={`q-${question.id}`}
            aria-describedby={fieldError ? errorId : hintId}
            aria-invalid={Boolean(fieldError)}
          />
        ))}

      {isChoiceQuestionType(type) && (
        <ChoiceQuestionInput
          question={question}
          value={value}
          onChange={onChange}
          inputRef={inputRef}
          onEnter={onEnter}
          labelledBy={`q-${question.id}`}
          describedBy={fieldError ? errorId : hintId}
        />
      )}

      {type === QUESTION_TYPES.YES_NO && (
        <div className="flex gap-3" role="group" aria-labelledby={`q-${question.id}`}>
          {["Ja", "Nein"].map((opt) => (
            <button
              key={opt}
              type="button"
              className={cn("scale-btn flex-1", value === opt && "selected")}
              onClick={() => onChange(value === opt ? "" : opt)}
              aria-pressed={value === opt}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {isScaleType(type) && scaleLabels && (
        <>
          <div className="flex justify-between text-xs text-[var(--text-muted)] mb-2 px-1">
            <span>1 — {scaleLabels.min}</span>
            <span>
              {scaleMax(type)} — {scaleLabels.max}
            </span>
          </div>
          <div className="scale-row" role="group" aria-labelledby={`q-${question.id}`}>
            {Array.from({ length: scaleMax(type) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={cn("scale-btn", value === String(n) && "selected")}
                onClick={() => onChange(value === String(n) ? "" : String(n))}
                aria-pressed={value === String(n)}
                aria-label={`${n} von ${scaleMax(type)}`}
              >
                {n}
              </button>
            ))}
          </div>
        </>
      )}

      {fieldError && (
        <p id={errorId} className="mt-3 text-sm text-[var(--red)]" role="alert">
          {fieldError}
        </p>
      )}
    </fieldset>
  );
}
