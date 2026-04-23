import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// PrismaPg({ connectionString }) 는 내부 풀 설정을 제어하기 어렵다.
// Neon cold start·일시적 끊김에 대비해 connectionTimeout 과 풀 크기를 명시한다.
const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    // Neon compute 웨이크업 + TLS 핸드셰이크에 20초는 부족한 경우가 있음 (ETIMEDOUT).
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS ?? 60_000),
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: false,
  });

globalForPrisma.pgPool = pool;

const adapter = new PrismaPg(pool);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// 개발 HMR 과 무관하게 프로세스당 단일 PrismaClient·Pool 유지 (연결 누수 방지)
globalForPrisma.prisma = db;
