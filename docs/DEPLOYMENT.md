# Kraftstoff Survey — Deployment

## Production URL

**https://survey.kraftstoff.app**

Same VPS and Coolify instance as the other Kraftstoff apps (`kraftstoff.app`, `coach.kraftstoff.app`, etc.).

---

## 1. DNS

Add an A record pointing to the same VPS IP as your other `kraftstoff.app` subdomains:

```
survey.kraftstoff.app  A  <VPS_IP>
```

Propagation usually takes 5–30 minutes.

---

## 2. Coolify — Postgres database

1. Coolify → **New Resource** → **Database** → **PostgreSQL**
2. Name: e.g. `kraftstoff-survey-db`
3. After creation, copy the **internal Postgres URL**
4. Create database `kraftstoff_survey` if Coolify does not auto-create it

---

## 3. Coolify — Application

1. **New Resource** → **Docker Compose**
2. **Repository:** `kraftstoffe/Kraftsurvey`
3. **Branch:** `master`
4. **Compose file:** `docker-compose.yaml` (or leave empty — Coolify default)
5. **Server:** same server as Coach / Kraftstoff
6. **Domain** for the `app` service:
   ```
   https://survey.kraftstoff.app:3000
   ```

---

## 4. Environment variables

Copy from [`env.coolify.example`](../env.coolify.example):

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Internal Coolify Postgres URL |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `https://survey.kraftstoff.app` |

In Coolify, enable **Available at Buildtime** for `NEXT_PUBLIC_APP_URL` (share links depend on it).

---

## 5. Deploy

Click **Deploy** in Coolify. On first start the container runs `prisma db push` automatically.

Verify:

```bash
curl -sI https://survey.kraftstoff.app
curl -s https://survey.kraftstoff.app/api/health
```

Expected health response:

```json
{"ok":true,"service":"kraftstoff-survey","timestamp":"..."}
```

---

## Local development

Use the bundled Postgres stack:

```bash
docker compose up -d --build
```

Or only Postgres for local Node dev:

```bash
docker compose up -d postgres
cp .env.example .env
npm run db:push
npm run dev
```
