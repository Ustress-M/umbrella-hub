/**
 * Neon 등 서버리스 Postgres 는 유휴 후 첫 연결이 실패하거나(P1001) 타임아웃이 날 수 있다.
 * Hetzner VPS → Neon 경로에서 IPv6 AAAA 가 먼저 시도되면 ETIMEDOUT 이 잦을 수 있어
 * NODE_OPTIONS=--dns-result-order=ipv4first 와 함께 쓰는 것을 권장한다.
 *
 * PrismaClientKnownRequestError 의 code 는 메시지에 안 들어가는 경우가 있어
 * 객체의 .code 필드를 반드시 검사한다.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const RETRY_BACKOFF_MS = [3000, 6000, 12000, 20000, 25000] as const;

const isRetryableDbError = (e: unknown): boolean => {
  if (typeof e === "object" && e !== null && "code" in e) {
    const c = String((e as { code: unknown }).code);
    if (
      c === "ETIMEDOUT" ||
      c === "ECONNRESET" ||
      c === "ENOTFOUND" ||
      c === "EAI_AGAIN" ||
      c === "P1001" ||
      c === "P1017"
    ) {
      return true;
    }
  }
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
  maxAttempts = 6
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
      const delayMs = RETRY_BACKOFF_MS[attempt - 1] ?? 25_000;
      console.warn(
        `[withNeonRetry] ${label} attempt ${attempt}/${maxAttempts} failed, retry in ${delayMs}ms`
      );
      await sleep(delayMs);
    }
  }
  throw lastError;
}
