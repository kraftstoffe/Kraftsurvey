# Coolify — DATABASE_URL / Restart-Loop

Container logs show:

```
ERROR: DATABASE_URL is still the Docker build stub (127.0.0.1:5432/build)
```

Coolify injected the **wrong** `DATABASE_URL`. The app includes its own Postgres service — you must **not** set `DATABASE_URL` manually.

## Fix (5 minutes)

### 1. Delete these variables in Coolify (if present)

Survey app → **Environment** → **Delete**:

- `DATABASE_URL` ← most important, Coolify overrides compose with this
- Any duplicate/old secrets with `build-stub` in the value

### 2. Set these variables (Runtime)

| Variable | Example | Buildtime |
|----------|---------|-----------|
| `POSTGRES_PASSWORD` | `openssl rand -hex 16` | Off |
| `JWT_SECRET` | `openssl rand -hex 32` | Off |
| `NEXT_PUBLIC_APP_URL` | `https://survey.kraftstoff.app` | **On** |

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
curl https://survey.kraftstoff.app/api/health
```

Expected: `"db":true`

Then register at https://survey.kraftstoff.app/register

## Why this happens

Coolify UI variables **override** `docker-compose.yml`. An old `DATABASE_URL` (build stub or buildtime-only) replaces the correct internal URL `postgresql://survey:...@postgres:5432/...`.

The compose file now runs **Postgres + App** together — no separate Coolify database resource required.
