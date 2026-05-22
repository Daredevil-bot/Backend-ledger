# ── Stage 1: deps ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: runtime ─────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Don't run as root in production
RUN addgroup -S ledger && adduser -S ledger -G ledger

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN chown -R ledger:ledger /app
USER ledger

EXPOSE 3003

CMD ["node", "server.js"]
