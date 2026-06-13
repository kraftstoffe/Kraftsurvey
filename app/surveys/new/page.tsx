"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function NewSurveyPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: description || undefined }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Fehler beim Erstellen");
      return;
    }

    router.push(`/surveys/${data.survey.id}/edit`);
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-2">Neue Umfrage</h1>
      <p className="text-[var(--text-muted)] mb-8">
        Gib deiner Umfrage einen Titel — Fragen fügst du im nächsten Schritt hinzu.
      </p>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {error && (
          <div className="p-3 rounded-[var(--r-sm)] bg-[var(--red-dim)] text-[var(--red)] text-sm">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="title" className="mono-label block mb-2">
            Titel
          </label>
          <input
            id="title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Kundenzufriedenheit Q2"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="mono-label block mb-2">
            Beschreibung (optional)
          </label>
          <textarea
            id="description"
            className="input textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kurze Einleitung für Teilnehmer…"
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Wird erstellt…" : "Weiter zum Builder"}
        </button>
      </form>
    </div>
  );
}
