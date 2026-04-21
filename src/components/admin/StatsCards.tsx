import { Umbrella, TrendingUp, CheckCircle, Clock } from "lucide-react";
import type { StatsData } from "@/types";

interface Props {
  stats: StatsData;
}

const StatCard = ({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) => (
  <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  </div>
);

const StatsCards = ({ stats }: Props) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard label="전체 우산" value={stats.totalUmbrellas} icon={Umbrella} color="bg-blue-500" />
    <StatCard
      label="대여 중"
      value={stats.rentedCount}
      sub={`잔여 ${stats.availableCount}개`}
      icon={TrendingUp}
      color="bg-orange-500"
    />
    <StatCard label="오늘 대여" value={stats.todayRented} icon={Clock} color="bg-purple-500" />
    <StatCard label="오늘 반납" value={stats.todayReturned} icon={CheckCircle} color="bg-green-500" />
  </div>
);

export { StatsCards };
