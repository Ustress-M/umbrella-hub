import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

const umbrellaNumbers = ["001", "002", "003", "004", "005"];

const seed = async () => {
  console.log("🌱 시드 데이터 생성 시작...");

  for (const number of umbrellaNumbers) {
    await db.umbrella.upsert({
      where: { number },
      update: {},
      create: { number },
    });
    console.log(`  ☂️  우산 ${number}번 생성 완료`);
  }

  console.log(`\n✅ 시드 완료: 우산 ${umbrellaNumbers.length}개 등록`);
};

seed()
  .catch((e) => {
    console.error("❌ 시드 실패:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
