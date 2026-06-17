FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
# Build-time only (not an ARG — avoids Coolify env UI binding). Not used at runtime.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_APP_URL=https://survey.kraftstoff.app
ARG COOLIFY_FQDN=
ARG COOLIFY_BUILD_SECRETS_HASH=

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NODE_OPTIONS=--max-old-space-size=1536
ENV CI=1

RUN npm run build:docker
RUN node scripts/stage-prisma-runtime.mjs

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl wget
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client
# Prisma CLI lives outside app node_modules so migrations do not overwrite Next standalone deps.
COPY --from=builder --chown=nextjs:nodejs /app/.prisma-cli/node_modules/ ./prisma-cli/node_modules/
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --chown=nextjs:nodejs scripts/upgrade-db-push.sql ./scripts/upgrade-db-push.sql

RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
