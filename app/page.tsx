import Link from "next/link";
import { BarChart3, Link2, ShieldOff } from "lucide-react";
import { CreatorLoginForm } from "@/components/creator-login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  return (
    <div className="min-h-dvh kraftstoff-bg kraftgeon-grid">
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="font-semibold text-lg">
          Kraftstoff <span className="text-[var(--accent)]">Survey</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn-ghost">
            Anmelden
          </Link>
          <Link href="/register" className="btn-primary">
            Registrieren
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="mono-label mb-4 text-[var(--accent-secondary)]">
              Kraftstoff · Survey Platform
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Umfragen erstellen.
              <br />
              <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
                Antworten sammeln.
              </span>
            </h1>
            <p className="text-[var(--text-muted)] text-lg mb-8 max-w-md">
              Die Umfrageplattform von Kraftstoff — schlank, schnell, ohne Umwege. Teilnehmer brauchen kein Konto,
              du behältst die volle Kontrolle über Ergebnisse.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">
                Kostenlos starten
              </Link>
              <Link href="/login" className="btn-secondary">
                Anmelden
              </Link>
            </div>
          </div>

          <div className="card p-8">
            <h2 className="text-xl font-semibold mb-6">Für Ersteller</h2>
            <CreatorLoginForm compact />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-20">
          {[
            {
              icon: Link2,
              title: "Link teilen",
              desc: "Veröffentliche deine Umfrage und teile den Link — fertig.",
            },
            {
              icon: ShieldOff,
              title: "Kein Login für Teilnehmer",
              desc: "Respondenten füllen die Umfrage direkt aus, ohne Account.",
            },
            {
              icon: BarChart3,
              title: "Live-Ergebnisse",
              desc: "Charts, KPIs und CSV-Export in Echtzeit.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card-admin p-6">
              <Icon size={24} className="text-[var(--accent)] mb-4" />
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-[var(--text-muted)]">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-8 mono-label text-[var(--text-tertiary)]">
        powered by Kraftstoff Survey
      </footer>
    </div>
  );
}
