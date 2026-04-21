"use client";

import { useState } from "react";
import { ExternalLink, Save } from "lucide-react";
import { cn, formatDate, statusLabel } from "@/lib/utils";
import type { RentalWithUmbrella } from "@/types";

interface Props {
  rentals: RentalWithUmbrella[];
  isLoading: boolean;
  onStatusChange: (id: string, status: string, note?: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  RENTED: "bg-blue-100 text-blue-700",
  RETURNED: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  OVERDUE: "bg-orange-100 text-orange-700",
};

const RentalRow = ({
  rental,
  onStatusChange,
}: {
  rental: RentalWithUmbrella;
  onStatusChange: (id: string, status: string, note?: string) => void;
}) => {
  const [selectedStatus, setSelectedStatus] = useState(rental.status);
  const [note, setNote] = useState(rental.note ?? "");
  const isDirty = selectedStatus !== rental.status || note !== (rental.note ?? "");

  const handleSave = () => {
    onStatusChange(rental.id, selectedStatus, note || undefined);
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-semibold">{rental.umbrella.number}번</td>
      <td className="px-4 py-3 text-gray-600">{rental.studentId}</td>
      <td className="px-4 py-3">{rental.studentName}</td>
      <td className="px-4 py-3 text-gray-600">{rental.phone}</td>
      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(rental.createdAt)}</td>
      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(rental.returnedAt)}</td>
      <td className="px-4 py-3">
        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", STATUS_COLORS[rental.status])}>
          {statusLabel[rental.status]}
        </span>
      </td>
      <td className="px-4 py-3">
        {rental.returnPhotoUrl ? (
          <a
            href={rental.returnPhotoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-xs"
          >
            <ExternalLink size={12} />보기
          </a>
        ) : "-"}
      </td>
      <td className="px-4 py-3 min-w-[140px]">
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 mb-1"
        >
          <option value="RENTED">대여중</option>
          <option value="RETURNED">반납완료</option>
          <option value="LOST">분실</option>
          <option value="OVERDUE">장기미반납</option>
        </select>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="메모 (선택)"
          maxLength={200}
          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={handleSave}
          disabled={!isDirty}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors",
            isDirty
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          <Save size={11} />
          저장
        </button>
      </td>
    </tr>
  );
};

const RentalTable = ({ rentals, isLoading, onStatusChange }: Props) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
        불러오는 중...
      </div>
    );
  }

  if (rentals.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
        대여 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["우산", "학번", "이름", "전화번호", "대여일시", "반납일시", "현재상태", "사진", "변경 / 메모", "저장"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rentals.map((r) => (
              <RentalRow key={r.id} rental={r} onStatusChange={onStatusChange} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export { RentalTable };
