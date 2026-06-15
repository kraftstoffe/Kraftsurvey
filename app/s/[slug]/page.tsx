"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { PublicSurveySkeleton } from "@/components/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  isScaleType,
  optionLetter,
  parseOptions,
  scaleMax,
  QUESTION_TYPES,
  type QuestionType,
} from "@/lib/survey-types";
import { cn } from "@/lib/utils";

type Question = {
  id: string;
  type: string;
  text: string;
  options: string | null;
  required: boolean;
  order: number;
};

type Survey = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  questions: Question[];
};

type Answers = Record<string, string | string[]>;

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

export default function PublicSurveyPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const startTime = useMemo(() => Date.now(), []);
  const inputRef = useRef<FocusableInput>(null);

  useEffect(() => {
    fetch(`/api/s/${slug}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Umfrage nicht gefunden");
          setLoading(false);
          return;
        }
        setSurvey(data.survey);
        setLoading(false);
      })
      .catch(() => {
        setError("Verbindungsfehler");
        setLoading(false);
      });
  }, [slug]);

  const questions = survey?.questions ?? [];
  const current = questions[step];
  const progress = questions.length > 0 ? ((step + 1) / questions.length) * 100 : 0;

  useEffect(() => {
    if (!current) return;
    const type = current.type as QuestionType;
    const shouldFocus =
      type === QUESTION_TYPES.SHORT_TEXT ||
      type === QUESTION_TYPES.LONG_TEXT ||
      type === QUESTION_TYPES.DROPDOWN;

    if (!shouldFocus) return;

    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [step, current?.id]);

  function setAnswer(questionId: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function validateCurrent(): boolean {
    if (!current) return true;
    if (!current.required) return true;
    const val = answers[current.id];
    if (val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) {
      setError("Bitte beantworte diese Pflichtfrage");
      return false;
    }
    setError("");
    return true;
  }

  function handleNext() {
    if (!validateCurrent()) return;
    if (step < questions.length - 1) {
      setStep(step + 1);
      setError("");
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep(step - 1);
      setError("");
    }
  }

  function handlePrimaryAction() {
    if (step < questions.length - 1) handleNext();
    else handleSubmit();
  }

  async function handleSubmit() {
    if (!validateCurrent() || !survey) return;
    setSubmitting(true);

    const payload = questions.map((q) => {
      const val = answers[q.id];
      if (q.type === QUESTION_TYPES.MULTIPLE_CHOICE && Array.isArray(val)) {
        return { questionId: q.id, value: JSON.stringify(val) };
      }
      return { questionId: q.id, value: String(val ?? "") };
    });

    const res = await fetch(`/api/s/${slug}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: payload.filter((a) => a.value !== ""),
        fingerprint: getFingerprint(),
        durationMs: Date.now() - startTime,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Senden fehlgeschlagen");
      return;
    }

    setDone(true);
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

  if (done) {
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
          <h1 className="text-2xl font-bold mb-2">Danke!</h1>
          <p className="text-[var(--text-muted)]">
            Deine Antworten wurden erfolgreich übermittelt.
          </p>
          <p className="mono-label mt-8 text-[var(--text-tertiary)]">
            powered by Kraftstoff Survey
          </p>
        </div>
      </div>
    );
  }

  if (!survey || questions.length === 0) {
    return (
      <div className="min-h-dvh kraftstoff-bg flex items-center justify-center p-6">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <div className="card p-8 text-center">
          <p className="text-[var(--text-muted)]">Diese Umfrage hat noch keine Fragen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh kraftstoff-bg flex flex-col">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="px-6 pt-6 max-w-xl mx-auto w-full">
        <div className="mb-2 flex justify-between text-sm text-[var(--text-muted)]">
          <span>
            Frage {step + 1} von {questions.length}
          </span>
          <span className="mono-label">{Math.round(progress)}%</span>
        </div>
        <div className="progress-bar mb-8">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 pb-8">
        <div className="card w-full max-w-xl p-8">
          {step === 0 && (
            <div className="mb-8 pb-6 border-b border-[var(--border-kraftgeon)]">
              <h1 className="text-2xl font-bold mb-2">{survey.title}</h1>
              {survey.description && (
                <p className="text-[var(--text-muted)]">{survey.description}</p>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-[var(--r-sm)] bg-[var(--red-dim)] text-[var(--red)] text-sm">
              {error}
            </div>
          )}

          <QuestionInput
            question={current}
            value={answers[current.id]}
            onChange={(val) => setAnswer(current.id, val)}
            inputRef={inputRef}
            onEnter={handlePrimaryAction}
          />

          <div className="flex justify-between mt-8 gap-3">
            <button
              type="button"
              className="btn-ghost"
              onClick={handleBack}
              disabled={step === 0}
            >
              Zurück
            </button>
            {step < questions.length - 1 ? (
              <button type="button" className="btn-primary" onClick={handleNext}>
                Weiter
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Wird gesendet…" : "Absenden"}
              </button>
            )}
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
}: {
  question: Question;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
  inputRef?: React.RefObject<FocusableInput | null>;
  onEnter?: () => void;
}) {
  const type = question.type as QuestionType;
  const options = parseOptions(question.options);

  return (
    <div>
      <h2 className="text-lg font-medium mb-6">
        {question.text}
        {question.required && <span className="text-[var(--red)] ml-1">*</span>}
      </h2>

      {(type === QUESTION_TYPES.SHORT_TEXT || type === QUESTION_TYPES.LONG_TEXT) &&
        (type === QUESTION_TYPES.LONG_TEXT ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className="input textarea"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Deine Antwort…"
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
          />
        ))}

      {(type === QUESTION_TYPES.SINGLE_CHOICE || type === QUESTION_TYPES.DROPDOWN) &&
        (type === QUESTION_TYPES.DROPDOWN ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="input select"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Bitte wählen…</option>
            {options.map((opt, i) => (
              <option key={opt.id} value={opt.label}>
                {optionLetter(i)} — {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-2">
            {options.map((opt, i) => (
              <label
                key={opt.id}
                className={cn("radio-option", value === opt.label && "selected")}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={value === opt.label}
                  onChange={() => onChange(opt.label)}
                  className="accent-[var(--accent)]"
                />
                <span className="option-letter">{optionLetter(i)}</span>
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        ))}

      {type === QUESTION_TYPES.MULTIPLE_CHOICE && (
        <div className="space-y-2">
          {options.map((opt, i) => {
            const selected = Array.isArray(value) && value.includes(opt.label);
            return (
              <label
                key={opt.id}
                className={cn("checkbox-option", selected && "selected")}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const current = Array.isArray(value) ? value : [];
                    if (selected) {
                      onChange(current.filter((v) => v !== opt.label));
                    } else {
                      onChange([...current, opt.label]);
                    }
                  }}
                  className="accent-[var(--accent)]"
                />
                <span className="option-letter">{optionLetter(i)}</span>
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {type === QUESTION_TYPES.YES_NO && (
        <div className="flex gap-3">
          {["Ja", "Nein"].map((opt) => (
            <button
              key={opt}
              type="button"
              className={cn("scale-btn flex-1", value === opt && "selected")}
              onClick={() => onChange(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {isScaleType(type) && (
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: scaleMax(type) }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={cn("scale-btn", value === String(n) && "selected")}
              onClick={() => onChange(String(n))}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
