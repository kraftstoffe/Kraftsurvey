"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Copy, Download } from "lucide-react";
import { formatDuration, getAppUrl } from "@/lib/utils";
import { QUESTION_TYPES, type QuestionType } from "@/lib/survey-types";

type QuestionStat =
  | {
      questionId: string;
      text: string;
      type: QuestionType;
      distribution: { label: string; count: number; percentage?: number }[];
    }
  | {
      questionId: string;
      text: string;
      type: QuestionType;
      average: number | null;
      distribution: { label: string; count: number }[];
    }
  | {
      questionId: string;
      text: string;
      type: QuestionType;
      textAnswers: string[];
    };

type Stats = {
  totalResponses: number;
  avgDurationMs: number | null;
  completionRate: number;
  questionStats: QuestionStat[];
  rows: Record<string, string>[];
  questions: { id: string; text: string; type: string }[];
};

const CHART_COLORS = ["#8b5cf6", "#bf5af2", "#9d4edd", "#a855f7", "#7c3aed", "#6d28d9"];

export default function ResultsPage() {
  const params = useParams();
  const id = params.id as string;

  const [survey, setSurvey] = useState<{ id: string; title: string; slug: string; status: string } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/surveys/${id}/stats`)
      .then((r) => r.json())
      .then((data) => {
        setSurvey(data.survey ?? null);
        setStats(data.stats ?? null);
        setLoading(false);
      });
  }, [id]);

  const csvContent = useMemo(() => {
    if (!stats) return "";
    const headers = ["id", "createdAt", ...stats.questions.map((q) => q.text)];
    const rows = stats.rows.map((row) =>
      headers.map((h) => {
        const key = h === "id" || h === "createdAt" ? h : stats.questions.find((q) => q.text === h)?.id ?? h;
        const val = row[key] ?? "";
        return `"${String(val).replace(/"/g, '""')}"`;
      })
    );
    return [headers.map((h) => `"${h}"`).join(","), ...rows.map((r) => r.join(","))].join("\n");
  }, [stats]);

  function downloadCsv() {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${survey?.slug ?? "survey"}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyLink() {
    if (!survey) return;
    navigator.clipboard.writeText(`${getAppUrl()}/s/${survey.slug}`);
  }

  if (loading) return <p className="text-[var(--text-muted)]">Laden…</p>;
  if (!survey || !stats) return <p>Keine Daten</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <p className="mono-label mb-1">Ergebnisse</p>
          <h1 className="text-2xl font-bold">{survey.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={copyLink}>
            <Copy size={16} />
            Share-Link
          </button>
          <button type="button" className="btn-primary text-sm" onClick={downloadCsv} disabled={stats.totalResponses === 0}>
            <Download size={16} />
            CSV Export
          </button>
          <Link href={`/surveys/${id}/edit`} className="btn-ghost text-sm">
            ← Builder
          </Link>
        </div>
      </div>

      <div className="kpi-grid mb-8">
        <div className="kpi-card">
          <div className="kpi-value">{stats.totalResponses}</div>
          <div className="kpi-label">Gesamtantworten</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{stats.completionRate}%</div>
          <div className="kpi-label">Abschlussrate</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{formatDuration(stats.avgDurationMs)}</div>
          <div className="kpi-label">Ø Dauer</div>
        </div>
      </div>

      <div className="space-y-8 mb-10">
        {stats.questionStats.map((qs, qi) => (
          <div key={qs.questionId} className="card p-6">
            <h3 className="font-semibold mb-4">{qs.text}</h3>

            {"average" in qs && qs.average != null && (
              <p className="text-[var(--text-muted)] mb-4">
                Durchschnitt: <strong className="text-[var(--foreground)]">{qs.average}</strong>
              </p>
            )}

            {"distribution" in qs && qs.distribution.length > 0 && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  {qs.type === QUESTION_TYPES.SINGLE_CHOICE ||
                  qs.type === QUESTION_TYPES.YES_NO ||
                  qs.type === QUESTION_TYPES.DROPDOWN ? (
                    <PieChart>
                      <Pie
                        data={qs.distribution}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(props) => {
                          const name = String(props.name ?? props.payload?.label ?? "");
                          const pct = (props.payload as { percentage?: number })?.percentage ?? 0;
                          return `${name} (${pct}%)`;
                        }}
                      >
                        {qs.distribution.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface-elevated)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: 8,
                        }}
                      />
                    </PieChart>
                  ) : (
                    <BarChart data={qs.distribution}>
                      <CartesianGrid stroke="var(--border-kraftgeon)" />
                      <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface-elevated)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: 8,
                        }}
                      />
                      <Bar dataKey="count" fill={CHART_COLORS[qi % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}

            {"textAnswers" in qs && (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {qs.textAnswers.length === 0 ? (
                  <li className="text-[var(--text-muted)] text-sm">Keine Antworten</li>
                ) : (
                  qs.textAnswers.map((a, i) => (
                    <li key={i} className="p-3 rounded-[var(--r-sm)] bg-[var(--surface-sunken)] text-sm">
                      {a}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        ))}
      </div>

      {stats.rows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <h3 className="font-semibold">Rohdaten</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  {stats.questions.map((q) => (
                    <th key={q.id}>{q.text}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.rows.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.createdAt).toLocaleString("de-DE")}</td>
                    {stats.questions.map((q) => (
                      <td key={q.id}>{row[q.id] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
