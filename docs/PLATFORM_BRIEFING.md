# project-ms.kr 플랫폼 브리핑 (다음 서브도메인 프로젝트 시작 시 LLM 에 전달할 정보)

이 문서는 `project-ms.kr` 단일 VPS 위에 여러 서브도메인 프로젝트(예: `umbrella`, `gpt`, `cafe` …)를 올리는 운영자가, **새 프로젝트를 시작할 때 LLM 에게 복사·붙여넣기** 해서 전달하는 공통 컨텍스트입니다. 같은 인프라·컨벤션·함정이 반복 적용되므로 이 문서만 붙이면 새 LLM 세션도 바로 올바른 결정을 합니다.

> 사용법: 새 저장소에서 첫 대화를 열 때, 이 파일 전체를 `<platform_context>` 섹션으로 붙여넣고 요청을 시작하세요.

---

## 0. 사용자 선호 (응답 규칙)

- 응답 언어: **한국어**
- 라이브러리/프레임워크/API 질문은 **Context7 MCP** 로 최신 문서 확인 후 답변 (추측 금지)
- 장황한 설명보다 **코드·명령·표** 중심
- 파일 수정은 **한 번에 한 파일씩** 작은 단위로, 수정 이유와 함께

---

## 1. 인프라 개요

### 하드웨어·OS
- **단일 VPS** (Hetzner, nbg1-1 리전, 4GB RAM 추정)
- OS: Ubuntu (22.04 또는 24.04 계열)
- SSH 사용자: `deploy` (루트 아님, docker 그룹 소속)
- 공인 IP · 접근 정보는 별도 관리 (이 문서에는 적지 않음)

### 아키텍처
```
인터넷
  │ 443 TLS
  ▼
┌─────────────── VPS (단일 호스트) ───────────────┐
│                                                 │
│  nginx (80/443)  — 역방향 프록시 + TLS 종료     │
│    │                                            │
│    ├─→ umbrella.project-ms.kr → 127.0.0.1:3000  │ (umbrella-hub 컨테이너)
│    ├─→ gpt.project-ms.kr      → 127.0.0.1:3001  │ (gpt-xxx 컨테이너)
│    └─→ cafe.project-ms.kr     → 127.0.0.1:3002  │ (cafe-xxx 컨테이너)
│                                                 │
│  Docker Compose (프로젝트별 독립 스택)          │
└─────────────────────────────────────────────────┘
```

### 핵심 원칙
1. **nginx 가 유일한 공개 진입점.** 앱 컨테이너는 반드시 `127.0.0.1:PORT` 에만 바인딩해 외부 직접 접근 차단.
2. **포트는 프로젝트마다 유일.** (아래 포트 레지스트리 참고)
3. **프로젝트별 디렉토리**: `/opt/<project-name>/` (`docker-compose.yml`, `.env`, `.env.production`)
4. **TLS 는 certbot + Let's Encrypt** (webroot 플러그인 혹은 nginx 플러그인)
5. **DB 는 Neon (서버리스 PostgreSQL) 을 프로젝트별 분리 생성**

---

## 2. 포트 레지스트리 (새 프로젝트 시 반드시 업데이트)

| 포트 | 프로젝트 | 서브도메인 | 상태 |
|------|---------|-----------|------|
| 3000 | umbrella-hub | umbrella.project-ms.kr | 운영 중 |
| 3001 | (예약) | gpt.project-ms.kr | 할당 대기 |
| 3002 | (예약) | cafe.project-ms.kr | 할당 대기 |
| 3003~ | 다음 프로젝트 | — | — |

**규칙**: 신규 프로젝트는 3000번대에서 비어있는 다음 번호를 할당. 한번 할당한 포트는 재사용하지 않음.

---

## 3. 디렉토리 · 파일 컨벤션

### VPS 서버 측
```
/opt/<project-name>/
├── docker-compose.yml       # CI 가 배포마다 덮어씀
├── .env                     # Compose 자동 로드 (bcrypt 해시 등 특수문자 값 전용)
└── .env.production          # 앱 런타임 env_file (DB URL, API 키 등)
```

### 레포지토리 측
```
<project-root>/
├── Dockerfile
├── .dockerignore            # .env*, .git, .github, *.md, node_modules 제외
├── docker-compose.yml       # CI 가 VPS 로 동기화
├── .env.example             # placeholder 만. 실값 금지
├── nginx/<subdomain>.conf   # nginx 설정 참고용 (서버와 동기화 여부는 수동)
├── .github/workflows/deploy.yml
├── docs/
│   ├── SETUP.md             # 운영자용 초기 세팅 가이드
│   └── PLATFORM_BRIEFING.md # (이 문서, 공용)
└── src/
```

---

## 4. 환경변수 3층 구조 (가장 많이 헷갈리는 부분)

| 파일 | 위치 | 역할 | 특수문자 이스케이프 |
|---|---|---|---|
| `.env.example` | 레포 루트 | 개발자용 placeholder 문서 | N/A (값 없음) |
| `.env.local` / `.env` | 로컬 개발 | `npm run dev` 용 | `$` → `\$` **필요** (@next/env 파서가 보간) |
| `.env.production` | VPS `/opt/<proj>/` | 앱 런타임 `env_file` | 값을 그대로 (Compose env_file 은 리터럴) |
| `.env` | VPS `/opt/<proj>/` | **Compose 자동로드**. bcrypt 해시처럼 `$` 가 섞여 `env_file` 에서도 깨질 위험이 있는 값 전용 | 그대로 (Compose 가 보간 안 함) |

### 이게 왜 중요한가
bcrypt 해시 (`$2b$12$...`) 는 `$` 가 Compose 변수 보간 문법과 충돌합니다.
- `env_file` 로 주면: 값이 원자적으로 전달되지만 일부 Compose 버전에서 파싱 경계 문제 발생
- `environment:` 에 `${VAR}` 로 참조하면서 `.env` 에 두면: Compose 가 자동 로드 + 해석 없이 리터럴로 주입 → **가장 안전**

### 권장 패턴
```yaml
# docker-compose.yml
services:
  app:
    env_file:
      - .env.production    # 일반 값들
    environment:
      # 특수문자 포함 값만 여기서 .env 자동로드 경유로 주입
      ADMIN_PASSWORD_HASH: ${ADMIN_PASSWORD_HASH:?ADMIN_PASSWORD_HASH must be set in /opt/<proj>/.env}
```

---

## 5. nginx 설정 템플릿 (새 서브도메인 추가 시)

파일: `/etc/nginx/sites-available/<subdomain>.conf`

```nginx
# /etc/nginx/sites-available/<subdomain>.conf
server {
    listen 80;
    server_name <subdomain>.project-ms.kr;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name <subdomain>.project-ms.kr;

    ssl_certificate     /etc/letsencrypt/live/<subdomain>.project-ms.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<subdomain>.project-ms.kr/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "no-referrer-when-downgrade";

    location / {
        proxy_pass http://localhost:<PORT>;   # ← 포트 레지스트리에서 할당받은 번호
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 활성화 순서
```bash
sudo ln -s /etc/nginx/sites-available/<subdomain>.conf /etc/nginx/sites-enabled/
sudo nginx -t                                                   # 문법 검사
sudo certbot --nginx -d <subdomain>.project-ms.kr               # TLS 발급 (webroot 방식이면 --webroot -w /var/www/certbot)
sudo systemctl reload nginx
```

### DNS 설정
도메인 등록기관(또는 Cloudflare)에서 **A 레코드** 추가: `<subdomain>` → VPS IP. TTL 5분 권장 (초기 세팅 시).

---

## 6. GitHub Container Registry (GHCR) 컨벤션

- 이미지 경로: `ghcr.io/ustress-m/<project-name>` (소문자)
- **Public 가시성 권장** (비밀정보를 이미지에 포함하지 않는다면)
  - Public 이면 VPS 에서 `docker login` 불필요
  - Private 이면 PAT 관리 필요 (`ghs_` 토큰은 Actions 세션 만료되면 사용 불가)
- 푸시는 GitHub Actions 의 `GITHUB_TOKEN` 으로 자동 처리

### Public 전환 방법 (처음 한 번)
1. GitHub → 본인 프로필 → **Packages** → `<project-name>` 클릭
2. 우측 사이드바 → **Package settings**
3. 하단 **Danger Zone → Change package visibility → Public**
4. 패키지명 입력 후 확정
5. **⚠ "Change repository visibility" 와 혼동 금지** (둘은 별개 설정)

---

## 7. GitHub Actions 배포 워크플로우 (표준 템플릿)

`.github/workflows/deploy.yml` — Umbrella Hub 것과 동일 구조 권장.

### 필요 GitHub Secrets
| Secret | 용도 |
|---|---|
| `VPS_HOST` | VPS 공인 IP |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | OpenSSH 개인키 전문 |
| `DATABASE_URL` | Neon pooled URL (앱 런타임용, `-pooler` 포함) |
| `DIRECT_URL` | Neon direct URL (Prisma migrate 용, `-pooler` 없음) |

### 3단계 구조
1. **lint** (PR + Push): 타입체크 + ESLint
2. **migrate** (main push only): GitHub Actions 러너에서 `prisma migrate deploy` 실행
   - 🔴 **VPS 에서 실행 금지**. Neon direct endpoint 는 IPv6 AAAA 타임아웃을 유발해 P1001 실패 반복됨.
3. **deploy** (main push only): 
   - GHCR 로그인 (`secrets.GITHUB_TOKEN`)
   - Docker build & push (`latest` + `sha` 태그)
   - `docker-compose.yml` 을 SCP 로 VPS 에 동기화
   - SSH 로 `docker compose pull && docker compose up -d`

### 첫 Secret 등록
레포 → **Settings → Secrets and variables → Actions → New repository secret**

---

## 8. Docker Compose 표준 패턴

```yaml
services:
  app:
    image: ${APP_IMAGE:-ghcr.io/ustress-m/<project-name>}:latest
    container_name: <project-name>
    restart: unless-stopped
    ports:
      # 127.0.0.1 바인딩 필수 — 외부 포트 직통 접근 차단.
      - "127.0.0.1:<PORT>:<PORT>"
    env_file:
      - .env.production
    environment:
      # 특수문자 포함 값은 compose 의 .env 자동로드로 주입
      # (bcrypt 해시 등 $ 가 들어간 값)
      # <SECRET>: ${<SECRET>:?<SECRET> must be set in /opt/<proj>/.env}
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:<PORT>/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 꼭 고려할 것
- **`HOSTNAME=0.0.0.0`** 을 Dockerfile 에 명시 (Next.js standalone 이 기본 HOSTNAME 을 컨테이너 ID 로 덮어써 localhost healthcheck 가 `Connection refused` 됨)
- healthcheck 가 있어야 `docker compose ps` 가 의미 있음

---

## 9. Dockerfile 표준 패턴 (Next.js 16 + standalone)

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN DATABASE_URL="postgresql://ci:ci@localhost:5432/ci" npm ci --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN DATABASE_URL="postgresql://ci:ci@localhost:5432/ci" npx prisma generate
RUN DATABASE_URL="postgresql://ci:ci@localhost:5432/ci" npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=<PORT>
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated
# Prisma CLI 동적 require 이슈 회피: builder node_modules 전체 덮어쓰기
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

USER nextjs
EXPOSE <PORT>
CMD ["node", "server.js"]
```

### 함정들
- `DATABASE_URL` 은 빌드 시 더미값으로 주입. 실제 값은 런타임에만.
- `COPY . .` 은 `.dockerignore` 로 `.env*`, `.git`, `node_modules` 제외 필수.
- runner 단계는 **selective COPY** 만 사용. `*.md`, `nginx/`, `.github/` 등이 실수로 이미지에 포함되지 않도록.

---

## 10. Next.js App Router 함정들 (중요)

### 10-1. Client Router Cache
`dynamic = "force-dynamic"` 는 **서버 렌더링 캐시**만 막는다. 프리페치된 RSC 는 클라이언트 라우터 캐시에 남아있어서, **쿠키/권한 상태가 바뀐 뒤 `router.push()` 만 하면 바뀌기 전 상태의 RSC 가 렌더**된다. 사용자는 "새로고침해야만 반영된다" 고 느낌.

**해결**: 인증 상태가 바뀌는 모든 네비게이션에 `router.refresh()` 동반.

```tsx
const result = await signIn("credentials", { id, password, redirect: false });
if (result && !result.error) {
  router.refresh();         // ← 이 줄 필수
  router.push("/admin/dashboard");
}
```

### 10-2. `output: "standalone"` 필수
Docker 이미지 크기·콜드스타트를 위해 `next.config.ts` 에 반드시:
```ts
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};
```

### 10-3. 인증 페이지는 완전 동적
```tsx
// app/admin/layout.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
```
셋 다 있어야 서버 prerender 가 완전히 꺼진다.

---

## 11. Auth.js v5 (NextAuth v5) 설정 체크리스트

```ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,                                              // ← nginx 뒤에서 필수
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET, // 둘 다 호환
  providers: [...],
  session: { strategy: "jwt", maxAge: Number(process.env.SESSION_LIFETIME_SECONDS ?? 7200) },
  callbacks: {
    authorized({ auth: session }) { return !!session?.user; },   // 빈 토큰 승격 차단
  },
});
```

### 로그인 엔드포인트 (디버그 시)
- 브라우저가 아닌 curl 로 로그인 시도 시 **/api/auth/callback/credentials** 에 `application/x-www-form-urlencoded` 로 `csrfToken` 포함 POST. JSON 거부됨.
- CSRF 토큰: `GET /api/auth/csrf`

### 프로덕션 쿠키 플래그
- `__Secure-authjs.session-token` 이 떠야 HTTPS 종단 정상.
- 뜨지 않으면 nginx `X-Forwarded-Proto` 헤더 또는 `trustHost` 확인.

---

## 12. Prisma + Neon 규칙

### 연결 URL 두 종류
- `DATABASE_URL` = **pooled** 엔드포인트 (`ep-xxx-pooler.<region>.aws.neon.tech`)
- `DIRECT_URL` = **direct** 엔드포인트 (`ep-xxx.<region>.aws.neon.tech`)

### 왜 migrate 를 VPS 가 아닌 GitHub Actions 러너에서 하는가
- Neon direct endpoint 는 compute scale-to-zero 웨이크업에 수 초 소요
- Docker 기본 bridge 네트워크가 IPv6 AAAA 응답을 만나면 Prisma 엔진이 IPv4 폴백 전에 타임아웃 → **P1001 반복 실패**
- GitHub 러너는 듀얼스택·AWS 백본 근접성이 표준이라 Neon 공식 권장 CI 경로

### Prisma schema 설정
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"   // 프로젝트마다 동일 경로 사용
}
datasource db {
  provider = "postgresql"
  // url/directUrl 은 런타임 env 로
}
```

---

## 13. 공통 런타임 라이브러리·버전 (Umbrella Hub 기준)

| 영역 | 라이브러리 | 버전 |
|---|---|---|
| 런타임 | Node.js | 22 (Alpine) |
| 프레임워크 | Next.js | 16.x |
| UI | React | 19.x, Tailwind 4.x, Radix UI |
| 인증 | next-auth | 5.0.0-beta |
| ORM | prisma + @prisma/client | 7.x |
| DB 어댑터 | @prisma/adapter-pg | 7.x |
| 파일 저장 | Cloudflare R2 (@aws-sdk/client-s3) | - |
| 검증 | zod | 4.x |

새 프로젝트에서도 같은 메이저 버전 사용 권장 (호환성·운영자 학습비용 최소화).

---

## 14. 자주 놓친 함정 Top 10

1. **bcrypt 해시의 `$`** 가 `.env.local` 에서는 `\$`, `.env.production` 에서는 그대로, Compose `.env` 에서는 그대로. 섞어 쓰면 `bcrypt.compare()` 가 항상 실패.
2. **Auth.js 로그인 후 `router.refresh()` 누락** → 시크릿모드에서 "새로고침해야 반영됨" 증상.
3. **Docker HOSTNAME 미설정** → Next.js standalone 이 컨테이너 ID 에 바인딩 → healthcheck `Connection refused`.
4. **nginx 에서 `X-Forwarded-Proto` 누락** → Auth.js 가 HTTPS 를 HTTP 로 오인 → `__Secure-` 쿠키 생성 실패.
5. **GHCR 패키지 visibility 를 repository visibility 와 혼동** → VPS pull 이 영영 인증 요구.
6. **`ghs_` 토큰** 을 PAT 로 착각 → Actions 세션 끝나면 만료 → pull denied.
7. **Prisma migrate 를 VPS 에서 실행** → P1001 반복 실패. 반드시 Actions 러너에서.
8. **`.env*` 가 `.dockerignore` 에서 누락** → 이미지에 시크릿 유출.
9. **포트 충돌**: 여러 프로젝트가 같은 3000 을 쓰면 둘 중 하나만 기동됨. 포트 레지스트리 필수.
10. **`output: "standalone"` 누락** → Dockerfile runner 단계에서 `/app/.next/standalone` 경로 존재 안 함 → COPY 실패.

---

## 15. 새 서브도메인 프로젝트 초기 세팅 체크리스트

- [ ] 포트 할당 (본 문서 §2 업데이트)
- [ ] 도메인 A 레코드 추가 (`<subdomain>.project-ms.kr` → VPS IP)
- [ ] VPS 에 `/opt/<project-name>/` 디렉토리 생성
- [ ] `.env.production`, `.env` VPS 에 업로드 (권한 `chmod 600`)
- [ ] Neon 신규 프로젝트/DB 생성, `DATABASE_URL`/`DIRECT_URL` 확보
- [ ] GitHub 레포 생성 + Actions Secrets 등록 (VPS_*, DATABASE_URL, DIRECT_URL)
- [ ] `docker-compose.yml`, `Dockerfile`, `.dockerignore`, `next.config.ts`, `.env.example`, `.github/workflows/deploy.yml` 을 템플릿(본 프로젝트)에서 복사 후 이름·포트만 변경
- [ ] GHCR 에 첫 이미지 push 되면 **Package visibility 를 Public 으로 전환**
- [ ] nginx config 작성 (`/etc/nginx/sites-available/<subdomain>.conf`), 심볼릭 링크, `nginx -t`, reload
- [ ] `certbot --nginx -d <subdomain>.project-ms.kr`
- [ ] 첫 배포 후 `curl -I https://<subdomain>.project-ms.kr` 로 200/정상 응답 확인
- [ ] (인증 포함 프로젝트면) 로그인 E2E curl 테스트로 `__Secure-authjs.session-token` 쿠키 발급 확인

---

## 16. 이 문서 사용 예시 (LLM 프롬프트 템플릿)

새 프로젝트 첫 대화를 시작할 때 아래 형식으로 붙여넣으면 됩니다.

```
<platform_context>
(docs/PLATFORM_BRIEFING.md 의 전체 내용 붙여넣기)
</platform_context>

<project>
프로젝트명: gpt-wrapper
서브도메인: gpt.project-ms.kr
포트 할당: 3001
DB: Neon 신규 프로젝트 gpt-wrapper (예정)
인증: Auth.js Credentials (관리자 1인)
주요 의존성: openai, zod
</project>

위 플랫폼 컨벤션을 따라 다음 작업을 진행해 주세요:
...
```

이렇게 하면 새 세션의 LLM 이 **이미 이 플랫폼의 모든 규약·함정을 아는 상태**에서 작업을 시작하므로, 이번 Umbrella Hub 때 겪은 우회/재작업 없이 바로 올바른 결정을 합니다.

---

*Last updated: 2026-04 · umbrella-hub 배포 사이클에서 축적된 노하우 집약본*
