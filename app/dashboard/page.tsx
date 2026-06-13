"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, Copy, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { formatDate, getAppUrl } from "@/lib/utils";
import { statusClass, statusLabel } from "@/lib/survey-types";

type Survey = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  status: string;
  updatedAt: string;
  _count: { responses: number; questions: number };
};

export default function DashboardPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/surveys")
      .then((r) => r.json())
      .then((data) => {
        setSurveys(data.surveys ?? []);
        setLoading(false);
      });
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Umfrage wirklich löschen?")) return;
    await fetch(`/api/surveys/${id}`, { method: "DELETE" });
    setSurveys((prev) => prev.filter((s) => s.id !== id));
  }

  function copyLink(slug: string) {
    const url = `${getAppUrl()}/s/${slug}`;
    navigator.clipboard.writeText(url);
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

      {loading ? (
        <p className="text-[var(--text-muted)]">Laden…</p>
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
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">
                    {survey._count.questions} Fragen · {survey._count.responses} Antworten ·{" "}
                    {formatDate(survey.updatedAt)}
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
                  <button
                    type="button"
                    className="btn-ghost text-sm text-[var(--red)]"
                    onClick={() => handleDelete(survey.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
