"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
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
    <div className="min-h-dvh kraftstoff-bg kraftgeon-grid flex items-center justify-center p-6">
      <div className="card w-full max-w-md p-8">
        <p className="mono-label mb-2">Ersteller-Login</p>
        <h1 className="text-2xl font-bold mb-6">Anmelden</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-[var(--r-sm)] bg-[var(--red-dim)] text-[var(--red)] text-sm">
              {error}
            </div>
          )}
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
              Passwort
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Wird angemeldet…" : "Anmelden"}
          </button>
        </form>

        <p className="text-sm text-[var(--text-muted)] text-center mt-6">
          Noch kein Konto?{" "}
          <Link href="/register" className="text-[var(--accent)] hover:underline">
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
