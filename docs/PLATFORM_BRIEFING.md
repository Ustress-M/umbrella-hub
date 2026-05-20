# project-ms.kr 플랫폼 브리핑 (다음 서브도메인 프로젝트 시작 시 LLM 에 전달할 정보)

이 문서는 `project-ms.kr` 단일 VPS 위에 여러 서브도메인 프로젝트(예: `umbrella`, `gpt`, `cafe` …)를 올리는 운영자가, **새 프로젝트를 시작할 때 LLM 에게 복사·붙여넣기** 해서 전달하는 공통 컨텍스트입니다. 같은 인프라·컨벤션·함정이 반복 적용되므로 이 문서만 붙이면 새 LLM 세션도 바로 올바른 결정을 합니다. **다른 레포·외부 API·OAuth/웹훅 연동 시 넘길 HTTPS·도메인 스펙**은 **§2** 에 모아 두었습니다.

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

## 2. HTTPS·도메인·공개 URL (타 프로젝트·외부 서비스에 넘길 스펙)

이 절은 **다른 레포·모바일 앱·백오피스·SaaS(OAuth/웹훅)** 가 이 플랫폼과 붙을 때, 혼선 없이 한 번에 맞출 수 있도록 **도메인·TLS·역프록시·환경변수 계약**을 정리한 것입니다. 새 서비스 담당자에게는 아래 **「2.7 연동 담당자에게 보낼 메시지 템플릿」** 을 그대로 복사해 보내도 됩니다.

### 2.1 공개 URL 규약 (Canonical)

| 항목 | 규약 |
|------|------|
| **루트 도메인** | `project-ms.kr` (앱은 보통 루트가 아니라 **서브도메인** 으로만 노출) |
| **서비스 URL 형태** | `https://<subdomain>.project-ms.kr` — **스킴은 항상 `https`** |
| **HTTP(80)** | ACME 챌린지(`/.well-known/acme-challenge/`) 외에는 **301 → HTTPS** |
| **내부 바인딩** | 앱은 `127.0.0.1:<PORT>` 에만 붙음. **공인 URL로는 nginx(443)만 사용** |
| **www 접두사** | 기본 템플릿에는 없음. 필요 시 별도 `server_name` 블록 추가 |

**다른 시스템에 등록할 베이스 URL 예** (실제 값은 포트·서브도메인에 맞게 치환):

```text
https://umbrella.project-ms.kr          # Umbrella Hub (프로덕션)
https://gpt.project-ms.kr               # (예시) 차기 서비스
```

브라우저·웹훅·OAuth 리다이렉트에는 **반드시 위와 동일한 호스트명**(대소문자·`www` 유무 포함)을 써야 합니다. 로컬 전용 값(`http://localhost:3000`)을 프로덕션 시크릿/콘솔에 넣지 않습니다.

### 2.2 TLS(HTTPS) 종단과 인증서

- **종단 위치**: VPS 의 **nginx** 가 443 에서 TLS 를 종료하고, upstream 은 **평문 HTTP**(`proxy_pass http://127.0.0.1:<PORT>`).
- **인증 기관**: Let's Encrypt (**certbot**). 인증서 경로는 보통  
  `/etc/letsencrypt/live/<subdomain>.project-ms.kr/fullchain.pem`  
  및 `privkey.pem`.
- **갱신**: certbot 타이머(또는 cron). **만료 시 443 브라우저 경고** — 모니터링 권장.
- **버전 호환**: Ubuntu 22.04 nginx 1.24 는 `listen 443 ssl http2;` 한 줄 문법 사용(`http2 on;` 별도 디렉티브와 혼용 시 실패할 수 있음 — §6 템플릿과 레포 `nginx/` 참고).

**구 도메인 이관**(옵션): 기존 호스트네임을 유지하면서 새 canonical 로 301 하는 패턴은 `nginx/umbrella.conf` 에 실려 있음(`umbrella.ms-project.kr` → `umbrella.project-ms.kr`). **리다이렉트용 구 호스트**에도 별도 인증서(`certbot -d` 다중)가 필요할 수 있음.

### 2.3 ACME(인증서 발급)와 URL

- **HTTP-01**: `http://<subdomain>.project-ms.kr/.well-known/acme-challenge/...` 가 외부에서 열려 있어야 함. nginx 에서 `root /var/www/certbot;` 등으로 응답.
- **certbot `--nginx`**: 80 리스너와 `server_name`만 맞으면 대부분 자동으로 443 블록에 인증서 경로를 넣어 줌.
- DNS 전파 전에 certbot 을 돌리면 실패하므로, **`nslookup`/`dig` 로 A 레코드 확인 후** 발급 권장.

### 2.4 DNS (다른 팀·등록기관 담당자에게 요청할 내용)

| 타입 | 이름(호스트) | 값 | 비고 |
|------|-------------|-----|------|
| A | `<subdomain>` | `<VPS 공인 IPv4>` | 예: `umbrella` → 서버 IP |
| (선택) AAAA | 동일 | IPv6 | 이 VPS/회선에서 쓸 때만. 없으면 생략 |

- **프록시/CDN**(예: Cloudflare 주황 구름) 사용 시: 원본은 여전히 이 VPS. **SSL/TLS 모드**는 원본이 Let’s Encrypt 를 쓰는 구조이므로 **Full (strict)** 권장. **Flexible** 는 브라우저↔Cloudflare 만 HTTPS 이고 Cloudflare↔원본이 HTTP 가 되어, 앱이 `X-Forwarded-Proto` 를 잘못 보거나 리다이렉트 루프가 날 수 있음.
- **DNS only**(회색 구름): VPS 로 직접 붙는 전통적 패턴. 운영 단순.

### 2.5 nginx 역프록시 계약 (앱이 반드시 기대하는 헤더)

TLS 를 nginx 가 끊기 때문에, 앱(Next.js·Auth.js 등)은 **실제 스킴·호스트**를 헤더로 알아야 합니다. 아래는 **모든 서브도메인 블록에서 동일하게 유지**하는 것을 권장합니다.

| 헤더 | nginx 설정 예 | 목적 |
|------|---------------|------|
| `Host` | `proxy_set_header Host $host;` | 가상 호스트·절대 URL 생성 |
| `X-Forwarded-Proto` | `proxy_set_header X-Forwarded-Proto $scheme;` | **HTTPS 인지 여부** — 누락 시 Auth.js 가 HTTP 로 오인 → `Secure` 쿠키·`__Secure-` 쿠키 실패 |
| `X-Forwarded-For` | `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` | 클라이언트 IP 체인 |
| `X-Real-IP` | `proxy_set_header X-Real-IP $remote_addr;` | 단일 IP 참고용 |
| WebSocket | `Upgrade`, `Connection` | HMR/WS 사용 시 |

레포 참고 파일: `nginx/_subdomain.template.conf`, `nginx/umbrella.conf`.

### 2.6 앱·배포 환경변수 (URL 일치)

프로덕션 `.env.production`(및 Auth 관련 값)은 **브라우저 주소창에 보이는 URL** 과 한 글자도 어긋나면 안 됩니다.

| 변수 | 용도 | 예시 |
|------|------|------|
| `NEXTAUTH_URL` | NextAuth/Auth.js 공개 캐논 URL | `https://umbrella.project-ms.kr` |
| `AUTH_URL` | Auth.js v5 권장 이름(있으면 사용) | 동일 권장 |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | 세션 서명용 | 무작위 긴 문자열 |
| `NEXT_PUBLIC_*` | 브라우저에 노출되는 API 베이스 등 | 필요할 때만, **실제 호스트명**과 일치 |

코드 참고: `src/lib/auth.ts` 의 `trustHost: true` 는 **nginx 가 위 헤더를 정확히 넘길 때** 함께 동작합니다. 헤더만 빠지면 `trustHost` 만으로는 부족합니다.

### 2.7 연동 담당자에게 보낼 메시지 템플릿 (복사용)

아래 블록을 채워 상대 레포·업체에 전달합니다.

```text
[project-ms.kr 플랫폼 — HTTPS·도메인 스펙]

• 프로덕션 베이스 URL: https://<subdomain>.project-ms.kr
• 프로토콜: TLS 1.2+ (브라우저 표준). HTTP 는 ACME 경로 외 301 리다이렉트.
• 등록해야 할 리다이렉트 URI / Webhook URL (필요 시):
  - https://<subdomain>.project-ms.kr/api/auth/callback/<provider>
  - https://<subdomain>.project-ms.kr/api/... (프로젝트별 경로 협의)
• CORS 허용 Origin (백엔드가 허용 목록을 쓸 때): https://<subdomain>.project-ms.kr
• IP 화이트리스트가 필요한 경우: 고정 출구 IP가 아닌 공용 VPS 이므로 **도메인·HTTPS·시크릿 헤더** 기반 검증 권장.
• 쿠키 기반 세션 연동 시: SameSite/도메인은 당사 도메인 정책에 따름. 서드파티 쿠키 가정 금지.
```

### 2.8 서버 간·크론·내부 호출

| 호출 경로 | 권장 URL | 비고 |
|-----------|----------|------|
| 인터넷에서 이 서비스로 | `https://<subdomain>.project-ms.kr/...` | 웹훅, OAuth, 모바일 백엔드 |
| **같은 VPS** 의 다른 컨테이너에서 | 정책에 따라 `http://127.0.0.1:<PORT>` 또는 공개 HTTPS | 로컬만 쓰면 인증서·Host 검증 이슈는 적음. **쿠키/리다이렉트가 관여하면 공개 URL** 이 안전 |
| 정기 작업(cron) | `curl` 로 **HTTPS** + 시크릿 헤더 | 예: `Authorization: Bearer $CRON_SECRET` — PRD/운영 가이드의 cron 예시 참고 |

### 2.9 보안·응답 헤더 (nginx 기본)

템플릿에 포함된 예:

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer-when-downgrade`

**HSTS**(`Strict-Transport-Security`)는 전 서브도메인 정책과 혼선이 생기기 쉬워, 도입 시 기간·`includeSubDomains` 를 별도 합의 후 추가 권장.

### 2.10 운영 점검 명령 (연동 검증)

```bash
# TLS·리다이렉트·응답 헤더
curl -sI https://<subdomain>.project-ms.kr

# 인증서 대상 호스트명 확인 (로컬)
echo | openssl s_client -servername <subdomain>.project-ms.kr -connect <subdomain>.project-ms.kr:443 2>/dev/null | openssl x509 -noout -subject -dates
```

---

## 3. 포트 레지스트리 (새 프로젝트 시 반드시 업데이트)

| 포트 | 프로젝트 | 서브도메인 | 상태 |
|------|---------|-----------|------|
| 3000 | umbrella-hub | umbrella.project-ms.kr | 운영 중 |
| 3001 | (예약) | gpt.project-ms.kr | 할당 대기 |
| 3002 | (예약) | cafe.project-ms.kr | 할당 대기 |
| 3003~ | 다음 프로젝트 | — | — |

**규칙**: 신규 프로젝트는 3000번대에서 비어있는 다음 번호를 할당. 한번 할당한 포트는 재사용하지 않음.

---

## 4. 디렉토리 · 파일 컨벤션

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

## 5. 환경변수 3층 구조 (가장 많이 헷갈리는 부분)

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

## 6. nginx 설정 템플릿 (새 서브도메인 추가 시)

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

## 7. GitHub Container Registry (GHCR) 컨벤션

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

## 8. GitHub Actions 배포 워크플로우 (표준 템플릿)

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

## 9. Docker Compose 표준 패턴

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

## 10. Dockerfile 표준 패턴 (Next.js 16 + standalone)

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

## 11. Next.js App Router 함정들 (중요)

### 11-1. Client Router Cache
`dynamic = "force-dynamic"` 는 **서버 렌더링 캐시**만 막는다. 프리페치된 RSC 는 클라이언트 라우터 캐시에 남아있어서, **쿠키/권한 상태가 바뀐 뒤 `router.push()` 만 하면 바뀌기 전 상태의 RSC 가 렌더**된다. 사용자는 "새로고침해야만 반영된다" 고 느낌.

**해결**: 인증 상태가 바뀌는 모든 네비게이션에 `router.refresh()` 동반.

```tsx
const result = await signIn("credentials", { id, password, redirect: false });
if (result && !result.error) {
  router.refresh();         // ← 이 줄 필수
  router.push("/admin/dashboard");
}
```

### 11-2. `output: "standalone"` 필수
Docker 이미지 크기·콜드스타트를 위해 `next.config.ts` 에 반드시:
```ts
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};
```

### 11-3. 인증 페이지는 완전 동적
```tsx
// app/admin/layout.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
```
셋 다 있어야 서버 prerender 가 완전히 꺼진다.

---

## 12. Auth.js v5 (NextAuth v5) 설정 체크리스트

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

## 13. Prisma + Neon 규칙

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

## 14. 공통 런타임 라이브러리·버전 (Umbrella Hub 기준)

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

## 15. 자주 놓친 함정 Top 10

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

## 16. 새 서브도메인 프로젝트 초기 세팅 체크리스트

- [ ] 포트 할당 (본 문서 §3 업데이트)
- [ ] 도메인 A 레코드 추가 (`<subdomain>.project-ms.kr` → VPS IP)
- [ ] VPS 에 `/opt/<project-name>/` 디렉토리 생성
- [ ] `.env.production`, `.env` VPS 에 업로드 (권한 `chmod 600`)
- [ ] Neon 신규 프로젝트/DB 생성, `DATABASE_URL`/`DIRECT_URL` 확보
- [ ] GitHub 레포 생성 + Actions Secrets 등록 (VPS_*, DATABASE_URL, DIRECT_URL)
- [ ] `docker-compose.yml`, `Dockerfile`, `.dockerignore`, `next.config.ts`, `.env.example`, `.github/workflows/deploy.yml` 을 템플릿(본 프로젝트)에서 복사 후 이름·포트만 변경
- [ ] GHCR 에 첫 이미지 push 되면 **Package visibility 를 Public 으로 전환**
- [ ] nginx config 작성 (`/etc/nginx/sites-available/<subdomain>.conf`), 심볼릭 링크, `nginx -t`, reload
- [ ] `certbot --nginx -d <subdomain>.project-ms.kr`
- [ ] 프로덕션 `NEXTAUTH_URL`(및 필요 시 `AUTH_URL`) 이 **브라우저 URL과 동일한 `https://<subdomain>.project-ms.kr`** 인지 확인
- [ ] 타 시스템 연동 시 **§2.7 템플릿** 으로 베이스 URL·OAuth·웹훅·CORS 요구사항 전달

---

## 17. 이 문서 사용 예시 (LLM 프롬프트 템플릿)

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

*Last updated: 2026-05 · §2 HTTPS·도메인 연동 스펙 추가, 섹션 번호 재정렬*
