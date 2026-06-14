FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .

ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ARG JWT_SECRET=build-stub-jwt-secret
ARG NEXT_PUBLIC_APP_URL=https://survey.kraftstoff.app
ARG COOLIFY_FQDN=
ARG COOLIFY_BUILD_SECRETS_HASH=

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=$DATABASE_URL
ENV JWT_SECRET=$JWT_SECRET
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
COPY scripts/docker-entrypoint.sh ./docker-entrypoint.sh

RUN npm install prisma@6.9.0 --omit=dev --ignore-scripts \
  && node ./node_modules/prisma/build/index.js generate \
  && npm cache clean --force \
  && chmod +x ./docker-entrypoint.sh \
  && chown -R nextjs:nodejs /app/node_modules /app/prisma

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
