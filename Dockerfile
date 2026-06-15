FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
# Build-time only (not an ARG — avoids Coolify env UI binding). Not used at runtime.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_APP_URL=https://kraftsurvey.org
ARG COOLIFY_FQDN=
ARG COOLIFY_BUILD_SECRETS_HASH=

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NODE_OPTIONS=--max-old-space-size=1536
ENV CI=1

RUN npm run build:docker

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl wget
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY scripts/docker-entrypoint.sh ./docker-entrypoint.sh
COPY scripts/upgrade-db-push.sql ./scripts/upgrade-db-push.sql

RUN npm install prisma@6.9.0 --omit=dev --ignore-scripts \
  && node ./node_modules/prisma/build/index.js generate \
  && npm cache clean --force \
  && chmod +x ./docker-entrypoint.sh \
  && chown -R nextjs:nodejs /app/node_modules /app/prisma /app/scripts

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
