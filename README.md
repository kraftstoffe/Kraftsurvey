# Kraftstoff Survey

Umfrageplattform im Kraftstoff-Design.

## Features

- **Ersteller-Login** — Registrierung und Anmeldung für Umfrage-Ersteller
- **Kein Login für Teilnehmer** — Öffentliche Umfragen über Share-Link
- **Survey Builder** — 8 Fragetypen, Pflichtfelder, Reihenfolge
- **Ergebnisse** — KPIs, Charts, CSV-Export
- **Kraftstoff Design** — Dark OLED + Lavender-Mist Light Theme

## Production (survey.kraftstoff.app)

Deploy via **Coolify** on the Kraftstoff VPS. Full guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

Quick checklist:

1. DNS: `survey.kraftstoff.app` → A → same VPS IP as `kraftstoff.app`
2. Coolify: new Docker Compose app from `kraftstoffe/Kraftsurvey`
3. Compose file: `docker-compose.yml`
4. Domain: `https://survey.kraftstoff.app:3000`
5. Env: `POSTGRES_PASSWORD`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL` — **not** `DATABASE_URL` ([details](docs/COOLIFY-DATABASE.md))
6. Redeploy script: `npm run deploy:coolify` (see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md))

## Setup (local)

### Option A — Docker (local dev)

```bash
docker compose -f docker-compose.dev.yml up -d --build
# or: npm run docker:up
```

### Option B — Coolify (production)

Compose file in Coolify: **`docker-compose.yml`**

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Setup (local Node)

## Umgebungsvariablen

Siehe `.env.example`:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Geheimer Schlüssel für Sessions
- `NEXT_PUBLIC_APP_URL` — Basis-URL für Share-Links
- `PORT` — Host-Port für Docker Compose (Standard: 3000)
- `REGISTRATION_ENABLED` — Registrierung deaktivieren (`false`)
- `REGISTRATION_INVITE_CODE` — Optionaler Einladungscode für Registrierung

## Datenbank-Migrationen

Production verwendet `prisma migrate deploy` (siehe `scripts/docker-entrypoint.sh`).

Bestehende Installationen mit `db push` vor dem Audit: einmalig `scripts/upgrade-db-push.sql` ausführen, dann `npx prisma migrate resolve --applied 20250615120000_init`.

## Stack

- Next.js 16, React 19, Tailwind CSS 4
- Prisma + PostgreSQL
- JWT Auth (jose + bcryptjs)
- Recharts
