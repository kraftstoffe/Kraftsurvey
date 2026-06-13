# Kraftstoff Survey

Google-Forms-ähnliche Umfrageplattform im Kraftstoff-Design.

## Features

- **Ersteller-Login** — Registrierung und Anmeldung für Umfrage-Ersteller
- **Kein Login für Teilnehmer** — Öffentliche Umfragen über Share-Link
- **Survey Builder** — 8 Fragetypen, Pflichtfelder, Reihenfolge
- **Ergebnisse** — KPIs, Charts, CSV-Export
- **Kraftstoff Design** — Dark OLED + Lavender-Mist Light Theme

## Setup

### Option A — Docker (empfohlen)

```bash
cp .env.example .env
# JWT_SECRET in .env anpassen (optional)
npm run docker:up
```

App: [http://localhost:3000](http://localhost:3000)

```bash
npm run docker:logs   # Logs
npm run docker:down   # Stoppen
```

### Option B — Lokal mit Node

PostgreSQL muss laufen (z. B. nur DB via Docker):

```bash
docker compose up -d postgres
cp .env.example .env
npm install
npm run db:push
npm run dev
```

## Umgebungsvariablen

Siehe `.env.example`:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Geheimer Schlüssel für Sessions
- `NEXT_PUBLIC_APP_URL` — Basis-URL für Share-Links
- `PORT` — Host-Port für Docker Compose (Standard: 3000)

## Stack

- Next.js 16, React 19, Tailwind CSS 4
- Prisma + PostgreSQL
- JWT Auth (jose + bcryptjs)
- Recharts
