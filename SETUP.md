# 우산 대여 시스템 — 초보자 배포 가이드

> **소요 시간:** 약 2~3시간 (처음 설정 기준)  
> **월 비용:** ~6,000원 (Hetzner VPS만 유료, 나머지 무료)  
> **필요한 것:** GitHub 계정, 신용카드(Hetzner 결제용)

---

## 외부 사이트 UI 안내 (중요)

GitHub·Cloudflare·Neon·Hetzner 등은 **메뉴 이름·왼쪽 사이드바 구조·버튼 문구가 자주 바뀝니다.** 이 문서의 영문 메뉴명과 화면 위치는 **찾기 위한 힌트**일 뿐입니다.

| 원칙 | 설명 |
|------|------|
| **대시보드 검색** | 각 사이트 상단의 검색창에 키워드 입력 (예: Neon은 `connection`, Cloudflare는 `R2`, GitHub는 `Secrets`) |
| **공식 문서** | 해당 서비스 문서의 최신 스크린샷·경로를 우선합니다 |
| **앱 내 고정 정보** | 관리자 메뉴 이름·URL 경로는 이 레포의 실제 코드와 아래 **이 앱에서만** 확정적으로 적었습니다 |

---

## 목차

1. [계정 준비](#1-계정-준비)
2. [Neon — 데이터베이스 설정](#2-neon--데이터베이스-설정)
3. [Cloudflare R2 — 사진 저장 설정](#3-cloudflare-r2--사진-저장-설정)
4. [GitHub 레포지토리 생성](#4-github-레포지토리-생성)
5. [로컬 개발 환경](#5-로컬-개발-환경)
6. [Hetzner VPS 서버 구매](#6-hetzner-vps-서버-구매)
7. [VPS 서버 초기 설정](#7-vps-서버-초기-설정)
8. [도메인 & SSL 설정](#8-도메인--ssl-설정)
9. [GitHub Actions Secrets 등록](#9-github-actions-secrets-등록)
10. [첫 배포 실행](#10-첫-배포-실행)
11. [운영 시작 — 우산 등록 & QR 인쇄](#11-운영-시작--우산-등록--qr-인쇄)
12. [자동 삭제 Cron 설정](#12-자동-삭제-cron-설정)
13. [자주 하는 작업](#13-자주-하는-작업)
14. [문제 해결](#14-문제-해결)

---

## 1. 계정 준비

아래 서비스에 모두 **무료** 가입합니다.

| 서비스 | 용도 | URL |
|--------|------|-----|
| **GitHub** | 코드 저장 + CI/CD 자동 배포 | https://github.com |
| **Neon** | PostgreSQL DB (서버리스) | https://neon.tech |
| **Cloudflare** | 반납 사진 저장 (R2) | https://cloudflare.com |
| **Hetzner** | VPS 서버 (유일한 유료 항목) | https://hetzner.com |

---

## 2. Neon — 데이터베이스 설정

1. **Neon**에 로그인합니다. (콘솔 주소는 https://console.neon.tech 등으로 안내되며, 변경될 수 있습니다.)
2. **새 프로젝트** 생성 (**New Project**, **Create project** 등 표기 가능).
3. 설정 예시:
   - Project name: `umbrella-hub` (임의)
   - Region: **한국과 지연을 줄이려면 동아시아 리전**을 선택합니다. 리전 코드는 프로젝트 생성 화면 또는 문서에 표시됩니다.  
     - 예: **서울** 근처는 보통 `ap-northeast-2`, **싱가포르** 등은 `ap-southeast-1` 계열로 표시되는 경우가 많습니다.  
     - 이전 문서에서 “Seoul”과 `ap-southeast-1`을 함께 쓰면 안 됩니다. **항상 Neon 화면에 적힌 리전 이름·코드를 따르세요.**
4. 프로젝트 생성 후 **연결 정보**를 엽니다. 메뉴명은 **Connection details**, **Connect**, **Dashboard** 안의 연결 문자열 카드 등으로 불릴 수 있습니다.
5. **Connection string**(connection URI, Postgres URL 등)을 복사해 로컬 `.env.local`의 `DATABASE_URL`에 넣습니다.

```
postgresql://username:password@ep-xxx.<리전>.neon.tech/neondb?sslmode=require
```

> Neon은 일정 시간 비활성 시 슬립 → 첫 요청이 1~2초 더 걸릴 수 있습니다. 학교 규모에서는 보통 허용 범위입니다.

---

## 3. Cloudflare R2 — 사진 저장 설정

### 3-1. R2 버킷 생성

1. https://dash.cloudflare.com 로그인
2. 왼쪽 또는 상단 메뉴에서 **R2**, **Object Storage**, **스토리지** 등 **객체 스토리지** 관련 항목으로 이동합니다. (계정 종류·플랜에 따라 메뉴 위치가 다릅니다.)
3. **Create bucket**, **버킷 만들기** 등으로 새 버킷 생성
   - Bucket name: `umbrella-returns` (또는 원하는 이름 — 환경 변수와 일치시킬 것)
   - Location: **Asia Pacific (APAC)** 등 지역이 있으면 가까운 곳 선택

### 3-2. R2 API 토큰 발급

1. R2 영역에서 **API 토큰 관리**, **Manage R2 API tokens**, **개요** 페이지의 토큰 링크 등으로 이동합니다.
2. **Create API token** / **API 토큰 생성**
3. Token name: `umbrella-hub-token` (임의)
4. Permissions: **Object Read & Write** (읽기·쓰기)
5. 버킷 지정이 있으면 `umbrella-returns` 선택
6. 생성 후 아래 값을 메모합니다. (**Secret**은 이 화면을 벗어나면 다시 표시되지 않을 수 있습니다.)

```
Access Key ID     → R2_ACCESS_KEY_ID
Secret Access Key → R2_SECRET_ACCESS_KEY
```

### 3-3. 계정 ID 및 공개 URL 확인

- **Account ID:** 대시보드 사이드바·계정 홈·URL 등에 표시되는 ID → `R2_ACCOUNT_ID`
- **공개 URL 활성화:**
  1. 해당 버킷 선택 → **Settings**, **설정**, **버킷 설정** 등
  2. **Public Access**, **공개 액세스**, **R2.dev 서브도메인** 등에서 공개 허용
  3. 표시되는 `https://pub-xxxx.r2.dev` 형태의 URL → `R2_PUBLIC_URL`

---

## 4. GitHub 레포지토리 생성

```powershell
# 1. 프로젝트 폴더로 이동 (Windows PowerShell)
cd "d:\Umbrella Hub"

# 2. Git 초기화 & 첫 커밋
git init
git add .
git commit -m "chore: initial project setup"

# 3. GitHub에서 새 레포 생성
# → https://github.com/new
# → Repository name: umbrella-hub
# → Private 또는 Public 선택 후 Create repository

# 4. 원격 연결 & Push
git remote add origin https://github.com/your-username/umbrella-hub.git
git branch -M main
git push -u origin main
```

---

## 5. 로컬 개발 환경

### 5-1. 의존성 설치

```bash
npm install
```

### 5-2. 환경 변수 파일 생성

프로젝트 루트의 `.env.example`을 복사합니다. Next.js는 보통 **`.env.local`**을 읽습니다.

```powershell
copy .env.example .env.local
```

`.env.local`을 열어 값을 채웁니다. 변수 설명은 `.env.example` 주석과 동일하며, 아래는 요약입니다.

```env
DATABASE_URL="Neon에서 복사한 연결 문자열"
R2_ACCOUNT_ID="Cloudflare 계정 ID"
R2_ACCESS_KEY_ID="R2 Access Key ID"
R2_SECRET_ACCESS_KEY="R2 Secret Access Key"
R2_BUCKET_NAME="umbrella-returns"
R2_PUBLIC_URL="https://pub-xxx.r2.dev"
AUTH_SECRET="랜덤 문자열 (예: openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_ID="관리자 로그인 ID"
ADMIN_PASSWORD_HASH=""           ← 다음 단계에서 생성
DELETE_AFTER_DAYS="7"
MAX_UPLOAD_SIZE_MB="5"
CRON_SECRET="랜덤 문자열 (예: openssl rand -hex 32)"
```

선택 변수(코드에서 기본값 있음):

```env
SESSION_LIFETIME_SECONDS="7200"
```

### 5-3. 관리자 비밀번호 해시 생성

```bash
node scripts/setup-admin-hash.js "여기에_실제_비밀번호"
```

출력된 `ADMIN_PASSWORD_HASH="$2a$12$..."`를 `.env.local`에 넣습니다.  
(대안: `.env.example`에 적힌대로 Node 한 줄에서 `bcryptjs`로 해시 생성 가능.)

### 5-4. DB 마이그레이션 (테이블 생성)

```bash
npx prisma migrate dev --name init
```

### 5-5. 초기 우산 데이터 시드 (선택)

```bash
npm run db:seed
# → 우산 001~005번 자동 생성
```

### 5-6. 개발 서버 실행

```bash
npm run dev
# http://localhost:3000 접속
```

**개발 환경 확인 체크리스트:**

- [ ] `http://localhost:3000` — 학생용 홈
- [ ] `http://localhost:3000/admin` — 관리자 로그인 (로그인 전)
- [ ] 로그인 성공 시 **`/admin/dashboard`** 로 이동
- [ ] 사이드바 **우산 관리** (`/admin/umbrellas`)에서 우산 추가·**QR 보기**·PNG 다운로드
- [ ] `http://localhost:3000/rent/[우산ID]` 대여 신청
- [ ] `http://localhost:3000/return/[우산ID]` 반납·사진 업로드

---

## 6. Hetzner VPS 서버 구매

### 6-1. SSH 키 먼저 생성 (로컬 PC)

```powershell
# Windows PowerShell에서 실행
ssh-keygen -t ed25519 -C "umbrella-hub"
# 저장 경로: Enter (기본값 C:\Users\USER\.ssh\id_ed25519 사용)
# passphrase: Enter (비워도 됨)

# 공개 키 확인 (아래 내용을 Hetzner에 등록)
cat ~/.ssh/id_ed25519.pub
```

### 6-2. VPS 구매

1. https://console.hetzner.cloud → **서버 추가**, **Add Server**, **+** 등으로 새 서버 생성
2. 설정 예시:
   - **Location:** Helsinki, Nuremberg 등 (EU 리전이 일반적)
   - **Image:** Ubuntu **24.04**
   - **Type:** **CX22** (2 vCPU, 4GB RAM 등 — 가격대 확인)
   - **SSH keys:** 공개 키 등록
   - **Server name:** `umbrella-hub`
3. 생성 후 **IPv4 주소** 기록

---

## 7. VPS 서버 초기 설정

### 7-1. 접속

```powershell
ssh root@<VPS_IP>
```

### 7-2. 시스템 업데이트 + 보안 설정

```bash
apt update && apt upgrade -y

ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

adduser deploy
usermod -aG sudo deploy

rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

### 7-3. Docker 설치

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
docker --version
```

### 7-4. Nginx + Certbot 설치

```bash
apt install -y nginx certbot python3-certbot-nginx
```

### 7-5. 앱 디렉토리 및 환경 변수

```bash
su - deploy
mkdir -p /opt/umbrella-hub
nano /opt/umbrella-hub/.env.production
```

내용은 로컬 `.env.local`과 동일하게 맞추되, **`NEXTAUTH_URL`만 실제 도메인**(예: `https://your-domain.com`)으로 둡니다.

```bash
chmod 600 /opt/umbrella-hub/.env.production
```

### 7-6. docker-compose.yml VPS에 복사

로컬 PC에서:

```powershell
scp "d:\Umbrella Hub\docker-compose.yml" deploy@<VPS_IP>:/opt/umbrella-hub/
```

`docker-compose.yml`의 이미지 이름은 `ghcr.io/${GITHUB_REPOSITORY}` 패턴을 씁니다. VPS에서는 실제 레포 경로와 맞는 이미지가 pull 되어야 하므로, 필요 시 파일 안의 이미지 참조를 본인 `ghcr.io/<GitHub 사용자>/<레포명>` 형태로 맞춥니다.

---

## 8. 도메인 & SSL 설정

### 8-1. DNS A 레코드 추가

도메인 업체(가비아, 카페24, Cloudflare DNS 등)에서 예시:

```
타입: A    이름: @    값: <VPS_IP>    TTL: 300
타입: A    이름: www  값: <VPS_IP>    TTL: 300
```

### 8-2. Nginx 설정 파일 작성

```bash
sudo nano /etc/nginx/sites-available/umbrella.conf
```

저장소의 `nginx/umbrella.conf` 내용을 붙여넣고 `your-domain.com`을 실제 도메인으로 바꿉니다.

```bash
sudo ln -s /etc/nginx/sites-available/umbrella.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8-3. SSL 인증서 (Certbot)

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

자동 갱신: `sudo systemctl status certbot.timer`

---

## 9. GitHub Actions Secrets 등록

레포지토리 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

> GitHub UI에서는 **보안**, **Secrets**, **Variables** 하위 메뉴 이름이 바뀔 수 있습니다. 검색창에 `Actions secrets` 등으로 검색합니다.

| Secret 이름 | 값 | 설명 |
|-------------|-----|------|
| `VPS_HOST` | VPS 공인 IP | 예: `1.2.3.4` |
| `VPS_USER` | `deploy` | SSH 사용자명 |
| `VPS_SSH_KEY` | SSH **개인 키** 전체 | 아래 참고 |

```powershell
cat ~/.ssh/id_ed25519
# -----BEGIN OPENSSH PRIVATE KEY----- 부터 끝까지 전체 복사
```

워크플로에서 `GITHUB_TOKEN`은 자동 제공되므로 Secrets에 넣지 않습니다.

---

## 10. 첫 배포 실행

### 10-1. main 브랜치에 Push

```bash
git add .
git commit -m "deploy: production ready"
git push origin main
```

### 10-2. 배포 진행 확인

레포 → **Actions** 탭 → 워크플로 실행 로그 확인.

단계 요약:

1. **린트 & 타입 체크**
2. **Docker 이미지 빌드 & Push** → GHCR(`ghcr.io/<owner>/<repo>`)
3. **VPS SSH 배포** → 이미지 pull → **`prisma migrate deploy`** → `docker compose up -d`

`.github/workflows/deploy.yml` 기준으로 **마이그레이션은 배포 스크립트 안에서 자동 실행**됩니다.

### 10-3. DB 마이그레이션을 수동으로 할 때

정상이라면 **추가로 VPS에 접속해 마이그레이션할 필요가 없습니다.**  
Actions 실패·이미지 태그 문제 등으로 DB만 따로 적용해야 할 때만 예전처럼 실행합니다:

```bash
ssh deploy@<VPS_IP>
cd /opt/umbrella-hub

docker run --rm \
  --env-file .env.production \
  ghcr.io/your-username/umbrella-hub:latest \
  sh -c "npx prisma migrate deploy"
```

(`your-username/umbrella-hub`는 본인 GHCR 이미지 경로로 교체.)

### 10-4. 앱 기동 확인

```bash
docker compose ps
docker logs umbrella-hub --tail=50
```

브라우저에서 `https://your-domain.com` 접속.

---

## 11. 운영 시작 — 우산 등록 & QR 인쇄

아래 **메뉴 이름·URL은 이 앱 소스 기준**입니다. (외부 클라우드 사이트와 혼동하지 마세요.)

### 11-1. 관리자 로그인

`https://your-domain.com/admin` → 환경 변수의 `ADMIN_ID` / 비밀번호로 로그인 → 성공 시 **`/admin/dashboard`** (대시보드).

### 11-2. 관리자 화면 구조 (사이드바)

| 메뉴 (앱 내 표시명) | URL 경로 |
|---------------------|----------|
| 대시보드 | `/admin/dashboard` |
| 우산 관리 | `/admin/umbrellas` |
| 대여 현황 | `/admin/rentals` |
| CSV 내보내기 | `/admin/export` |
| 로그아웃 | (세션 종료 후 `/admin` 으로) |

### 11-3. 우산 추가 & QR 생성

1. 사이드바 **우산 관리** (`/admin/umbrellas`)
2. **우산 추가** 버튼 → 번호 입력 (예: `001`)
3. 목록 **QR코드** 열에서 **QR 보기**
4. 모달에서 **PNG 다운로드** → 스티커 인쇄 후 우산에 부착

### 11-4. 시드로 001~005를 넣은 경우

`npm run db:seed`만 했다면 DB에는 이미 번호가 있으므로, **우산 관리**에서 **QR 보기**만 하면 됩니다.

---

## 12. 자동 삭제 Cron 설정

반납 완료 후 지정 일수가 지난 데이터를 매일 호출로 정리합니다. (일수는 `DELETE_AFTER_DAYS`)

```bash
crontab -e
```

한국 자정 ≈ UTC 15:00 예시:

```bash
0 15 * * * curl -s \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/cleanup \
  >> /var/log/cron-cleanup.log 2>&1
```

`YOUR_CRON_SECRET`을 `.env.production`의 `CRON_SECRET`과 동일하게 설정합니다.

---

## 13. 자주 하는 작업

### 코드 수정 후 배포

```bash
git add .
git commit -m "fix: 수정 내용"
git push origin main
```

### 관리자 비밀번호 변경

```bash
node scripts/setup-admin-hash.js "새비밀번호"
# 해시를 .env.production의 ADMIN_PASSWORD_HASH에 반영 후
ssh deploy@<VPS_IP>
cd /opt/umbrella-hub
docker compose restart
```

### 앱 로그

```bash
docker logs umbrella-hub --tail=100 -f
```

### Prisma Studio (로컬)

```bash
npm run db:studio
# http://localhost:5555
```

---

## 14. 문제 해결

| 증상 | 원인 | 해결법 |
|------|------|--------|
| 사이트가 열리지 않음 | 컨테이너·Nginx | `docker compose ps`, `docker logs umbrella-hub`, `sudo nginx -t` |
| 관리자 로그인 실패 | 해시·ADMIN_ID | `node scripts/setup-admin-hash.js`로 해시 재생성·`.env.production` 반영 |
| 통계·대시보드 비정상 | DB 연결 | 로그에서 Prisma 오류, `DATABASE_URL` 확인 |
| 사진 업로드 실패 | R2 설정 | 버킷명·키·`R2_PUBLIC_URL` |
| OAuth/세션 URL 오류 | 도메인 불일치 | `NEXTAUTH_URL`이 실제 HTTPS URL과 일치하는지 |
| SSL 문제 | Certbot | `sudo certbot renew`, Nginx 재시작 |
| Actions 실패 | Secrets·SSH | 실패한 Job 로그 확인 |
| Cron 미동작 | 토큰 불일치 | `crontab -l`, `CRON_SECRET` 일치 여부 |
| GHCR pull 실패 | 권한·경로 | 배포 로그의 `docker login`, 이미지 경로 확인 |
| 느린 첫 요청 | Neon 슬립 | 첫 요청만 지연되는지 확인 |

### 긴급 롤백 (이미지 태그)

```bash
ssh deploy@<VPS_IP>
cd /opt/umbrella-hub
docker pull ghcr.io/your-username/umbrella-hub:<이전-git-SHA>
# compose의 image 태그를 맞춘 뒤
docker compose up -d --no-deps app
```

---

## 빠른 참조 — 환경 변수 전체 목록

| 변수명 | 필수 | 설명 | 예시 |
|--------|:----:|------|------|
| `DATABASE_URL` | ✅ | Neon 등 PostgreSQL URL | `postgresql://...` |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare 계정 ID | |
| `R2_ACCESS_KEY_ID` | ✅ | R2 API 키 | |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 API 시크릿 | |
| `R2_BUCKET_NAME` | ✅ | 버킷명 | `umbrella-returns` |
| `R2_PUBLIC_URL` | ✅ | 공개 베이스 URL | `https://pub-xxx.r2.dev` |
| `AUTH_SECRET` | ✅ | NextAuth 암호화용 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | 사이트 공개 URL | `https://your-domain.com` |
| `ADMIN_ID` | ✅ | 관리자 ID | |
| `ADMIN_PASSWORD_HASH` | ✅ | bcrypt 해시 | `$2a$12$...` |
| `CRON_SECRET` | ✅ | Cron API 보호 | `openssl rand -hex 32` |
| `DELETE_AFTER_DAYS` | — | 반납 후 보관 일수 | `7` |
| `SESSION_LIFETIME_SECONDS` | — | 관리자 세션(초), 기본 7200 | `7200` |
| `MAX_UPLOAD_SIZE_MB` | — | 업로드 상한 | `5` |

---

*문서 갱신 시점 기준으로 워크플로·환경 변수는 레포의 `.github/workflows/deploy.yml`, `.env.example`, `src/components/admin/AdminSidebar.tsx`와 맞추었습니다. 외부 서비스 UI는 수시로 변하므로, 본문 상단의 [외부 사이트 UI 안내](#외부-사이트-ui-안내-중요)를 참고하세요.*
