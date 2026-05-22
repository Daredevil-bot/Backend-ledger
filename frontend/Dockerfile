# ── Stage 1: deps ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: build ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build-time argument
ARG BACKEND_URL=http://backend:3003
ENV BACKEND_URL=$BACKEND_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: runtime ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S ledger && adduser -S ledger -G ledger

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN chown -R ledger:ledger /app
USER ledger

EXPOSE 3001

CMD ["npm", "run", "start"]
