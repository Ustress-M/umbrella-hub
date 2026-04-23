/**
 * 서버 컴포넌트와 API Route 양쪽에서 공유하는 DB 쿼리 함수 모음.
 * 인증 검사는 호출 측에서 처리하고 여기서는 순수 데이터 접근만 담당합니다.
 */

import { db } from "@/lib/db";
import { withNeonRetry } from "@/lib/db-retry";
import { formatDateOnly } from "@/lib/utils";
import type { StatsData, WeeklyDataPoint, RentalWithUmbrella } from "@/types";

/** 진행 중인 대여 상태 (학생이 우산을 아직 반납하지 않은 상태) */
export const ACTIVE_RENTAL_STATUSES = ["RENTED", "OVERDUE"] as const;

const getDateRange = (daysAgo: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
};

const buildWeeklyData = (
  rentals: { createdAt: Date }[],
  returns: { returnedAt: Date | null }[]
): WeeklyDataPoint[] => {
  const map = new Map<string, WeeklyDataPoint>();

  for (let i = 6; i >= 0; i--) {
    const d = getDateRange(i);
    const key = formatDateOnly(d);
    map.set(key, { date: key, rented: 0, returned: 0 });
  }

  for (const r of rentals) {
    const key = formatDateOnly(r.createdAt);
    const entry = map.get(key);
    if (entry) entry.rented++;
  }

  for (const r of returns) {
    if (!r.returnedAt) continue;
    const key = formatDateOnly(r.returnedAt);
    const entry = map.get(key);
    if (entry) entry.returned++;
  }

  return Array.from(map.values());
};

export const getStats = async (): Promise<StatsData> =>
  withNeonRetry("getStats", async () => {
    const todayStart = getDateRange(0);
    const weekStart = getDateRange(6);
    const threeDaysAgo = getDateRange(3);

    // 한 번에 8개 동시 쿼리는 풀·Neon 웨이크업 시 실패율을 올릴 수 있어 2회로 나눈다.
    const [
      totalUmbrellas,
      rentedCount,
      availableCount,
      todayRented,
      todayReturned,
    ] = await Promise.all([
      db.umbrella.count(),
      db.umbrella.count({ where: { status: "RENTED" } }),
      db.umbrella.count({ where: { status: "AVAILABLE" } }),
      db.rental.count({ where: { createdAt: { gte: todayStart } } }),
      db.rental.count({
        where: { status: "RETURNED", returnedAt: { gte: todayStart } },
      }),
    ]);

    const [weeklyRentals, weeklyReturns, overdueRentals] = await Promise.all([
      db.rental.findMany({
        where: { createdAt: { gte: weekStart } },
        select: { createdAt: true },
      }),
      db.rental.findMany({
        where: { status: "RETURNED", returnedAt: { gte: weekStart } },
        select: { returnedAt: true },
      }),
      db.rental.findMany({
        where: {
          status: { in: [...ACTIVE_RENTAL_STATUSES] },
          createdAt: { lte: threeDaysAgo },
        },
        include: { umbrella: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return {
      totalUmbrellas,
      rentedCount,
      availableCount,
      todayRented,
      todayReturned,
      weeklyData: buildWeeklyData(weeklyRentals, weeklyReturns),
      overdueRentals,
    };
  });

export const getActiveRentalByStudent = async (
  studentId: string,
  studentName: string
): Promise<RentalWithUmbrella | null> => {
  return db.rental.findFirst({
    where: {
      studentId,
      studentName,
      status: { in: [...ACTIVE_RENTAL_STATUSES] },
    },
    include: { umbrella: true },
    orderBy: { createdAt: "desc" },
  });
};
