import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStats } from "@/lib/queries";
import { StatsCards } from "@/components/admin/StatsCards";
import { WeeklyChart } from "@/components/admin/WeeklyChart";
import { OverdueList } from "@/components/admin/OverdueList";

const DashboardPage = async () => {
  const session = await auth();
  if (!session) redirect("/admin");

  // API를 거치지 않고 DB 쿼리 함수를 직접 호출 (쿠키 전달 문제 없음)
  const stats = await getStats().catch((e) => {
    console.error("[dashboard] getStats failed", e);
    return null;
  });

  if (!stats) {
    return (
      <div className="text-center py-20 text-gray-500">
        통계를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">대시보드</h1>
      <StatsCards stats={stats} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeeklyChart data={stats.weeklyData} />
        <OverdueList rentals={stats.overdueRentals} />
      </div>
    </div>
  );
};

export default DashboardPage;
