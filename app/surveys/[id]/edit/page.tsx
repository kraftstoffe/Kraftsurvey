"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  CopyPlus,
  ExternalLink,
  Eye,
  GripVertical,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { ErrorMessage, FlashMessage } from "@/components/flash-message";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SurveyBuilderSkeleton } from "@/components/skeleton";
import { SurveyQrCode } from "@/components/survey-qr-code";
import {
  createOtherOption,
  getOtherOption,
  normalizeOptions,
  parseShowIf,
  type QuestionShowIf,
} from "@/lib/choice-answers";
import {
  defaultLetterOptions,
  getAnswerMode,
  isChoiceType,
  optionLetter,
  parseOptions,
  QUESTION_TYPES,
  statusClass,
  statusLabel,
  textTypeFromVariant,
  type QuestionOption,
  type QuestionType,
} from "@/lib/survey-types";
import { validateQuestionOrder } from "@/lib/show-if-order";
import { useFlashMessage } from "@/lib/use-flash-message";
import { getAppUrl } from "@/lib/utils";

type Question = {
  id: string;
  type: string;
  text: string;
  options: string | null;
  required: boolean;
  showIf: string | null;
  order: number;
};

type Survey = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  status: string;
  thankYouTitle: string | null;
  thankYouMessage: string | null;
  thankYouLinkUrl: string | null;
  thankYouLinkLabel: string | null;
  closedMessage: string | null;
  isOwner?: boolean;
  questions: Question[];
  members?: { id: string; userId: string; user: { email: string; name: string | null } }[];
};

type SurveyMetadata = Pick<
  Survey,
  | "title"
  | "description"
  | "status"
  | "slug"
  | "thankYouTitle"
  | "thankYouMessage"
  | "thankYouLinkUrl"
  | "thankYouLinkLabel"
  | "closedMessage"
>;

export default function SurveyEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [localTitle, setLocalTitle] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
  const [dragQuestionId, setDragQuestionId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [localThankYouTitle, setLocalThankYouTitle] = useState("");
  const [localThankYouMessage, setLocalThankYouMessage] = useState("");
  const [localThankYouLinkUrl, setLocalThankYouLinkUrl] = useState("");
  const [localThankYouLinkLabel, setLocalThankYouLinkLabel] = useState("");
  const [localClosedMessage, setLocalClosedMessage] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [teamMembers, setTeamMembers] = useState<
    { id: string; userId: string; email: string; name: string | null }[]
  >([]);
  const { message, variant, showMessage, copyToClipboard } = useFlashMessage();

  useEffect(() => {
    setLoading(true);
    setLoadError("");

    fetch(`/api/surveys/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setLoadError(data.error ?? "Umfrage konnte nicht geladen werden");
          setSurvey(null);
          return;
        }
        if (!data.survey) {
          setLoadError("Umfrage nicht gefunden");
          setSurvey(null);
          return;
        }
        setSurvey(data.survey);
      })
      .catch(() => {
        setLoadError("Verbindungsfehler");
        setSurvey(null);
      })
      .finally(() => setLoading(false));
  }, [id, retryKey]);

  useEffect(() => {
    if (survey) {
      setLocalTitle(survey.title);
      setLocalDescription(survey.description ?? "");
      setLocalThankYouTitle(survey.thankYouTitle ?? "");
      setLocalThankYouMessage(survey.thankYouMessage ?? "");
      setLocalThankYouLinkUrl(survey.thankYouLinkUrl ?? "");
      setLocalThankYouLinkLabel(survey.thankYouLinkLabel ?? "");
      setLocalClosedMessage(survey.closedMessage ?? "");
      setTeamMembers(
        survey.members?.map((m) => ({
          id: m.id,
          userId: m.userId,
          email: m.user.email,
          name: m.user.name,
        })) ?? []
      );
    }
  }, [survey?.id]);

  async function saveSurvey(updates: Partial<SurveyMetadata>) {
    if (!survey) return;
    setSaving(true);
    const res = await fetch(`/api/surveys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    setSaving(false);

    if (res.ok && data.survey) {
      const saved: SurveyMetadata = data.survey;
      setSurvey((prev) =>
        prev
          ? {
              ...prev,
              title: saved.title,
              description: saved.description,
              status: saved.status,
              slug: saved.slug,
              thankYouTitle: saved.thankYouTitle,
              thankYouMessage: saved.thankYouMessage,
              thankYouLinkUrl: saved.thankYouLinkUrl,
              thankYouLinkLabel: saved.thankYouLinkLabel,
              closedMessage: saved.closedMessage,
            }
          : null
      );
      if (updates.title !== undefined) setLocalTitle(saved.title);
      if (updates.description !== undefined) setLocalDescription(saved.description ?? "");
      showMessage("Gespeichert");
    } else {
      showMessage(data.error ?? "Speichern fehlgeschlagen", "error");
    }
  }

  function saveMetadata() {
    if (!survey) return;
    const desc = localDescription.trim() || null;
    const updates: Partial<SurveyMetadata> = {};
    if (localTitle !== survey.title) updates.title = localTitle;
    if (desc !== survey.description) updates.description = localDescription || undefined;
    if (Object.keys(updates).length > 0) saveSurvey(updates);
  }

  function saveSettings() {
    if (!survey) return;
    saveSurvey({
      thankYouTitle: localThankYouTitle.trim() || null,
      thankYouMessage: localThankYouMessage.trim() || null,
      thankYouLinkUrl: localThankYouLinkUrl.trim() || null,
      thankYouLinkLabel: localThankYouLinkLabel.trim() || null,
      closedMessage: localClosedMessage.trim() || null,
    });
  }

  async function inviteMember() {
    if (!inviteEmail.trim()) return;
    const res = await fetch(`/api/surveys/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });
    const data = await res.json();
    if (res.ok && data.member) {
      setTeamMembers((prev) => {
        if (prev.some((m) => m.userId === data.member.userId)) {
          return prev.map((m) => (m.userId === data.member.userId ? data.member : m));
        }
        return [...prev, data.member];
      });
      setInviteEmail("");
      showMessage("Mitglied hinzugefügt");
      return;
    }
    showMessage(data.error ?? "Einladung fehlgeschlagen", "error");
  }

  async function removeMember(userId: string) {
    const res = await fetch(`/api/surveys/${id}/members?userId=${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setTeamMembers((prev) => prev.filter((m) => m.userId !== userId));
      showMessage("Mitglied entfernt");
      return;
    }
    const data = await res.json().catch(() => ({}));
    showMessage(data.error ?? "Entfernen fehlgeschlagen", "error");
  }

  async function persistQuestionOrder(reordered: Question[], previous: Question[]) {
    const orderError = validateQuestionOrder(
      reordered.map((q) => ({ id: q.id, order: q.order, showIf: q.showIf }))
    );
    if (orderError) {
      showMessage(orderError, "error");
      return false;
    }

    setSurvey((s) => (s ? { ...s, questions: reordered } : s));

    const res = await fetch(`/api/surveys/${id}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questions: reordered.map((q) => ({ id: q.id, order: q.order })),
      }),
    });

    if (!res.ok) {
      setSurvey((s) => (s ? { ...s, questions: previous } : s));
      showMessage("Reihenfolge konnte nicht gespeichert werden", "error");
      return false;
    }
    return true;
  }

  async function reorderQuestions(fromId: string, toId: string) {
    if (!survey || fromId === toId) return;
    const fromIndex = survey.questions.findIndex((q) => q.id === fromId);
    const toIndex = survey.questions.findIndex((q) => q.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const questions = [...survey.questions];
    const [moved] = questions.splice(fromIndex, 1);
    questions.splice(toIndex, 0, moved);
    const reordered = questions.map((q, i) => ({ ...q, order: i }));

    await persistQuestionOrder(reordered, survey.questions);
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
      } else {
        showMessage(data.error ?? "Frage konnte nicht erstellt werden", "error");
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
    } else {
      showMessage(data.error ?? "Frage konnte nicht erstellt werden", "error");
    }
  }

  async function updateQuestion(
    qid: string,
    updates: Partial<{
      type: string;
      text: string;
      options: string | null;
      required: boolean;
      showIf: string | null;
    }>
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

  async function confirmDeleteQuestion() {
    if (!deleteQuestionId || !survey) return;
    const qid = deleteQuestionId;
    setDeleteQuestionId(null);

    const res = await fetch(`/api/surveys/${id}/questions/${qid}`, { method: "DELETE" });
    if (res.ok) {
      setSurvey({
        ...survey,
        questions: survey.questions.filter((q) => q.id !== qid),
      });
      return;
    }
    const data = await res.json().catch(() => ({}));
    showMessage(data.error ?? "Löschen fehlgeschlagen", "error");
  }

  async function deleteQuestion(qid: string) {
    setDeleteQuestionId(qid);
  }

  async function moveQuestion(index: number, direction: -1 | 1) {
    if (!survey) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= survey.questions.length) return;

    const questions = [...survey.questions];
    [questions[index], questions[newIndex]] = [questions[newIndex], questions[index]];
    const reordered = questions.map((q, i) => ({ ...q, order: i }));

    await persistQuestionOrder(reordered, survey.questions);
  }

  function updateQuestionOptions(qid: string, opts: QuestionOption[]) {
    updateQuestion(qid, { options: JSON.stringify(opts) });
  }

  async function addFollowUpForOther(parent: Question) {
    if (!survey) return;
    const short =
      parent.text.length > 50 ? `${parent.text.slice(0, 50)}…` : parent.text;

    const res = await fetch(`/api/surveys/${id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: QUESTION_TYPES.SHORT_TEXT,
        text: `Falls du „Sonstige“ bei „${short}“ gewählt hast — bitte genauer angeben:`,
        options: null,
        required: false,
        order: survey.questions.length,
        showIf: JSON.stringify({
          questionId: parent.id,
          when: "includes_other",
        } satisfies QuestionShowIf),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setSurvey({ ...survey, questions: [...survey.questions, data.question] });
      showMessage("Folgefrage hinzugefügt (nur sichtbar bei Sonstige)");
    } else {
      showMessage(data.error ?? "Folgefrage konnte nicht erstellt werden", "error");
    }
  }

  function copyLink() {
    if (!survey) return;
    copyToClipboard(`${getAppUrl()}/s/${survey.slug}`);
  }

  async function duplicateSurvey() {
    setDuplicating(true);

    const res = await fetch(`/api/surveys/${id}/duplicate`, { method: "POST" });
    const data = await res.json().catch(() => ({}));

    setDuplicating(false);

    if (!res.ok) {
      showMessage(data.error ?? "Kopieren fehlgeschlagen", "error");
      return;
    }

    showMessage("Kopie erstellt — du bearbeitest jetzt die neue Umfrage");
    router.push(`/surveys/${data.survey.id}/edit`);
  }

  if (loading) return <SurveyBuilderSkeleton />;
  if (loadError) {
    return (
      <ErrorMessage message={loadError} onRetry={() => setRetryKey((k) => k + 1)} />
    );
  }
  if (!survey) return <p>Umfrage nicht gefunden</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <p className="mono-label">Survey Builder</p>
            <span className={`status-pill ${statusClass(survey.status)}`}>
              {statusLabel(survey.status)}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{localTitle || survey.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={duplicating}
            onClick={duplicateSurvey}
          >
            <CopyPlus size={16} />
            {duplicating ? "Kopiere…" : "Duplizieren"}
          </button>
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
              onClick={() => {
                saveSurvey({
                  status: "CLOSED",
                  closedMessage: localClosedMessage.trim() || null,
                  thankYouTitle: localThankYouTitle.trim() || null,
                  thankYouMessage: localThankYouMessage.trim() || null,
                  thankYouLinkUrl: localThankYouLinkUrl.trim() || null,
                  thankYouLinkLabel: localThankYouLinkLabel.trim() || null,
                });
              }}
            >
              Schließen
            </button>
          )}
          <Link href={`/surveys/${id}/results`} className="btn-primary text-sm">
            Ergebnisse
          </Link>
        </div>
      </div>

      <FlashMessage message={message} variant={variant} />

      <div className="card p-6 mb-6 space-y-4">
        <div>
          <label htmlFor="survey-title" className="mono-label block mb-2">
            Titel
          </label>
          <input
            id="survey-title"
            className="input"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={saveMetadata}
          />
        </div>
        <div>
          <label htmlFor="survey-description" className="mono-label block mb-2">
            Beschreibung
          </label>
          <textarea
            id="survey-description"
            className="input textarea"
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            onBlur={saveMetadata}
          />
        </div>
        <p className="mono-label text-[var(--text-tertiary)]">
          slug: {survey.slug}
          {saving ? " · Speichern…" : ""}
        </p>
      </div>

      {survey.status === "LIVE" && (
        <div className="card p-6 mb-6 flex flex-col sm:flex-row gap-6 items-center">
          <SurveyQrCode
            url={`${getAppUrl()}/s/${survey.slug}`}
            filename={`${survey.slug}-qr.png`}
          />
          <div className="text-sm text-[var(--text-muted)]">
            <p className="font-medium text-[var(--foreground)] mb-1">Teilen per QR-Code</p>
            <p>Scan für Poster, Präsentationen oder Discord.</p>
            <p className="mono-label mt-2 break-all">{getAppUrl()}/s/{survey.slug}</p>
          </div>
        </div>
      )}

      <div className="card p-6 mb-6 space-y-4">
        <p className="mono-label">Abschlussseite</p>
        <div>
          <label className="mono-label block mb-2">Titel nach Absenden</label>
          <input
            className="input"
            value={localThankYouTitle}
            onChange={(e) => setLocalThankYouTitle(e.target.value)}
            onBlur={saveSettings}
            placeholder="Danke!"
          />
        </div>
        <div>
          <label className="mono-label block mb-2">Nachricht</label>
          <textarea
            className="input textarea"
            value={localThankYouMessage}
            onChange={(e) => setLocalThankYouMessage(e.target.value)}
            onBlur={saveSettings}
            placeholder="Deine Antworten wurden erfolgreich übermittelt."
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="mono-label block mb-2">Button-Link (URL)</label>
            <input
              className="input"
              value={localThankYouLinkUrl}
              onChange={(e) => setLocalThankYouLinkUrl(e.target.value)}
              onBlur={saveSettings}
              placeholder="https://…"
            />
          </div>
          <div>
            <label className="mono-label block mb-2">Button-Text</label>
            <input
              className="input"
              value={localThankYouLinkLabel}
              onChange={(e) => setLocalThankYouLinkLabel(e.target.value)}
              onBlur={saveSettings}
              placeholder="Zur App"
            />
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6 space-y-3">
        <p className="mono-label">Umfrage geschlossen</p>
        <p className="text-sm text-[var(--text-muted)]">
          Dieser Text erscheint, wenn die Umfrage geschlossen ist (statt einer leeren Fehlerseite).
        </p>
        <textarea
          className="input textarea"
          value={localClosedMessage}
          onChange={(e) => setLocalClosedMessage(e.target.value)}
          onBlur={saveSettings}
          placeholder="z. B. Die Bewerbungsphase ist beendet. Vielen Dank für dein Interesse!"
        />
      </div>

      {survey.isOwner !== false && (
        <div className="card p-6 mb-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[var(--accent)]" />
            <p className="mono-label">Team-Zugang</p>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Weitere Ersteller per E-Mail hinzufügen (Account muss existieren).
          </p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="kollege@example.com"
            />
            <button type="button" className="btn-secondary" onClick={inviteMember}>
              Hinzufügen
            </button>
          </div>
          {teamMembers.length > 0 && (
            <ul className="space-y-2">
              {teamMembers.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-[var(--r-sm)] bg-[var(--surface-sunken)] text-sm"
                >
                  <span>{m.email}</span>
                  <button
                    type="button"
                    className="btn-ghost text-[var(--red)] p-1"
                    onClick={() => removeMember(m.userId)}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteQuestionId}
        title="Frage löschen?"
        description="Diese Frage wird dauerhaft aus der Umfrage entfernt."
        confirmLabel="Löschen"
        destructive
        onConfirm={confirmDeleteQuestion}
        onCancel={() => setDeleteQuestionId(null)}
      />

      <div className="space-y-4 mb-6">
        {survey.questions.map((question, index) => (
          <div
            key={question.id}
            className={`question-card${dragQuestionId === question.id ? " dragging" : ""}${dragOverId === question.id ? " drag-over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragQuestionId && dragQuestionId !== question.id) {
                setDragOverId(question.id);
              }
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverId(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const fromId = e.dataTransfer.getData("text/question-id");
              if (fromId) void reorderQuestions(fromId, question.id);
              setDragQuestionId(null);
              setDragOverId(null);
            }}
          >
            <QuestionEditor
              question={question}
              index={index}
              total={survey.questions.length}
              priorQuestions={survey.questions.slice(0, index)}
              onUpdate={(updates) => updateQuestion(question.id, updates)}
              onDelete={() => deleteQuestion(question.id)}
              onMoveUp={() => moveQuestion(index, -1)}
              onMoveDown={() => moveQuestion(index, 1)}
              onOptionsChange={(opts) => updateQuestionOptions(question.id, opts)}
              onAddFollowUp={() => addFollowUpForOther(question)}
              onDragHandleStart={(e) => {
                e.dataTransfer.setData("text/question-id", question.id);
                e.dataTransfer.effectAllowed = "move";
                setDragQuestionId(question.id);
              }}
              onDragHandleEnd={() => {
                setDragQuestionId(null);
                setDragOverId(null);
              }}
            />
          </div>
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
  priorQuestions,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onOptionsChange,
  onAddFollowUp,
  onDragHandleStart,
  onDragHandleEnd,
}: {
  question: Question;
  index: number;
  total: number;
  priorQuestions: Question[];
  onUpdate: (
    updates: Partial<{
      type: string;
      text: string;
      options: string | null;
      required: boolean;
      showIf: string | null;
    }>
  ) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onOptionsChange: (opts: QuestionOption[]) => void;
  onAddFollowUp: () => void;
  onDragHandleStart: (e: React.DragEvent) => void;
  onDragHandleEnd: () => void;
}) {
  const type = question.type as QuestionType;
  const answerMode = getAnswerMode(type);
  const textVariant = type === QUESTION_TYPES.LONG_TEXT ? "long" : "short";
  const showIf = parseShowIf(question.showIf);
  const choiceParents = priorQuestions.filter((q) => isChoiceType(q.type as QuestionType));

  const [localText, setLocalText] = useState(question.text);
  const [localOptions, setLocalOptions] = useState<QuestionOption[]>(() =>
    parseOptions(question.options)
  );
  const hasOther = Boolean(getOtherOption(localOptions));
  const [showIfEnabled, setShowIfEnabled] = useState(Boolean(showIf));
  const [showIfParentId, setShowIfParentId] = useState(showIf?.questionId ?? "");
  const [showIfWhen, setShowIfWhen] = useState<QuestionShowIf["when"]>(
    showIf?.when ?? "includes_other"
  );
  const [showIfOptionId, setShowIfOptionId] = useState(showIf?.optionId ?? "");

  useEffect(() => {
    setLocalText(question.text);
    setLocalOptions(parseOptions(question.options));
    const parsed = parseShowIf(question.showIf);
    setShowIfEnabled(Boolean(parsed));
    setShowIfParentId(parsed?.questionId ?? "");
    setShowIfWhen(parsed?.when ?? "includes_other");
    setShowIfOptionId(parsed?.optionId ?? "");
  }, [question.id, question.showIf, question.options, question.text]);

  function saveText() {
    if (localText !== question.text) {
      onUpdate({ text: localText });
    }
  }

  function saveOptions(next?: QuestionOption[]) {
    const opts = next ?? localOptions;
    const serialized = JSON.stringify(opts);
    if (serialized !== question.options) {
      onOptionsChange(opts);
    }
  }

  function setAnswerMode(mode: "text" | "choice") {
    if (mode === "text") {
      onUpdate({
        type: QUESTION_TYPES.SHORT_TEXT,
        options: null,
      });
    } else {
      const opts = localOptions.length >= 2 ? localOptions : defaultLetterOptions();
      setLocalOptions(opts);
      onUpdate({
        type: QUESTION_TYPES.SINGLE_CHOICE,
        options: JSON.stringify(opts),
      });
    }
  }

  function setLocalOptionLabel(index: number, label: string) {
    setLocalOptions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], label };
      return next;
    });
  }

  function toggleOptionAllowText(index: number) {
    setLocalOptions((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        allowText: !next[index].allowText,
        textPlaceholder: next[index].allowText
          ? undefined
          : next[index].textPlaceholder ?? "Ergänzung…",
      };
      saveOptions(next);
      return next;
    });
  }

  function removeLocalOption(id: string) {
    const next = localOptions.filter((o) => o.id !== id);
    setLocalOptions(next);
    onOptionsChange(next);
  }

  function addLocalOption() {
    const next = [
      ...localOptions,
      { id: crypto.randomUUID(), label: optionLetter(localOptions.length) },
    ];
    setLocalOptions(next);
    onOptionsChange(next);
  }

  function addOtherOption() {
    if (getOtherOption(localOptions)) return;
    const next = [...localOptions, createOtherOption()];
    setLocalOptions(next);
    onOptionsChange(next);
  }

  function saveShowIf(
    enabled: boolean,
    parentId: string,
    when: QuestionShowIf["when"],
    optionId: string
  ) {
    if (!enabled || !parentId) {
      if (question.showIf) onUpdate({ showIf: null });
      return;
    }

    const payload: QuestionShowIf = { questionId: parentId, when };
    if (when === "includes_option" || when === "includes_option_with_text") {
      if (!optionId) return;
      payload.optionId = optionId;
    }

    const serialized = JSON.stringify(payload);
    if (serialized !== question.showIf) {
      onUpdate({ showIf: serialized });
    }
  }

  function handleShowIfToggle(enabled: boolean) {
    setShowIfEnabled(enabled);
    if (!enabled) {
      onUpdate({ showIf: null });
      return;
    }
    const parentId = showIfParentId || choiceParents[0]?.id || "";
    setShowIfParentId(parentId);
    saveShowIf(enabled, parentId, showIfWhen, showIfOptionId);
  }

  const parentQuestion = choiceParents.find((q) => q.id === showIfParentId);
  const parentOptions = parentQuestion
    ? normalizeOptions(parseOptions(parentQuestion.options))
    : [];
  const parentHasOther = Boolean(getOtherOption(parentOptions));

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="drag-handle btn-ghost p-1"
            draggable
            onDragStart={onDragHandleStart}
            onDragEnd={onDragHandleEnd}
            aria-label="Frage verschieben"
            title="Ziehen zum Sortieren"
          >
            <GripVertical size={18} />
          </button>
          <span className="mono-label">Frage {index + 1}</span>
        </div>
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
              {localOptions.map((opt, i) => (
                <div key={opt.id} className="space-y-1">
                  <div className="flex gap-2 items-center">
                    <span className="option-letter">{optionLetter(i)}</span>
                    <input
                      className="input flex-1"
                      value={opt.label}
                      placeholder={`Antwort ${optionLetter(i)}`}
                      onChange={(e) => setLocalOptionLabel(i, e.target.value)}
                      onBlur={() => saveOptions()}
                    />
                    {opt.kind === "other" && (
                      <span className="text-xs text-[var(--accent)] shrink-0">Sonstige</span>
                    )}
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => removeLocalOption(opt.id)}
                      disabled={localOptions.length <= 2}
                      title={localOptions.length <= 2 ? "Mindestens 2 Optionen" : "Entfernen"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {opt.kind !== "other" && (
                    <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] ml-8">
                      <input
                        type="checkbox"
                        checked={opt.allowText === true}
                        onChange={() => toggleOptionAllowText(i)}
                      />
                      Zusatzfeld bei Auswahl
                    </label>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={addLocalOption}
                disabled={localOptions.length >= 26}
              >
                <Plus size={14} />
                Option {optionLetter(localOptions.length)} hinzufügen
              </button>
              {!getOtherOption(localOptions) && (
                <button type="button" className="btn-ghost text-sm" onClick={addOtherOption}>
                  <Plus size={14} />
                  Sonstige hinzufügen
                </button>
              )}
              {hasOther && (
                <button type="button" className="btn-ghost text-sm" onClick={onAddFollowUp}>
                  <Plus size={14} />
                  Folgefrage (Sonstige)
                </button>
              )}
            </div>
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

        {choiceParents.length > 0 && (
          <div className="border border-[var(--border)] rounded-lg p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showIfEnabled}
                onChange={(e) => handleShowIfToggle(e.target.checked)}
              />
              Nur anzeigen wenn…
            </label>
            {showIfEnabled && (
              <div className="grid sm:grid-cols-2 gap-2">
                <select
                  className="input select text-sm"
                  value={showIfParentId}
                  onChange={(e) => {
                    const parentId = e.target.value;
                    setShowIfParentId(parentId);
                    saveShowIf(true, parentId, showIfWhen, showIfOptionId);
                  }}
                >
                  <option value="">Vorherige Frage…</option>
                  {choiceParents.map((q, i) => (
                    <option key={q.id} value={q.id}>
                      Frage {i + 1}: {q.text.slice(0, 40)}
                      {q.text.length > 40 ? "…" : ""}
                    </option>
                  ))}
                </select>
                <select
                  className="input select text-sm"
                  value={showIfWhen}
                  onChange={(e) => {
                    const when = e.target.value as QuestionShowIf["when"];
                    setShowIfWhen(when);
                    saveShowIf(true, showIfParentId, when, showIfOptionId);
                  }}
                >
                  {parentHasOther && (
                    <option value="includes_other">… Sonstige gewählt</option>
                  )}
                  <option value="includes_option">… Option gewählt</option>
                  <option value="includes_option_with_text">… Option mit Zusatztext</option>
                </select>
                {(showIfWhen === "includes_option" ||
                  showIfWhen === "includes_option_with_text") && (
                  <select
                    className="input select text-sm sm:col-span-2"
                    value={showIfOptionId}
                    onChange={(e) => {
                      const optionId = e.target.value;
                      setShowIfOptionId(optionId);
                      saveShowIf(true, showIfParentId, showIfWhen, optionId);
                    }}
                  >
                    <option value="">Option wählen…</option>
                    {parentOptions.map((opt, i) => (
                      <option key={opt.id} value={opt.id}>
                        {optionLetter(i)} — {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="mono-label block mb-2">Frage</label>
          <input
            className="input"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={saveText}
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
