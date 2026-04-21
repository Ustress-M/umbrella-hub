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

# Prisma 클라이언트 생성
RUN DATABASE_URL="postgresql://ci:ci@localhost:5432/ci" npx prisma generate

# Next.js 빌드 (standalone 모드)
RUN DATABASE_URL="postgresql://ci:ci@localhost:5432/ci" npm run build

# ─── 3단계: 실행 이미지 ───────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 보안: 별도 사용자 생성
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# standalone 빌드 결과물만 복사
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public/

# prisma migrate deploy 실행에 필요한 파일
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
# Prisma 생성 클라이언트 (커스텀 경로)
COPY --from=builder /app/src/generated ./src/generated

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
