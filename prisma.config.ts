import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma CLI (migrate/db push/introspect) 는 PgBouncer 를 우회하는 direct URL 을 사용해야 함.
// Neon 은 DATABASE_URL(pooler) 과 DIRECT_URL(direct) 을 분리해서 제공.
// DIRECT_URL 이 없으면 (로컬 Postgres 등) DATABASE_URL 로 폴백.
type Env = {
  DATABASE_URL: string;
  DIRECT_URL?: string;
};

const directUrlKey = process.env.DIRECT_URL ? "DIRECT_URL" : "DATABASE_URL";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: env<Env>(directUrlKey as keyof Env),
  },
});
