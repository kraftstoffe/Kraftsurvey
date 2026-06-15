"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type CreatorLoginFormProps = {
  redirect?: string;
  compact?: boolean;
};

export function CreatorLoginForm({
  redirect = "/dashboard",
  compact = false,
}: CreatorLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Anmeldung fehlgeschlagen");
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-[var(--r-sm)] bg-[var(--red-dim)] text-[var(--red)] text-sm">
          {error}
        </div>
      )}
      <div>
        <label htmlFor={compact ? "landing-email" : "email"} className="mono-label block mb-2">
          E-Mail
        </label>
        <input
          id={compact ? "landing-email" : "email"}
          type="email"
          className="input"
          placeholder={compact ? "du@beispiel.de" : undefined}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div>
        <label
          htmlFor={compact ? "landing-password" : "password"}
          className="mono-label block mb-2"
        >
          Passwort
        </label>
        <input
          id={compact ? "landing-password" : "password"}
          type="password"
          className="input"
          placeholder={compact ? "••••••••" : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Wird angemeldet…" : compact ? "Anmelden →" : "Anmelden"}
      </button>
      <p className="text-sm text-[var(--text-muted)] text-center">
        Noch kein Konto?{" "}
        <Link href="/register" className="text-[var(--accent)] hover:underline">
          Registrieren
        </Link>
      </p>
    </form>
  );
}
