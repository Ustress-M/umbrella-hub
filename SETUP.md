# 우산 대여 시스템 — 초보자 배포 가이드

> **소요 시간:** 약 2~3시간 (처음 설정 기준)  
> **월 비용:** ~6,000원 (Hetzner VPS만 유료, 나머지 무료)  
> **필요한 것:** GitHub 계정, 신용카드(Hetzner 결제용)

---

## 외부 사이트 UI 안내 (중요)

GitHub·Cloudflare·Neon·Hetzner 등은 **메뉴 이름·왼쪽 사이드바 구조·버튼 문구가 자주 바뀝니다.** 이 문서의 영문 메뉴명과 화면 위치는 **찾기 위한 힌트**일 뿐입니다.


| 원칙            | 설명                                                                                 |
| ------------- | ---------------------------------------------------------------------------------- |
| **대시보드 검색**   | 각 사이트 상단의 검색창에 키워드 입력 (예: Neon은 `connection`, Cloudflare는 `R2`, GitHub는 `Secrets`) |
| **공식 문서**     | 해당 서비스 문서의 최신 스크린샷·경로를 우선합니다                                                       |
| **앱 내 고정 정보** | 관리자 메뉴 이름·URL 경로는 이 레포의 실제 코드와 아래 **이 앱에서만** 확정적으로 적었습니다                           |


---

## 목차

1. [계정 준비](#1-계정-준비)
2. [Neon — 데이터베이스 설정](#2-neon--데이터베이스-설정)
3. [Cloudflare R2 — 사진 저장 설정](#3-cloudflare-r2--사진-저장-설정)
4. [GitHub 레포지토리 생성](#4-github-레포지토리-생성)
5. [로컬 개발 환경 (Windows 포함)](#5-로컬-개발-환경-windows-포함)
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


| 서비스            | 용도                   | URL                                              |
| -------------- | -------------------- | ------------------------------------------------ |
| **GitHub**     | 코드 저장 + CI/CD 자동 배포  | [https://github.com](https://github.com)         |
| **Neon**       | PostgreSQL DB (서버리스) | [https://neon.tech](https://neon.tech)           |
| **Cloudflare** | 반납 사진 저장 (R2)        | [https://cloudflare.com](https://cloudflare.com) |
| **Hetzner**    | VPS 서버 (유일한 유료 항목)   | [https://hetzner.com](https://hetzner.com)       |


---

## 2. Neon — 데이터베이스 설정

1. **Neon**에 로그인합니다. (콘솔 주소는 [https://console.neon.tech](https://console.neon.tech) 등으로 안내되며, 변경될 수 있습니다.)
2. **새 프로젝트** 생성 (**New Project**, **Create project** 등 표기 가능).
3. 설정 예시:
  - Project name: `umbrella-hub` (임의)
  - Region: **한국과 지연을 줄이려면 동아시아 리전**을 선택합니다. 리전 코드는 프로젝트 생성 화면 또는 문서에 표시됩니다.  
    - 예: **서울** 근처는 보통 `ap-northeast-2`, **싱가포르** 등은 `ap-southeast-1` 계열로 표시되는 경우가 많습니다.  
    - 이전 문서에서 “Seoul”과 `ap-southeast-1`을 함께 쓰면 안 됩니다. **항상 Neon 화면에 적힌 리전 이름·코드를 따르세요.**
4. 프로젝트 생성 후 **연결 정보**를 엽니다. 메뉴명은 **Connection details**, **Connect**, **Dashboard** 안의 연결 문자열 카드 등으로 불릴 수 있습니다.
5. **두 종류의 URL을 모두 복사**합니다. 화면에 **Pooled connection** / **Direct connection** 토글이 있거나, `-pooler` 포함 여부로 구분됩니다.
   - **`DATABASE_URL`** ← *Pooled* (호스트명에 `-pooler` 포함). 앱 런타임이 connection pool을 거치도록.
   - **`DIRECT_URL`** ← *Direct* (`-pooler` 없음). Prisma CLI(migrate/introspect)가 PgBouncer 를 우회하도록. 없으면 `prisma migrate deploy` 등이 `P1001`로 실패합니다.

```
# .env.local / .env / .env.production 에 둘 다 넣기
DATABASE_URL="postgresql://username:password@ep-xxx-pooler.<리전>.neon.tech/neondb?sslmode=require&connect_timeout=15"
DIRECT_URL="postgresql://username:password@ep-xxx.<리전>.neon.tech/neondb?sslmode=require&connect_timeout=15"
```

> **`connect_timeout=15` 은 반드시 포함**하세요. Neon 은 비활성 compute 를 scale-to-zero 로 재우는데, 다시 깨우는 데 5~15초가 걸릴 수 있습니다. Prisma 기본 타임아웃이 5초라 `P1001: Can't reach database server` 가 발생할 수 있습니다 (Neon 공식 권장).
>
> 로컬 Postgres 등 pooler 가 없는 DB 를 쓸 때는 `DIRECT_URL` 을 비워두거나 `DATABASE_URL` 과 같은 값으로 둬도 됩니다. `prisma.config.ts` 가 `DIRECT_URL → DATABASE_URL` 순으로 폴백합니다.

---

## 3. Cloudflare R2 — 사진 저장 설정

### 3-1. R2 버킷 생성

1. [https://dash.cloudflare.com](https://dash.cloudflare.com) 로그인
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

# 4. 원격 연결 & Push (your-username은 본인 GitHub 아이디로 교체)
git remote add origin https://github.com/your-username/umbrella-hub.git

# 이미 origin이 있다면(URL이 틀렸을 때):
# git remote set-url origin https://github.com/your-username/umbrella-hub.git

git branch -M main
git push -u origin main
```

---

## 5. 로컬 개발 환경 (Windows 포함)

이 레포는 **Next.js 16**, **React 19**, **Prisma 7**(드라이버 어댑터), **Tailwind CSS 4**, **ESLint 9**(flat config) 조합입니다. 세부 설정 파일은 레포 루트의 `next.config.ts`, `prisma.config.ts`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.mjs`, `src/proxy.ts` 등을 참고하세요.

### 5-0. Windows(PC)에서 개발할 때


| 항목                         | 안내                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node.js**                | **LTS(20 이상)** 권장. [nodejs.org](https://nodejs.org) 에서 설치 후 터미널에서 `node -v`, `npm -v` 확인합니다.                                                                                                                                                                                                                                     |
| **터미널**                    | **PowerShell** 또는 **Windows Terminal** 사용을 권장합니다. 명령은 폴더 단위로 한 줄씩 실행하면 됩니다.                                                                                                                                                                                                                                                      |
| **경로에 공백**                 | 프로젝트가 `D:\Umbrella Hub`처럼 공백이 있으면 이동 시 따옴표를 씁니다: `cd "D:\Umbrella Hub"`                                                                                                                                                                                                                                                          |
| **여러 명령 한 줄에**             | PowerShell 구버전은 `&&`가 동작하지 않을 수 있습니다. 필요하면 **명령을 줄바꿈해서 각각 실행**하거나, 최신 PowerShell/Git Bash를 사용합니다.                                                                                                                                                                                                                                |
| `**openssl`**              | 문서 예시의 `openssl rand ...` 대신 PowerShell에서 난수가 필요하면 아래처럼 **Node 한 줄**을 쓸 수 있습니다: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"` (Git for Windows를 설치하면 동봉된 `openssl`을 쓸 수도 있습니다.)                                                                                                                     |
| `**.env` vs `.env.local`** | Next.js 개발 서버는 **`.env.local`**을 우선 로드합니다. 반면 `**npx prisma …`** CLI는 레포의 `prisma.config.ts` 기준으로 주로 루트 **`.env`**를 읽습니다. `**DATABASE_URL` 등 DB 관련 값은 `.env.local`만 채우면 Prisma 명령이 실패할 수 있으므로**, 로컬에서는 다음 중 하나를 하세요. • `.env.example`을 **`.env`**와 `**.env.local`** 둘 다에 복사한 뒤 같은 내용으로 채우거나 • 내용이 같다면 한쪽 수정 후 다른 쪽에도 동일하게 복사합니다. |


`npm install` 후 `**postinstall`에서 `prisma generate`가 자동 실행**되어 `src/generated/prisma` 클라이언트가 만들어집니다(폴더는 `.gitignore` 대상).

### 5-1. 의존성 설치

```powershell
npm install
```

### 5-2. 환경 변수 파일 생성

Windows PowerShell에서 **프로젝트 루트(`D:\Umbrella Hub`)**에 있는지 먼저 확인한 뒤 진행합니다.

```powershell
pwd
# 출력이 D:\Umbrella Hub 인지 확인
```

아래 순서대로 진행하세요.

1. `.env.example`을 개발용 파일 2개로 복사합니다.
  - Next.js 런타임: `.env.local`  
  - Prisma CLI(`prisma.config.ts`): `.env`

```powershell
copy .env.example .env.local
copy .env.example .env
```

1. 두 파일이 생성됐는지 확인합니다.

```powershell
dir .env*
```

1. 편한 편집기로 두 파일을 열어 값을 입력합니다.

```powershell
notepad .env.local
notepad .env
```

1. 아래 필수 값을 채웁니다. (따옴표 포함 권장)

```env
DATABASE_URL="Neon에서 복사한 연결 문자열"
R2_ACCOUNT_ID="Cloudflare 계정 ID"
R2_ACCESS_KEY_ID="R2 Access Key ID"
R2_SECRET_ACCESS_KEY="R2 Secret Access Key"
R2_BUCKET_NAME="umbrella-returns"
R2_PUBLIC_URL="https://pub-xxx.r2.dev"
AUTH_SECRET="랜덤 문자열 (예: openssl rand -base64 32 — Windows에서는 위 Node 한 줄 예시 참고)"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_ID="관리자 로그인 ID"
ADMIN_PASSWORD_HASH=""           ← 다음 단계에서 생성
DELETE_AFTER_DAYS="7"
MAX_UPLOAD_SIZE_MB="5"
CRON_SECRET="랜덤 문자열"
```

1. 선택 변수(기본값 있음)도 필요하면 지정합니다.

```env
SESSION_LIFETIME_SECONDS="7200"
```

1. 입력 후 `**.env.local`과 `.env`의 값이 동일한지** 확인합니다.
  특히 아래 5개는 오타가 잦으니 다시 확인하세요.
  - `DATABASE_URL`
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_PUBLIC_URL`

### 5-3. 관리자 비밀번호 해시 생성

```powershell
node scripts/setup-admin-hash.js "여기에_실제_비밀번호"
```

출력된 `ADMIN_PASSWORD_HASH="$2a$12$..."`를 `**.env.local`과 `.env` 둘 다**(또는 사용 중인 쪽)에 동일하게 넣습니다.  
(대안: `.env.example`에 적힌대로 Node 한 줄에서 `bcryptjs`로 해시 생성 가능.)

### 5-4. DB 마이그레이션 (테이블 생성)

연결 문자열은 루트 `.env`의 `DATABASE_URL`에서 읽힙니다(`prisma.config.ts`). 위에서 `.env`를 채웠는지 확인하세요.

```powershell
npx prisma migrate dev --name init
```

### 5-5. 초기 우산 데이터 시드 (선택)

시드 스크립트도 DB 연결이 필요합니다(`DATABASE_URL`).

```powershell
npm run db:seed
# → 우산 001~005번 자동 생성
```

### 5-6. 개발 서버 실행

```powershell
npm run dev
# http://localhost:3000 접속
```

코드 검사(선택):

```powershell
npm run type-check
npm run lint
```

**개발 환경 확인 체크리스트:**

- `http://localhost:3000` — 학생용 홈
- `http://localhost:3000/admin` — 관리자 로그인 (로그인 전)
- 로그인 성공 시 `**/admin/dashboard`** 로 이동
- 사이드바 **우산 관리** (`/admin/umbrellas`)에서 우산 추가·**QR 보기**·PNG 다운로드
- `http://localhost:3000/rent/[우산ID]` 대여 신청
- `http://localhost:3000/return/[우산ID]` 반납·사진 업로드

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

1. [https://console.hetzner.cloud](https://console.hetzner.cloud) → **서버 추가**, **Add Server**, **+** 등으로 새 서버 생성
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

내용은 로컬 `.env.local`과 동일하게 맞추되, `**NEXTAUTH_URL`만 실제 도메인**(예: `https://your-domain.com`)으로 둡니다.

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


| Secret 이름      | 값                                | 설명                                                        |
| -------------- | -------------------------------- | --------------------------------------------------------- |
| `VPS_HOST`     | VPS 공인 IP                        | 예: `1.2.3.4`                                              |
| `VPS_USER`     | `deploy`                         | SSH 사용자명                                                  |
| `VPS_SSH_KEY`  | SSH **개인 키** 전체                  | 아래 참고                                                     |
| `DATABASE_URL` | Neon **pooled** 연결 문자열 (`-pooler` 포함) | CI 러너의 Prisma migrate 가 `prisma.config.ts` 로딩 시 폴백용으로 읽음  |
| `DIRECT_URL`   | Neon **direct** 연결 문자열 (`-pooler` 없음) | `prisma migrate deploy` 가 실제로 사용하는 값. DDL·advisory lock 을 위해 pooler 우회 필수 |


> **왜 DB URL 을 GitHub Secrets 에 넣나?** 2026 현재 Neon+Prisma 권장 CI 마이그레이션 경로는 **VPS 가 아닌 GitHub Actions 러너에서 `prisma migrate deploy` 를 실행**하는 것입니다. 러너는 깨끗한 듀얼스택 네트워크·AWS 백본 근접성 덕분에 Neon 컴퓨트 cold-start·IPv6 AAAA 문제 없이 연결되며, 실패 시 워크플로 로그에 재시도가 표준적으로 남습니다. 기존 "VPS 안에서 docker run 으로 migrate" 방식은 Docker bridge 가 IPv6 폴백을 못 해 `P1001: Can't reach database server` 가 재현되는 경우가 많습니다. 값은 루트 `.env` 의 `DATABASE_URL` / `DIRECT_URL` 과 동일하게 복사해 넣으면 됩니다 (따옴표는 빼고 순수 URL만).


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
2. **DB 마이그레이션 (Neon)** → 러너에서 `prisma migrate deploy` 실행. Neon 컴퓨트 재개 지연에 대비해 최대 5회 backoff 재시도.
3. **Docker 이미지 빌드 & Push** → GHCR(`ghcr.io/<owner>/<repo>`)
4. **VPS SSH 배포** → 이미지 pull → `docker compose up -d` (마이그레이션은 이 단계에 포함되지 않음)

`.github/workflows/deploy.yml` 기준으로 **DB 마이그레이션은 러너 job 에서 완료된 뒤에야 빌드·배포가 진행**됩니다. 마이그레이션이 실패하면 배포 job 은 시작되지 않아, 스키마 불일치로 인한 장애를 사전에 차단합니다.

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

`https://your-domain.com/admin` → 환경 변수의 `ADMIN_ID` / 비밀번호로 로그인 → 성공 시 `**/admin/dashboard`** (대시보드).

### 11-2. 관리자 화면 구조 (사이드바)


| 메뉴 (앱 내 표시명) | URL 경로                |
| ------------ | --------------------- |
| 대시보드         | `/admin/dashboard`    |
| 우산 관리        | `/admin/umbrellas`    |
| 대여 현황        | `/admin/rentals`      |
| CSV 내보내기     | `/admin/export`       |
| 로그아웃         | (세션 종료 후 `/admin` 으로) |


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

루트 `.env`의 `DATABASE_URL`이 설정된 상태에서:

```powershell
npm run db:studio
```

브라우저에서 `http://localhost:5555` → 테이블 조회·수정.

---

## 14. 문제 해결


| 증상              | 원인          | 해결법                                                              |
| --------------- | ----------- | ---------------------------------------------------------------- |
| 사이트가 열리지 않음     | 컨테이너·Nginx  | `docker compose ps`, `docker logs umbrella-hub`, `sudo nginx -t` |
| 관리자 로그인 실패      | 해시·ADMIN_ID | `node scripts/setup-admin-hash.js`로 해시 재생성·`.env.production` 반영  |
| 통계·대시보드 비정상     | DB 연결       | 로그에서 Prisma 오류, `DATABASE_URL` 확인                                |
| 사진 업로드 실패       | R2 설정       | 버킷명·키·`R2_PUBLIC_URL`                                            |
| OAuth/세션 URL 오류 | 도메인 불일치     | `NEXTAUTH_URL`이 실제 HTTPS URL과 일치하는지                              |
| SSL 문제          | Certbot     | `sudo certbot renew`, Nginx 재시작                                  |
| Actions 실패      | Secrets·SSH | 실패한 Job 로그 확인                                                    |
| Cron 미동작        | 토큰 불일치      | `crontab -l`, `CRON_SECRET` 일치 여부                                |
| GHCR pull 실패    | 권한·경로       | 배포 로그의 `docker login`, 이미지 경로 확인                                 |
| 느린 첫 요청         | Neon 슬립     | 첫 요청만 지연되는지 확인                                                   |


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


| 변수명                        | 필수  | 설명                    | 예시                          |
| -------------------------- | --- | --------------------- | --------------------------- |
| `DATABASE_URL`             | ✅   | 앱 런타임용 (Neon pooled) | `postgresql://...-pooler.../...?sslmode=require` |
| `DIRECT_URL`               | ✅*  | Prisma CLI migrate 용 (Neon direct). pooler 없는 DB는 생략 가능 | `postgresql://.../...?sslmode=require` |
| `R2_ACCOUNT_ID`            | ✅   | Cloudflare 계정 ID      |                             |
| `R2_ACCESS_KEY_ID`         | ✅   | R2 API 키              |                             |
| `R2_SECRET_ACCESS_KEY`     | ✅   | R2 API 시크릿            |                             |
| `R2_BUCKET_NAME`           | ✅   | 버킷명                   | `umbrella-returns`          |
| `R2_PUBLIC_URL`            | ✅   | 공개 베이스 URL            | `https://pub-xxx.r2.dev`    |
| `AUTH_SECRET`              | ✅   | NextAuth 암호화용         | 무작위 긴 문자열(Node/`openssl` 등) |
| `NEXTAUTH_URL`             | ✅   | 사이트 공개 URL            | `https://your-domain.com`   |
| `ADMIN_ID`                 | ✅   | 관리자 ID                |                             |
| `ADMIN_PASSWORD_HASH`      | ✅   | bcrypt 해시             | `$2a$12$...`                |
| `CRON_SECRET`              | ✅   | Cron API 보호           | 무작위 hex 문자열 등               |
| `DELETE_AFTER_DAYS`        | —   | 반납 후 보관 일수            | `7`                         |
| `SESSION_LIFETIME_SECONDS` | —   | 관리자 세션(초), 기본 7200    | `7200`                      |
| `MAX_UPLOAD_SIZE_MB`       | —   | 업로드 상한                | `5`                         |


---

*문서 갱신 시점 기준으로 워크플로·환경 변수는 레포의 `.github/workflows/deploy.yml`, `.env.example`, `prisma.config.ts`, `src/components/admin/AdminSidebar.tsx`, `src/proxy.ts`(관리자 경로 보호, 구 `middleware`), `tailwind.config.js`·`postcss.config.js`(Tailwind 4) 등과 맞추었습니다. 로컬(특히 Windows)에서는 `**DATABASE_URL`을 `.env`에 두는 것**까지 포함해 위 [5번](#5-로컬-개발-환경-windows-포함)을 따르세요. 외부 서비스 UI는 수시로 변하므로, 본문 상단의 [외부 사이트 UI 안내](#외부-사이트-ui-안내-중요)를 참고하세요.*