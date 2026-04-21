"use client";

import { useState } from "react";
import { QrCode, Trash2, Settings } from "lucide-react";
import { cn, umbrellaStatusLabel, getRentUrl } from "@/lib/utils";
import { QRModal } from "@/components/admin/QRModal";
import type { Umbrella } from "@prisma/client";

interface Props {
  umbrellas: Umbrella[];
  isLoading: boolean;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  RENTED: "bg-blue-100 text-blue-700",
  MAINTENANCE: "bg-gray-100 text-gray-600",
};

const UmbrellaTable = ({ umbrellas, isLoading, onStatusChange, onDelete }: Props) => {
  const [qrUmbrella, setQrUmbrella] = useState<Umbrella | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
        불러오는 중...
      </div>
    );
  }

  if (umbrellas.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
        등록된 우산이 없습니다. 우산을 추가해주세요.
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["우산 번호", "상태", "QR코드", "상태 변경", "삭제"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {umbrellas.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-gray-800">{u.number}번</td>
                <td className="px-4 py-3">
                  <span className={cn("px-2 py-1 rounded-full text-xs font-medium", STATUS_COLORS[u.status])}>
                    {umbrellaStatusLabel[u.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setQrUmbrella(u)}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                  >
                    <QrCode size={14} />
                    QR 보기
                  </button>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.status}
                    onChange={(e) => onStatusChange(u.id, e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="AVAILABLE">대여가능</option>
                    <option value="RENTED">대여중</option>
                    <option value="MAINTENANCE">점검중</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onDelete(u.id)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {qrUmbrella && (
        <QRModal
          umbrella={qrUmbrella}
          onClose={() => setQrUmbrella(null)}
        />
      )}
    </>
  );
};

export { UmbrellaTable };
