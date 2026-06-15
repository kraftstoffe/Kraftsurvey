# Coolify — DATABASE_URL / Restart-Loop

Container logs show:

```
ERROR: DATABASE_URL is still the Docker build stub (127.0.0.1:5432/build)
```

Coolify injected the **wrong** `DATABASE_URL`. The app includes its own Postgres service — you must **not** set `DATABASE_URL` manually.

## Fix (5 minutes)

### 1. Remove stale variables in Coolify

After redeploying commit with `DATABASE_URL` removed from compose/Dockerfile:

Survey app → **Environment** → **Delete** (if present):

- `DATABASE_URL`
- `JWT_SECRET` if value still contains `build-stub`

Coolify only allows deleting variables that are no longer referenced in `docker-compose.yml` / `Dockerfile`.

### 2. Set these variables (Runtime)

| Variable | Example | Buildtime |
|----------|---------|-----------|
| `POSTGRES_PASSWORD` | `openssl rand -hex 16` | Off |
| `JWT_SECRET` | `openssl rand -hex 32` | Off |
| `NEXT_PUBLIC_APP_URL` | `https://kraftsurvey.org` | **On** |

Click **Update** on each variable after editing.

### 3. Redeploy

After deploy, logs should show:

```
Applying database schema...
Database schema applied.
Starting Kraftstoff Survey...
```

### 4. Verify

```bash
curl https://kraftsurvey.org/api/health
```

Expected: `"db":true`

Then register at https://kraftsurvey.org/register

## Why this happens

Coolify UI variables **override** `docker-compose.yml`. An old `DATABASE_URL` (build stub or buildtime-only) replaces the correct internal URL `postgresql://survey:...@postgres:5432/...`.

The compose file now runs **Postgres + App** together — no separate Coolify database resource required.
