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
# Neon 등 원격 Postgres 연결 시 IPv6 우선 DNS 가 ETIMEDOUT 을 유발하는 환경 대응
ENV NODE_OPTIONS=--dns-result-order=ipv4first
ENV PORT=3000
# Next.js 16 standalone 은 HOSTNAME env 를 바인딩 인터페이스로 사용함.
# Docker 는 기본적으로 HOSTNAME 을 컨테이너 ID 로 덮어써서, 내부 127.0.0.1
# 접근이 막힘(healthcheck 의 wget 이 Connection refused 를 받는 원인).
# 모든 인터페이스에 바인딩하도록 명시.
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone 빌드 결과물 (server.js 포함, node_modules 는 다음 단계에서 덮어씀)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma 생성 클라이언트 (커스텀 출력 경로: src/generated/prisma)
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated

# Prisma CLI (migrate deploy) 실행에 필요한 파일들
#
# Prisma v7 CLI 는 node_modules/prisma/build/index.js 에 번들링되어 있지만,
# @prisma/engines 등 일부 의존성을 런타임에 동적 require() 로 로드함.
# 또한 .bin/prisma 심볼릭 링크는 Docker COPY 가 실제 파일로 변환하면서
# WASM 상대경로가 깨짐 → 직접 build/index.js 를 node 로 실행해야 함.
# (deploy.yml 의 migrate 커맨드는 node node_modules/prisma/build/index.js)
#
# 동적 require 가 어떤 @prisma/* 패키지를 요구하는지 완벽히 예측하기 어려우므로
# builder 의 node_modules 전체를 가져와 whack-a-mole 을 끝냄.
# standalone 의 pruned node_modules 는 이것의 부분집합이라 덮어써도 안전함.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
