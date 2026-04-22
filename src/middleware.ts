import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 관리자 전용 URL 보호 및 캐시 금지.
//
// Auth.js v5 의 auth() 를 middleware 에서 직접 호출하면 edge 런타임에서
// bcrypt 등 Node 전용 모듈 의존성 문제가 나올 수 있음. 여기서는 세션 쿠키의
// "존재 여부" 만 가볍게 확인(라우팅 가드 용도). 실제 세션 유효성 검증은
// 각 페이지의 auth() 호출과 API 라우트의 auth() 가 담당한다.
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

const hasSessionCookie = (req: NextRequest): boolean =>
  SESSION_COOKIE_NAMES.some((name) => req.cookies.get(name)?.value);

export const middleware = (req: NextRequest) => {
  const { pathname } = req.nextUrl;
  const loggedIn = hasSessionCookie(req);

  const addNoStore = (res: NextResponse) => {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.headers.set("Pragma", "no-cache");
    return res;
  };

  if (pathname === "/admin") {
    if (loggedIn) {
      return addNoStore(NextResponse.redirect(new URL("/admin/dashboard", req.url)));
    }
    return addNoStore(NextResponse.next());
  }

  if (pathname.startsWith("/admin/")) {
    if (!loggedIn) {
      return addNoStore(NextResponse.redirect(new URL("/admin", req.url)));
    }
    return addNoStore(NextResponse.next());
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
