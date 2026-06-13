# Coolify 503 — "no available server"

Traefik returns this when **no healthy container** is registered for the domain.

## Checklist (in order)

### 1. Domain in Coolify (most common)

Open your Survey resource → **Service `app`** → **Domains**:

```
https://survey.kraftstoff.app:3000
```

Port **3000 must be in the domain field** — not only `https://survey.kraftstoff.app`.

Then **Save** → **Redeploy**.

### 2. Environment variables

Coolify → **Environment** (runtime):

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Internal Postgres URL from Coolify Database |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `https://survey.kraftstoff.app` |

Mark `NEXT_PUBLIC_APP_URL` as **Available at Buildtime**.

Without `DATABASE_URL` the container exits on startup → 503 forever.

### 3. Container logs

Coolify → Survey → **Logs** (service `app`).

**Good:**
```
Applying database schema...
Starting Kraftstoff Survey...
```

**Bad:**
```
ERROR: DATABASE_URL is not set
Database not ready after 30 attempts
Cannot find module ...
```

Fix env / redeploy if you see errors.

### 4. Container status

Coolify → **Status** should be **Running (healthy)**.

If **Restarting** or **Unhealthy** → check logs (step 3).

### 5. Verify

```bash
curl https://survey.kraftstoff.app/api/health
```

Expected: `{"ok":true,"service":"kraftstoff-survey",...}`

## DNS

`survey.kraftstoff.app` → same origin as `kraftstoff.app` (Cloudflare proxy is OK).

503 means the **origin** (Coolify/Traefik) has no backend — not a DNS typo.
