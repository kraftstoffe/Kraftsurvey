# Kraftstoff Survey — Deployment

## Production URL

**https://kraftsurvey.org**

Same VPS and Coolify instance as the other Kraftstoff apps (`kraftstoff.app`, `coach.kraftstoff.app`, etc.).

---

## 1. DNS

Add an A record pointing to your Coolify VPS IP:

```
kraftsurvey.org  A  <VPS_IP>
www              A  <VPS_IP>   # optional
```

Propagation usually takes 5–30 minutes.

---

## 2. Coolify — Application (Postgres included)

The compose stack includes **Postgres + App** — no separate Coolify database resource required.

1. **New Resource** → **Docker Compose**
2. **Repository:** `kraftstoffe/Kraftsurvey`
3. **Branch:** `master`
4. **Compose file:** `docker-compose.yml`
5. **Server:** same server as Coach / Kraftstoff
6. **Domain** for the `app` service:
   ```
   https://kraftsurvey.org:3000
   ```

See also: [`docs/COOLIFY-DATABASE.md`](COOLIFY-DATABASE.md) if the container restart-loops on `DATABASE_URL` stub.

---

## 3. Environment variables

Copy from [`env.coolify.example`](../env.coolify.example):

| Variable | Value | Buildtime | Runtime |
|----------|-------|-----------|---------|
| `POSTGRES_PASSWORD` | `openssl rand -hex 16` | Off | **On** |
| `JWT_SECRET` | `openssl rand -hex 32` | Off | **On** |
| `NEXT_PUBLIC_APP_URL` | `https://kraftsurvey.org` | **On** | On |

**Do not set `DATABASE_URL`** in Coolify — delete it if present (see [`COOLIFY-DATABASE.md`](COOLIFY-DATABASE.md)).

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
curl -sI https://kraftsurvey.org
curl -s https://kraftsurvey.org/api/health
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
