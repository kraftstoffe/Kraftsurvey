"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  Eye,
  Plus,
  Trash2,
} from "lucide-react";
import {
  defaultLetterOptions,
  getAnswerMode,
  optionLetter,
  parseOptions,
  QUESTION_TYPES,
  textTypeFromVariant,
  type QuestionOption,
  type QuestionType,
} from "@/lib/survey-types";
import { getAppUrl } from "@/lib/utils";

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
  status: string;
  questions: Question[];
};

export default function SurveyEditPage() {
  const params = useParams();
  const id = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/surveys/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSurvey(data.survey ?? null);
        setLoading(false);
      });
  }, [id]);

  async function saveSurvey(updates: Partial<Survey>) {
    if (!survey) return;
    setSaving(true);
    const res = await fetch(`/api/surveys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSurvey(data.survey);
      setMessage("Gespeichert");
      setTimeout(() => setMessage(""), 2000);
    }
  }

  async function addQuestion(mode: "text" | "choice") {
    if (!survey) return;
    const order = survey.questions.length;

    if (mode === "text") {
      const res = await fetch(`/api/surveys/${id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: QUESTION_TYPES.SHORT_TEXT,
          text: "Neue Frage",
          options: null,
          required: false,
          order,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSurvey({ ...survey, questions: [...survey.questions, data.question] });
      }
      return;
    }

    const res = await fetch(`/api/surveys/${id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: QUESTION_TYPES.SINGLE_CHOICE,
        text: "Neue Frage",
        options: JSON.stringify(defaultLetterOptions()),
        required: false,
        order,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setSurvey({ ...survey, questions: [...survey.questions, data.question] });
    }
  }

  async function updateQuestion(
    qid: string,
    updates: Partial<{ type: string; text: string; options: string | null; required: boolean }>
  ) {
    const res = await fetch(`/api/surveys/${id}/questions/${qid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (res.ok && survey) {
      setSurvey({
        ...survey,
        questions: survey.questions.map((q) => (q.id === qid ? data.question : q)),
      });
    }
  }

  async function deleteQuestion(qid: string) {
    if (!confirm("Frage löschen?")) return;
    await fetch(`/api/surveys/${id}/questions/${qid}`, { method: "DELETE" });
    if (survey) {
      setSurvey({
        ...survey,
        questions: survey.questions.filter((q) => q.id !== qid),
      });
    }
  }

  async function moveQuestion(index: number, direction: -1 | 1) {
    if (!survey) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= survey.questions.length) return;

    const questions = [...survey.questions];
    [questions[index], questions[newIndex]] = [questions[newIndex], questions[index]];
    const reordered = questions.map((q, i) => ({ ...q, order: i }));

    setSurvey({ ...survey, questions: reordered });

    await fetch(`/api/surveys/${id}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questions: reordered.map((q) => ({ id: q.id, order: q.order })),
      }),
    });
  }

  function updateQuestionOptions(qid: string, opts: QuestionOption[]) {
    updateQuestion(qid, { options: JSON.stringify(opts) });
  }

  function copyLink() {
    if (!survey) return;
    navigator.clipboard.writeText(`${getAppUrl()}/s/${survey.slug}`);
    setMessage("Link kopiert");
    setTimeout(() => setMessage(""), 2000);
  }

  if (loading) return <p className="text-[var(--text-muted)]">Laden…</p>;
  if (!survey) return <p>Umfrage nicht gefunden</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <p className="mono-label mb-1">Survey Builder</p>
          <h1 className="text-2xl font-bold">{survey.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {survey.status === "LIVE" && (
            <>
              <button type="button" className="btn-secondary text-sm" onClick={copyLink}>
                <Copy size={16} />
                Link
              </button>
              <a
                href={`/s/${survey.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <ExternalLink size={16} />
                Vorschau
              </a>
            </>
          )}
          {survey.status !== "LIVE" && (
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => saveSurvey({ status: "LIVE" })}
              disabled={survey.questions.length === 0}
            >
              <Eye size={16} />
              Veröffentlichen
            </button>
          )}
          {survey.status === "LIVE" && (
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => saveSurvey({ status: "CLOSED" })}
            >
              Schließen
            </button>
          )}
          <Link href={`/surveys/${id}/results`} className="btn-primary text-sm">
            Ergebnisse
          </Link>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-[var(--r-sm)] bg-[var(--green-dim)] text-[var(--green)] text-sm">
          {message}
        </div>
      )}

      <div className="card p-6 mb-6 space-y-4">
        <div>
          <label className="mono-label block mb-2">Titel</label>
          <input
            className="input"
            value={survey.title}
            onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
            onBlur={() => saveSurvey({ title: survey.title, description: survey.description ?? undefined })}
          />
        </div>
        <div>
          <label className="mono-label block mb-2">Beschreibung</label>
          <textarea
            className="input textarea"
            value={survey.description ?? ""}
            onChange={(e) => setSurvey({ ...survey, description: e.target.value })}
            onBlur={() => saveSurvey({ title: survey.title, description: survey.description ?? undefined })}
          />
        </div>
        <p className="mono-label text-[var(--text-tertiary)]">
          slug: {survey.slug} · {saving ? "Speichern…" : survey.status}
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {survey.questions.map((question, index) => (
          <QuestionEditor
            key={question.id}
            question={question}
            index={index}
            total={survey.questions.length}
            onUpdate={(updates) => updateQuestion(question.id, updates)}
            onDelete={() => deleteQuestion(question.id)}
            onMoveUp={() => moveQuestion(index, -1)}
            onMoveDown={() => moveQuestion(index, 1)}
            onOptionsChange={(opts) => updateQuestionOptions(question.id, opts)}
          />
        ))}
      </div>

      <div className="card p-4">
        <p className="mono-label mb-3">Frage hinzufügen</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            className="btn-secondary justify-start p-4 h-auto"
            onClick={() => addQuestion("text")}
          >
            <Plus size={18} className="text-[var(--accent)]" />
            <div className="text-left">
              <div className="font-medium">Textantwort</div>
              <div className="text-xs text-[var(--text-muted)] font-normal mt-0.5">
                Freitext oder längerer Absatz
              </div>
            </div>
          </button>
          <button
            type="button"
            className="btn-secondary justify-start p-4 h-auto"
            onClick={() => addQuestion("choice")}
          >
            <Plus size={18} className="text-[var(--accent)]" />
            <div className="text-left">
              <div className="font-medium">Auswahl A B C D</div>
              <div className="text-xs text-[var(--text-muted)] font-normal mt-0.5">
                Eine Antwort aus mehreren Optionen
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  index,
  total,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onOptionsChange,
}: {
  question: Question;
  index: number;
  total: number;
  onUpdate: (updates: Partial<{ type: string; text: string; options: string | null; required: boolean }>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onOptionsChange: (opts: QuestionOption[]) => void;
}) {
  const type = question.type as QuestionType;
  const answerMode = getAnswerMode(type);
  const options = parseOptions(question.options);
  const textVariant = type === QUESTION_TYPES.LONG_TEXT ? "long" : "short";

  function setAnswerMode(mode: "text" | "choice") {
    if (mode === "text") {
      onUpdate({
        type: QUESTION_TYPES.SHORT_TEXT,
        options: null,
      });
    } else {
      onUpdate({
        type: QUESTION_TYPES.SINGLE_CHOICE,
        options: JSON.stringify(
          options.length >= 2 ? options : defaultLetterOptions()
        ),
      });
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <span className="mono-label">Frage {index + 1}</span>
        <div className="flex gap-1">
          <button type="button" className="btn-ghost p-1" onClick={onMoveUp} disabled={index === 0}>
            <ArrowUp size={16} />
          </button>
          <button type="button" className="btn-ghost p-1" onClick={onMoveDown} disabled={index === total - 1}>
            <ArrowDown size={16} />
          </button>
          <button type="button" className="btn-ghost p-1 text-[var(--red)]" onClick={onDelete}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mono-label mb-2">Antworttyp</p>
          <div className="answer-mode-toggle">
            <button
              type="button"
              className={`answer-mode-btn${answerMode === "text" ? " active" : ""}`}
              onClick={() => setAnswerMode("text")}
            >
              Text
            </button>
            <button
              type="button"
              className={`answer-mode-btn${answerMode === "choice" ? " active" : ""}`}
              onClick={() => setAnswerMode("choice")}
            >
              A B C D
            </button>
          </div>
        </div>

        {answerMode === "text" && (
          <div>
            <p className="mono-label mb-2">Textformat</p>
            <div className="flex gap-2">
              <button
                type="button"
                className={`btn-secondary text-sm flex-1${textVariant === "short" ? " ring-1 ring-[var(--accent)]" : ""}`}
                onClick={() => onUpdate({ type: textTypeFromVariant("short") })}
              >
                Kurztext
              </button>
              <button
                type="button"
                className={`btn-secondary text-sm flex-1${textVariant === "long" ? " ring-1 ring-[var(--accent)]" : ""}`}
                onClick={() => onUpdate({ type: textTypeFromVariant("long") })}
              >
                Absatz
              </button>
            </div>
          </div>
        )}

        {answerMode === "choice" && (
          <div>
            <p className="mono-label mb-2">Antwortoptionen</p>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={opt.id} className="flex gap-2 items-center">
                  <span className="option-letter">{optionLetter(i)}</span>
                  <input
                    className="input flex-1"
                    value={opt.label}
                    placeholder={`Antwort ${optionLetter(i)}`}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = { ...opt, label: e.target.value };
                      onOptionsChange(next);
                    }}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => onOptionsChange(options.filter((o) => o.id !== opt.id))}
                    disabled={options.length <= 2}
                    title={options.length <= 2 ? "Mindestens 2 Optionen" : "Entfernen"}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-ghost text-sm mt-2"
              onClick={() =>
                onOptionsChange([
                  ...options,
                  { id: crypto.randomUUID(), label: optionLetter(options.length) },
                ])
              }
              disabled={options.length >= 26}
            >
              <Plus size={14} />
              Option {optionLetter(options.length)} hinzufügen
            </button>
            <label className="flex items-center gap-2 text-sm text-[var(--text-muted)] mt-3">
              <input
                type="checkbox"
                checked={type === QUESTION_TYPES.MULTIPLE_CHOICE}
                onChange={(e) =>
                  onUpdate({
                    type: e.target.checked
                      ? QUESTION_TYPES.MULTIPLE_CHOICE
                      : QUESTION_TYPES.SINGLE_CHOICE,
                  })
                }
              />
              Mehrere Antworten erlauben
            </label>
          </div>
        )}

        <div>
          <label className="mono-label block mb-2">Frage</label>
          <input
            className="input"
            value={question.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="Fragetext eingeben…"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
          />
          Pflichtfrage
        </label>
      </div>
    </div>
  );
}
