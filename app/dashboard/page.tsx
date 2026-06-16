"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, Copy, CopyPlus, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorMessage, FlashMessage } from "@/components/flash-message";
import { SurveyListSkeleton } from "@/components/skeleton";
import { useFlashMessage } from "@/lib/use-flash-message";
import { formatDate, getAppUrl } from "@/lib/utils";
import { statusClass, statusLabel } from "@/lib/survey-types";

type Survey = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  status: string;
  updatedAt: string;
  isOwner?: boolean;
  owner?: { id: string; email: string };
  _count: { responses: number; questions: number };
};

export default function DashboardPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [deleteSurveyId, setDeleteSurveyId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const { message, variant, showMessage, copyToClipboard } = useFlashMessage();

  useEffect(() => {
    setLoading(true);
    setLoadError("");

    fetch("/api/surveys")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setLoadError(data.error ?? "Umfragen konnten nicht geladen werden");
          setSurveys([]);
          return;
        }
        setSurveys(data.surveys ?? []);
      })
      .catch(() => {
        setLoadError("Verbindungsfehler");
        setSurveys([]);
      })
      .finally(() => setLoading(false));
  }, [retryKey]);

  async function confirmDeleteSurvey() {
    if (!deleteSurveyId) return;
    const surveyId = deleteSurveyId;
    setDeleteSurveyId(null);

    const res = await fetch(`/api/surveys/${surveyId}`, { method: "DELETE" });
    if (res.ok) {
      setSurveys((prev) => prev.filter((s) => s.id !== surveyId));
      return;
    }
    const data = await res.json().catch(() => ({}));
    showMessage(data.error ?? "Löschen fehlgeschlagen", "error");
  }

  function handleDelete(id: string) {
    setDeleteSurveyId(id);
  }

  function copyLink(slug: string) {
    copyToClipboard(`${getAppUrl()}/s/${slug}`);
  }

  async function duplicateSurvey(surveyId: string) {
    setDuplicatingId(surveyId);

    const res = await fetch(`/api/surveys/${surveyId}/duplicate`, { method: "POST" });
    const data = await res.json().catch(() => ({}));

    setDuplicatingId(null);

    if (!res.ok) {
      showMessage(data.error ?? "Kopieren fehlgeschlagen", "error");
      return;
    }

    showMessage("Umfrage kopiert");
    router.push(`/surveys/${data.survey.id}/edit`);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Meine Umfragen</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Erstelle, veröffentliche und analysiere deine Umfragen
          </p>
        </div>
        <Link href="/surveys/new" className="btn-primary">
          <Plus size={18} />
          Neue Umfrage
        </Link>
      </div>

      <FlashMessage message={message} variant={variant} />

      {loading ? (
        <SurveyListSkeleton />
      ) : loadError ? (
        <ErrorMessage message={loadError} onRetry={() => setRetryKey((k) => k + 1)} />
      ) : surveys.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[var(--text-muted)] mb-4">Noch keine Umfragen</p>
          <Link href="/surveys/new" className="btn-primary">
            Erste Umfrage erstellen
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {surveys.map((survey) => (
            <div key={survey.id} className="card-admin p-4 md:p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="font-semibold truncate">{survey.title}</h2>
                    <span className={`status-pill ${statusClass(survey.status)}`}>
                      {statusLabel(survey.status)}
                    </span>
                    {survey.isOwner === false && (
                      <span className="status-pill draft">Geteilt</span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">
                    {survey._count.questions} Fragen · {survey._count.responses} Antworten ·{" "}
                    {formatDate(survey.updatedAt)}
                    {survey.isOwner === false && survey.owner && (
                      <> · von {survey.owner.email}</>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/surveys/${survey.id}/edit`} className="btn-secondary text-sm">
                    <Pencil size={16} />
                    Bearbeiten
                  </Link>
                  <Link href={`/surveys/${survey.id}/results`} className="btn-secondary text-sm">
                    <BarChart3 size={16} />
                    Ergebnisse
                  </Link>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    disabled={duplicatingId === survey.id}
                    onClick={() => duplicateSurvey(survey.id)}
                  >
                    <CopyPlus size={16} />
                    {duplicatingId === survey.id ? "Kopiere…" : "Duplizieren"}
                  </button>
                  {survey.status === "LIVE" && (
                    <>
                      <button
                        type="button"
                        className="btn-ghost text-sm"
                        onClick={() => copyLink(survey.slug)}
                      >
                        <Copy size={16} />
                        Link
                      </button>
                      <a
                        href={`/s/${survey.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost text-sm"
                      >
                        <ExternalLink size={16} />
                        Öffnen
                      </a>
                    </>
                  )}
                  {survey.isOwner !== false && (
                    <button
                      type="button"
                      className="btn-ghost text-sm text-[var(--red)]"
                      onClick={() => handleDelete(survey.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteSurveyId}
        title="Umfrage löschen?"
        description="Die Umfrage und alle Antworten werden dauerhaft gelöscht. Das kann nicht rückgängig gemacht werden."
        confirmLabel="Löschen"
        destructive
        onConfirm={confirmDeleteSurvey}
        onCancel={() => setDeleteSurveyId(null)}
      />
    </div>
  );
}
