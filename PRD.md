# PRD: 우산 대여 시스템 (Umbrella Hub)

> **버전:** 4.0 (최종)
> **작성일:** 2026-04-20
> **배포 환경:** Hetzner VPS (Docker + Nginx) — CI/CD: GitHub Actions
> **기술 스택:** Next.js 14 · Neon(PostgreSQL) · Cloudflare R2 · NextAuth.js v5 · TypeScript · Tailwind CSS

---

## 0. 비용 분석

| 항목 | 서비스 | 무료 한도 | 예상 사용 | 비용 |
|------|--------|----------|----------|------|
| **서버** | Hetzner CX22 (2코어/4GB) | — | 상시 | €4/월 (~6,000원) |
| **DB** | Neon PostgreSQL | 0.5 GB | 수십 KB | 무료 |
| **파일 저장** | Cloudflare R2 | 10 GB / 100GB 대역폭 | 수백 장 | 무료 |
| **CI/CD** | GitHub Actions | 2,000분/월 | 빌드당 ~5분 | 무료 |
| **SSL** | Let's Encrypt | 무제한 | 1개 | 무료 |
| **인증** | NextAuth.js | 오픈소스 | — | 무료 |

**총 월 비용: 약 6,000원 (VPS 고정). 사이트 수가 늘어도 VPS 비용만 내면 됨.**

---

## 1. 개요

학교 내 우산을 **관리자 없이 학생이 직접** 대여·반납하는 무인 셀프 서비스 웹 시스템입니다.

### 무인 운영 핵심 원리

```
우산에 QR 스티커 부착
        ↓
학생이 스마트폰으로 QR 스캔
        ↓
이름/학번/전화번호 입력
        ↓
시스템이 즉시 자동 승인 (PENDING 없음)
        ↓
학생이 우산을 직접 가져감
        ↓
반납 시 QR 재스캔 → 사진 촬영 → 자동 반납 완료
```

관리자는 실시간 개입 없이 **사후 모니터링 · 예외 처리 · 통계** 만 수행합니다.

---

## 2. 목표

| 구분 | 목표 |
|------|------|
| 무인화 | QR 스캔으로 대여·반납 완결, 관리자 개입 불필요 |
| 자동화 | 승인·재고 할당·데이터 삭제 모두 자동 처리 |
| 비용 | 월 6,000원 고정 (VPS 1대로 다수 사이트 공유 가능) |
| 안정성 | DB·파일 저장소를 VPS 외부에 분리하여 서버 장애 시에도 데이터 안전 |
| 유지보수 | TypeScript strict + Zod + Prisma로 런타임 오류 최소화 |

---

## 3. 사용자 유형

### 3.1 학생 (비인증)
- QR 코드 스캔으로 대여·반납 페이지 진입
- 학번 + 이름 + 전화번호 입력으로 신원 확인 (별도 계정 불필요)
- 시스템이 자동으로 대여 처리

### 3.2 관리자 (인증)
- NextAuth.js Credentials Provider 로그인
- 우산 등록·QR 생성·점검 처리
- 예외 상황(분실, 장기 미반납 등) 수동 처리
- 통계 대시보드 및 CSV 내보내기

---

## 4. 대여·반납 흐름

### 4.1 대여 (자동 승인)

```
① 학생이 우산 거치대의 QR 스티커 스캔
         ↓
② /rent/[umbrellaId] 페이지 열림
         ↓
③ 서버: 우산 상태 확인
   ┌─ AVAILABLE  → 대여 폼 표시
   ├─ RENTED     → "현재 대여 중" 안내
   └─ MAINTENANCE→ "점검 중" 안내
         ↓
④ 학번 / 이름 / 전화번호 입력 후 제출
         ↓
⑤ 서버 검증
   ┌─ 동일 학번의 RENTED·OVERDUE 대여 존재 → 중복 차단
   └─ 정상 → Rental 레코드 생성(RENTED), Umbrella.status → RENTED
         ↓
⑥ "우산 [번호]를 가져가세요!" 완료 화면 + 반납 링크 표시
```

### 4.2 반납 (자동 처리)

```
① 학생이 /return/[umbrellaId] 접속 (우산 QR 재스캔 또는 완료 화면 링크)
         ↓
② 서버: 우산 상태 확인
   ┌─ RENTED      → 반납 폼 표시
   ├─ AVAILABLE   → "이미 반납된 우산" 안내
   └─ MAINTENANCE → "점검 중인 우산, 관리자 문의" 안내
         ↓
③ 학번 + 이름으로 본인 대여 건 확인
         ↓
④ 반납 사진 촬영 후 업로드 (jpg/png, 최대 5MB)
         ↓
⑤ 서버 처리
   - Cloudflare R2에 사진 저장
   - Rental.status → RETURNED, returnedAt 기록
   - deleteAt = returnedAt + 7일
   - Umbrella.status → AVAILABLE
         ↓
⑥ "반납 완료!" 감사 화면
```

---

## 5. 기능 요구사항

### 5.1 학생 기능

#### 5.1.1 QR 대여 (`/rent/[umbrellaId]`)
- URL의 umbrellaId로 해당 우산 상태 즉시 서버사이드 확인 (SSR)
- 입력값: 학번, 이름, 전화번호 (Zod 검증: 전화번호 01X-XXXX-XXXX 형식)
- 중복 대여 방지: `RENTED` + `OVERDUE` 상태 모두 포함
- 승인 즉시 처리 (PENDING 없음, DB 트랜잭션으로 원자적 처리)

#### 5.1.2 QR 반납 (`/return/[umbrellaId]`)
- 우산 상태별 명확한 안내 분기 (AVAILABLE / MAINTENANCE)
- 학번 + 이름으로 본인 대여 건 확인
- 반납 사진 1장 필수 (카메라 직접 촬영 지원, `capture="environment"`)
- 업로드 즉시 반납 완료 처리

#### 5.1.3 대여 상태 조회 (`/` 홈 페이지 내)
- 학번 + 이름으로 진행 중인 대여(RENTED·OVERDUE) 조회
- 조회 결과에서 바로 반납 링크 이동 가능

---

### 5.2 관리자 기능

#### 5.2.1 로그인 (`/admin`)
- NextAuth.js Credentials Provider (환경 변수 기반, bcrypt 검증)
- JWT 세션 전략, 유효시간 2시간 (환경 변수로 조정)
- `/admin/*` 경로: Next.js Middleware로 자동 보호

#### 5.2.2 우산 재고 관리 (`/admin/umbrellas`)
- 우산 추가: 번호 입력 → DB 생성 → QR 코드 PNG 다운로드
- 우산 상태 변경: `AVAILABLE` / `RENTED` / `MAINTENANCE`
- 우산 삭제: 활성 대여(RENTED) 없는 경우만 허용

#### 5.2.3 대여 현황 관리 (`/admin/rentals`)
- 전체 대여 목록, 상태 필터 (RENTED / RETURNED / LOST / OVERDUE)
- 행별 상태 변경 + 메모 입력 + 저장 버튼 (변경 시에만 활성화)
- 반납 사진 외부 링크 열람
- 상태 변경 시 우산 상태 자동 연동:
  - `RENTED` / `OVERDUE` → 우산 `RENTED` 유지
  - `RETURNED` → 우산 `AVAILABLE`
  - `LOST` → 우산 `MAINTENANCE`

#### 5.2.4 대시보드 (`/admin/dashboard`)
- **서버 컴포넌트에서 DB 직접 쿼리** (API 경유 없음, 쿠키 전달 문제 없음)
- 통계 카드: 전체 우산 수 / 대여 중 / 오늘 대여 / 오늘 반납
- 최근 7일 대여/반납 추이 바 차트 (Recharts)
- 3일 이상 미반납 목록 (RENTED + OVERDUE, 학생 연락처 포함)

#### 5.2.5 CSV 내보내기 (`/admin/export`)
- 기간 필터(시작일·종료일) 후 다운로드
- BOM 포함 UTF-8 (Excel 한글 깨짐 방지)
- 컬럼: 학번, 이름, 전화번호, 우산번호, 대여일시, 반납일시, 상태

---

### 5.3 공통 기능

| 기능 | 설명 |
|------|------|
| QR 코드 생성 | `qrcode` 라이브러리, 우산별 `/rent/[id]` URL로 생성 |
| 반응형 UI | 모바일 우선 (학생은 스마트폰으로 사용) |
| 로고 | `/public/logo.png` — 모든 페이지 헤더 |
| 자동 삭제 | 반납 후 7일: VPS crontab → `/api/cron/cleanup` 호출 |
| Health Check | `/api/health` — Docker healthcheck 연동 |
| 토스트 알림 | Radix UI Toast, 성공/실패 피드백 |

---

## 6. 기술 스택

```
Frontend / Backend
├── Next.js 14.2 (App Router, TypeScript strict)
├── Tailwind CSS + Radix UI (shadcn/ui 스타일)
├── React Hook Form + @hookform/resolvers + Zod
├── Recharts (주간 통계 차트)
├── qrcode (서버사이드 QR 이미지 생성)
└── NextAuth.js v5 (beta) — Credentials Provider, JWT 세션

인프라 (외부 서비스)
├── Neon (serverless PostgreSQL)  — 대여·우산 데이터
│     └── Prisma ORM              — 타입 안전 쿼리
├── Cloudflare R2                 — 반납 사진 (S3 호환 API)
│     └── @aws-sdk/client-s3      — 업로드/삭제
└── VPS crontab                   — 7일 자동 삭제 스케줄

배포
├── Hetzner CX22 (Ubuntu 24.04)
├── Docker + docker-compose       — 앱 컨테이너
├── Nginx + Certbot               — HTTPS 리버스 프록시
└── GitHub Actions                — CI/CD (린트 → 빌드 → 배포)
```

---

## 7. 데이터 모델

### 7.1 Prisma Schema

```prisma
model Umbrella {
  id        String         @id @default(cuid())
  number    String         @unique          // 우산 번호 (예: "001")
  status    UmbrellaStatus @default(AVAILABLE)
  rentals   Rental[]
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  @@map("umbrellas")
}

model Rental {
  id             String       @id @default(cuid())
  umbrella       Umbrella     @relation(fields: [umbrellaId], references: [id])
  umbrellaId     String
  studentId      String                    // 학번
  studentName    String                    // 이름
  phone          String                    // 전화번호
  status         RentalStatus @default(RENTED)
  returnPhotoUrl String?                   // Cloudflare R2 공개 URL
  note           String?                   // 관리자 메모
  createdAt      DateTime     @default(now())
  returnedAt     DateTime?
  deleteAt       DateTime?                 // returnedAt + DELETE_AFTER_DAYS

  @@index([umbrellaId])
  @@index([studentId, studentName])
  @@index([status])
  @@index([deleteAt])
  @@map("rentals")
}

enum UmbrellaStatus { AVAILABLE  RENTED  MAINTENANCE }
enum RentalStatus   { RENTED  RETURNED  LOST  OVERDUE }
```

### 7.2 대여 상태 → 우산 상태 매핑

| Rental.status | Umbrella.status | 의미 |
|--------------|-----------------|------|
| `RENTED` | `RENTED` | 학생이 우산 소지 중 |
| `OVERDUE` | `RENTED` | 3일 이상 미반납 (우산은 여전히 학생이 소지) |
| `RETURNED` | `AVAILABLE` | 반납 완료 |
| `LOST` | `MAINTENANCE` | 분실 — 관리자가 수동 확인 필요 |

### 7.3 진행 중인 대여 정의

```typescript
// src/lib/queries.ts
export const ACTIVE_RENTAL_STATUSES = ["RENTED", "OVERDUE"] as const;
```

이 상수를 대여 신청 중복 방지, 상태 조회, 대시보드 미반납 목록 등 모든 곳에서 공유합니다.

---

## 8. 공유 쿼리 레이어 (`src/lib/queries.ts`)

서버 컴포넌트와 API Route Handler가 **동일한 DB 로직**을 재사용할 수 있도록 순수 함수로 분리합니다.

```typescript
getStats()                          // 대시보드 통계 (서버 컴포넌트 + API 공유)
getActiveRentalByStudent(id, name)  // 진행 중인 대여 조회
ACTIVE_RENTAL_STATUSES              // ["RENTED", "OVERDUE"] 상수
```

> **이유:** 서버 컴포넌트에서 `fetch("/api/admin/stats", { Cookie: "" })`처럼 자기 자신의 API를 호출하면 세션 쿠키가 비워져 인증 실패가 발생합니다. DB 함수를 직접 호출하면 이 문제가 없습니다.

---

## 9. 페이지 및 라우팅

```
공개 (학생용)
├── /                      → 서비스 안내 + 대여 상태 조회
├── /rent/[umbrellaId]     → QR 대여 (SSR: 우산 상태 확인 후 렌더)
└── /return/[umbrellaId]   → QR 반납 (SSR: 상태별 메시지 분기)

관리자 (세션 필수 — Middleware 자동 보호)
├── /admin                 → 로그인
├── /admin/dashboard       → 통계 대시보드 (SSR + DB 직접 쿼리)
├── /admin/umbrellas       → 우산 재고 관리 (CSR)
├── /admin/rentals         → 대여 현황 + 예외 처리 (CSR)
└── /admin/export          → CSV 내보내기 (CSR)

시스템
├── /api/health            → Docker healthcheck
└── /api/cron/cleanup      → 만료 데이터 자동 삭제 (CRON_SECRET 검증)
```

### Middleware 보호

```typescript
// src/middleware.ts
export default auth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin/");
  const isLoggedIn = !!req.auth;
  if (isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
});
export const config = { matcher: ["/admin/:path+"] };
```

---

## 10. API 설계

### 학생 API (인증 없음, 서버에서 입력값 Zod 검증)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/umbrellas/[id]` | 특정 우산 상태 조회 |
| `POST` | `/api/rentals` | 대여 신청 (자동 승인, DB 트랜잭션) |
| `POST` | `/api/rentals/return` | 반납 (R2 업로드 + DB 트랜잭션) |
| `GET` | `/api/rentals/status?studentId=&studentName=` | 본인 진행 중인 대여 조회 |

### 관리자 API (NextAuth 세션 필수)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/admin/umbrellas` | 우산 목록 |
| `POST` | `/api/admin/umbrellas` | 우산 추가 + QR DataURL 반환 |
| `PATCH` | `/api/admin/umbrellas/[id]` | 우산 상태 변경 |
| `DELETE` | `/api/admin/umbrellas/[id]` | 우산 삭제 (활성 대여 없을 때만) |
| `GET` | `/api/admin/rentals?status=&umbrellaNumber=` | 대여 목록 (Zod 필터 검증) |
| `PATCH` | `/api/admin/rentals/[id]` | 대여 상태 + 메모 변경 (우산 상태 자동 연동) |
| `GET` | `/api/admin/stats` | 통계 (`getStats()` 공유 함수 사용) |
| `GET` | `/api/admin/export?from=&to=` | CSV 다운로드 (BOM 포함) |

### Cron API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/cron/cleanup` | `Authorization: Bearer {CRON_SECRET}` 검증 후 만료 데이터 삭제 |

---

## 11. 자동 삭제

```bash
# VPS crontab (매일 자정 KST = UTC 15:00)
0 15 * * * curl -s \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain.com/api/cron/cleanup \
  >> /var/log/cron-cleanup.log 2>&1
```

**처리 로직:**
1. `deleteAt <= now()` 인 Rental 레코드 조회
2. `returnPhotoUrl` → Cloudflare R2에서 파일 삭제
3. Rental 레코드 DB에서 삭제
4. 삭제 건수 로그 기록 (성공/실패 분리)

---

## 12. 환경 변수

```env
# Neon PostgreSQL
DATABASE_URL="postgresql://user:pass@ep-xxx.aws.neon.tech/db?sslmode=require"

# Cloudflare R2
R2_ACCOUNT_ID="cloudflare-account-id"
R2_ACCESS_KEY_ID="r2-access-key"
R2_SECRET_ACCESS_KEY="r2-secret-key"
R2_BUCKET_NAME="umbrella-returns"
R2_PUBLIC_URL="https://pub-xxx.r2.dev"

# NextAuth.js
AUTH_SECRET="openssl rand -base64 32"
NEXTAUTH_URL="https://your-domain.com"

# 관리자 계정
ADMIN_ID="sannamgo"
ADMIN_PASSWORD_HASH="bcrypt hash of password"   # node scripts/setup-admin-hash.js <pw>

# 설정값
DELETE_AFTER_DAYS="7"
SESSION_LIFETIME_SECONDS="7200"
MAX_UPLOAD_SIZE_MB="5"

# Cron 보안
CRON_SECRET="openssl rand -hex 32"
```

---

## 13. 파일 구조

```
umbrella-hub/
├── Dockerfile                       ← 3단계 멀티스테이지 (deps→builder→runner)
├── docker-compose.yml               ← VPS 실행, healthcheck 포함
├── nginx/umbrella.conf              ← HTTPS 리버스 프록시 설정
├── .github/workflows/deploy.yml     ← CI: 린트→타입체크→Docker빌드→SSH배포
├── scripts/setup-admin-hash.js      ← 관리자 비밀번호 bcrypt 해시 생성 도구
├── prisma/
│   ├── schema.prisma                ← Umbrella, Rental 모델
│   └── seed.ts                      ← 초기 우산 5개 등록 시드
└── src/
    ├── middleware.ts                 ← /admin/* 세션 보호
    ├── types/index.ts               ← 공통 타입 + NextAuth/JWT 모듈 확장
    ├── lib/
    │   ├── db.ts                    ← Prisma 싱글턴
    │   ├── r2.ts                    ← Cloudflare R2 업로드/삭제
    │   ├── auth.ts                  ← NextAuth 설정 (Credentials + JWT)
    │   ├── validations.ts           ← Zod 스키마 (rentalSchema, rentalListQuerySchema 등)
    │   ├── queries.ts               ← 공유 DB 쿼리 (getStats, getActiveRentalByStudent)
    │   └── utils.ts                 ← formatDate, calcDeleteAt, generateQRDataUrl 등
    ├── app/
    │   ├── layout.tsx               ← 루트 레이아웃 (Toaster 포함)
    │   ├── page.tsx                 ← 학생 홈 (안내 + 상태조회)
    │   ├── rent/[umbrellaId]/       ← QR 대여 (SSR)
    │   ├── return/[umbrellaId]/     ← QR 반납 (SSR, 상태별 분기)
    │   ├── admin/
    │   │   ├── layout.tsx           ← 관리자 공통 (SessionProvider + Sidebar)
    │   │   ├── page.tsx             ← 로그인
    │   │   ├── dashboard/           ← 통계 (SSR + getStats 직접 호출)
    │   │   ├── umbrellas/           ← 우산 관리 (CSR)
    │   │   ├── rentals/             ← 대여 현황 (CSR)
    │   │   └── export/              ← CSV
    │   └── api/
    │       ├── auth/[...nextauth]/  ← NextAuth handlers
    │       ├── health/              ← Docker healthcheck
    │       ├── umbrellas/[id]/      ← 우산 상태 조회
    │       ├── rentals/             ← 대여 신청 / 상태 조회 / 반납
    │       ├── admin/               ← 관리자 API (우산·대여·통계·CSV)
    │       └── cron/cleanup/        ← 자동 삭제
    └── components/
        ├── ui/                      ← toast, toaster, use-toast
        ├── student/                 ← RentalForm, ReturnForm, StatusChecker
        └── admin/                   ← AdminSidebar, SessionProviderWrapper,
                                        LoginForm, StatsCards, WeeklyChart,
                                        OverdueList, UmbrellaTable, RentalTable,
                                        QRModal, AddUmbrellaModal
```

---

## 14. 개발 우선순위 (MVP — 완료)

| Phase | 범위 | 상태 |
|-------|------|------|
| 1 | Neon + Prisma 스키마 마이그레이션 | ✅ |
| 2 | QR 대여 페이지 + 자동 승인 API | ✅ |
| 3 | QR 반납 페이지 + Cloudflare R2 사진 업로드 | ✅ |
| 4 | NextAuth 관리자 로그인 + Middleware 보호 | ✅ |
| 5 | 관리자 우산 관리 + QR 생성/다운로드 | ✅ |
| 6 | 관리자 대여 현황 + 메모/상태 변경 | ✅ |
| 7 | 통계 대시보드 (SSR 직접 쿼리) + CSV | ✅ |
| 8 | VPS crontab 자동 삭제 | ✅ |
| 9 | Docker + Nginx + GitHub Actions 배포 | ✅ |

---

## 15. 품질 점검 결과 (v4.0 수정 사항)

| 분류 | 문제 | 수정 |
|------|------|------|
| 🔴 심각 | 대시보드: `Cookie: ""`로 통계 API 항상 401 실패 | `getStats()` 함수 분리, SSR에서 직접 호출 |
| 🔴 심각 | `OVERDUE` 대여 → 우산이 `AVAILABLE`로 잘못 변경 | `toUmbrellaStatus()` 함수로 상태 매핑 명시화 |
| 🟡 중간 | 중복 대여 방지 시 `RENTED`만 체크 | `ACTIVE_RENTAL_STATUSES` 상수로 통일 |
| 🟡 중간 | 학생 상태 조회 시 `OVERDUE` 미표시 | `getActiveRentalByStudent()` 공유 함수 사용 |
| 🟡 중간 | `Umbrella` Zod에 없는 `note` 필드 | `updateUmbrellaSchema`에서 `note` 제거 |
| 🟡 중간 | `token.role` TypeScript 타입 선언 누락 | `declare module "next-auth/jwt"` 추가 |
| 🟡 중간 | `status as never` 타입 우회 | `rentalListQuerySchema`로 Zod 검증 |
| 🟢 경미 | `SessionProvider` 누락 | `SessionProviderWrapper` 생성, 관리자 레이아웃 적용 |
| 🟢 경미 | `RentalTable` note UI 없음 | 메모 입력칸 + 변경 시 활성화되는 저장 버튼 추가 |
| 🟢 경미 | `prisma/seed.ts` 누락 | 우산 5개 기본 등록 시드 파일 생성 |
| 🟢 경미 | 반납 페이지 상태 분기 부실 | AVAILABLE/MAINTENANCE 별도 메시지로 분기 |

---

## 16. 오픈 이슈 / 추후 고려사항

- [ ] 장기 미반납(N일) 자동 감지 → 관리자 이메일 알림 (Resend 무료 플랜)
- [ ] QR 코드 PDF 일괄 출력 (스티커 인쇄용 A4 레이아웃)
- [ ] 다중 관리자 계정 (DB 기반 `admins` 테이블)
- [ ] 학생 SMS/카카오 알림 연동
- [ ] Vercel Analytics 또는 Umami (셀프호스팅 분석)
- [ ] PWA 지원 (홈 화면 추가)
- [ ] 우산 분실 시 학생 위약금 안내 페이지
