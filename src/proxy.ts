import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Next.js 16 부터 `middleware.ts` 는 deprecated 되고 `proxy.ts` 로 대체됨.
// 이 파일은 모든 관리자 URL 에 대한 1차 인증 가드 + 캐시 금지 헤더를 담당한다.
//
// - /admin            → 이미 로그인됐으면 /admin/dashboard 로 즉시 이동
// - /admin/<나머지>   → 비로그인 상태면 /admin 로그인 페이지로 리다이렉트
// - 위 모든 응답에 Cache-Control: no-store 를 강제해, 관리자 페이지가 CDN/브라우저
//   캐시에 저장되어 다른 사용자에게 노출되는 사고(정적 prerender 포함) 를 차단.
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const noStore = (res: NextResponse) => {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.headers.set("Pragma", "no-cache");
    return res;
  };

  if (pathname === "/admin") {
    if (isLoggedIn) {
      return noStore(NextResponse.redirect(new URL("/admin/dashboard", req.url)));
    }
    return noStore(NextResponse.next());
  }

  if (pathname.startsWith("/admin/")) {
    if (!isLoggedIn) {
      return noStore(NextResponse.redirect(new URL("/admin", req.url)));
    }
    return noStore(NextResponse.next());
  }

  return NextResponse.next();
});

export const config = {
  // /admin 자체와 그 하위 전 경로 모두 매칭.
  matcher: ["/admin", "/admin/:path*"],
};
