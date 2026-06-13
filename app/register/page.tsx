"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || undefined, email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Registrierung fehlgeschlagen");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-dvh kraftstoff-bg kraftgeon-grid flex items-center justify-center p-6">
      <div className="card w-full max-w-md p-8">
        <p className="mono-label mb-2">Ersteller-Konto</p>
        <h1 className="text-2xl font-bold mb-6">Registrieren</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-[var(--r-sm)] bg-[var(--red-dim)] text-[var(--red)] text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="name" className="mono-label block mb-2">
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="email" className="mono-label block mb-2">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mono-label block mb-2">
              Passwort (min. 8 Zeichen)
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Wird erstellt…" : "Konto erstellen"}
          </button>
        </form>

        <p className="text-sm text-[var(--text-muted)] text-center mt-6">
          Bereits registriert?{" "}
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
