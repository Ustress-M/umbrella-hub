/**
 * 서버 기동 직후 DB 에 ping 을 한 번 보내 Neon compute 웨이크업·풀 연결을 앞당긴다.
 * 첫 QR 스캔/관리자 대시보드 요청이 ETIMEDOUT 으로 실패하는 빈도를 줄인다.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { db } = await import("@/lib/db");
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (e) {
    console.warn("[instrumentation] DB warm-up skipped (first request will retry)", e);
  }
}
