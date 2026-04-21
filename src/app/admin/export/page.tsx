"use client";

import { useState } from "react";
import { Download } from "lucide-react";

const ExportPage = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const handleExport = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/admin/export?${params}`, "_blank");
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-800">CSV 내보내기</h1>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <p className="text-sm text-gray-500">
          기간을 선택하지 않으면 전체 기록을 내보냅니다.
        </p>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">시작일</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">종료일</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          <Download size={18} />
          CSV 다운로드
        </button>
      </div>

      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">포함 컬럼</p>
        <p className="text-blue-600">학번 · 이름 · 전화번호 · 우산번호 · 대여일시 · 반납일시 · 상태</p>
      </div>
    </div>
  );
};

export default ExportPage;
