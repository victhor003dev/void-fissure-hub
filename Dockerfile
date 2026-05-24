# ==========================================
# STAGE 1: Base image setup
# ==========================================
FROM node:22-alpine3.20 AS base

WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@latest --activate

# ==========================================
# STAGE 2: Fresh production clean installer
# ==========================================
FROM base AS deps
RUN apk add --no-cache libc6-compat

COPY package.json pnpm-lock.yaml ./

# Protects your PNPM 11 continuous integration settings
ENV CI=true
ENV PNPM_CONFIG_DANGEROUSLY_ALLOW_ALL_BUILDS=true
ENV PNPM_CONFIG_CONFIRM_MODULES_PURGE=true

# Installs fresh isolated dependencies inside the builder layer
RUN pnpm install --frozen-lockfile

# ==========================================
# STAGE 3: Build step (Bypassing local volume drift)
# ==========================================
FROM base AS builder
WORKDIR /app

# 1. Pull the fresh node_modules layer instead of taking the volume-mounted one
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 2. Tell pnpm 11 not to auto-trigger background audits/re-installs during script executions
ENV PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false
ENV NEXT_TELEMETRY_DISABLED=1

# Run next build -> safely creates .next/standalone
RUN pnpm build

# ==========================================
# STAGE 4: Production Runner (Safe, lean execution)
# ==========================================
FROM node:22-alpine3.20 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]