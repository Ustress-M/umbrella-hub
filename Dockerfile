# ─── 1단계: 의존성 설치 ───────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN DATABASE_URL="postgresql://ci:ci@localhost:5432/ci" npm ci --frozen-lockfile

# ─── 2단계: 빌드 ─────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN DATABASE_URL="postgresql://ci:ci@localhost:5432/ci" npx prisma generate
RUN DATABASE_URL="postgresql://ci:ci@localhost:5432/ci" npm run build

# ─── 3단계: 실행 이미지 ───────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone 빌드 결과물
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma 생성 클라이언트 (커스텀 출력 경로: src/generated/prisma)
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated

# prisma migrate deploy 실행에 필요한 파일들
# (Prisma v7: CLI는 WASM 파일과 함께 node_modules/.bin 에 번들링됨)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/prisma* ./node_modules/.bin/
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
