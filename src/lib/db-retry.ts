/**
 * Neon 등 서버리스 Postgres 는 유휴 후 첫 연결이 실패하거나(P1001) 타임아웃이 날 수 있다.
 * 관리자 화면에서 통계/목록이 간헐적으로 비거나 로딩이 멈추는 주된 원인이므로
 * 일시적 네트워크·웨이크업 오류에 한해 짧게 재시도한다.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isRetryableDbError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("P1001") ||
    msg.includes("P1017") ||
    msg.includes("Can't reach database server") ||
    msg.includes("timeout") ||
    msg.includes("Timeout") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("Connection terminated") ||
    msg.includes("the database system is starting up")
  );
};

export async function withNeonRetry<T>(
  label: string,
  operation: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (e) {
      lastError = e;
      if (attempt >= maxAttempts || !isRetryableDbError(e)) {
        throw e;
      }
      const delayMs = attempt * 1500;
      console.warn(
        `[withNeonRetry] ${label} attempt ${attempt}/${maxAttempts} failed, retry in ${delayMs}ms`
      );
      await sleep(delayMs);
    }
  }
  throw lastError;
}
