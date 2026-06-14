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
4. **Compose file:** `docker-compose.yml` or leave Coolify default `docker-compose.yaml` (includes `.yml`)
5. **Server:** same server as Coach / Kraftstoff
6. **Domain** for the `app` service:
   ```
   https://survey.kraftstoff.app:3000
   ```

---

## 4. Environment variables

Copy from [`env.coolify.example`](../env.coolify.example):

| Variable | Value | Buildtime | Runtime |
|----------|-------|-----------|---------|
| `DATABASE_URL` | Internal Coolify Postgres URL (see Database resource) | **Off** | **On** |
| `JWT_SECRET` | `openssl rand -hex 32` | Off | **On** |
| `NEXT_PUBLIC_APP_URL` | `https://survey.kraftstoff.app` | **On** | On |

**Important:** `DATABASE_URL` must use the Coolify Postgres **internal hostname** (e.g. `postgresql://...@abc123-postgres:5432/kraftstoff_survey`). Never use `127.0.0.1` or the Docker build stub — registration and login will fail.

---

## 5. Deploy

Click **Deploy** in Coolify. On first start the container runs `prisma db push` automatically.

### Deploy script (optional)

For redeploys from your machine via Coolify API:

```powershell
# 1. Copy and edit API credentials
Copy-Item scripts/coolify.env.example scripts/.coolify.env

# 2. Deploy (push git + trigger Coolify + wait for health)
npm run deploy:coolify -- -Push

# Force rebuild without cache
npm run deploy:coolify -- -Push -Force
```

On Linux/macOS:

```bash
chmod +x scripts/deploy-coolify.sh
cp scripts/coolify.env.example scripts/.coolify.env
# edit scripts/.coolify.env
./scripts/deploy-coolify.sh --push
```

Required in `scripts/.coolify.env`:

| Variable | Where to find it |
|----------|------------------|
| `COOLIFY_URL` | Your Coolify panel URL (e.g. `https://coolify.kraftstoff.app`) |
| `COOLIFY_TOKEN` | Coolify → Keys & Tokens → API Tokens |
| `COOLIFY_RESOURCE_UUID` | Survey resource in Coolify (URL or General settings) |

Verify:

```bash
curl -sI https://survey.kraftstoff.app
curl -s https://survey.kraftstoff.app/api/health
```

Expected health response:

```json
{"ok":true,"service":"kraftstoff-survey","db":true,"timestamp":"..."}
```

---

## Local development

Use the bundled Postgres stack:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

Or only Postgres for local Node dev:

```bash
docker compose -f docker-compose.dev.yml up -d postgres
cp .env.example .env
npm run db:push
npm run dev
```
