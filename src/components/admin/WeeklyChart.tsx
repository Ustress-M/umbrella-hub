"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { WeeklyDataPoint } from "@/types";

interface Props {
  data: WeeklyDataPoint[];
}

const WeeklyChart = ({ data }: Props) => (
  <div className="bg-white rounded-2xl shadow-sm p-5">
    <h3 className="font-semibold text-gray-800 mb-4">최근 7일 추이</h3>
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="rented" name="대여" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="returned" name="반납" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export { WeeklyChart };
