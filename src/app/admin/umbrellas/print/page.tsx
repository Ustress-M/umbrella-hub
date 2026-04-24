"use client";

import { useEffect, useState, useMemo } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { generateQRDataUrl, getRentUrl } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import type { Umbrella } from "@/generated/prisma/client";

type QrItem = { umbrella: Umbrella; dataUrl: string };

const PrintPage = () => {
  const [umbrellas, setUmbrellas] = useState<Umbrella[]>([]);
  const [items, setItems] = useState<QrItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cols, setCols] = useState(4);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/umbrellas", {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();
        if (!json.success) {
          toast({ title: json.error ?? "목록을 불러오지 못했습니다", variant: "destructive" });
          return;
        }
        setUmbrellas(json.data);
        setSelectedIds(new Set(json.data.map((u: Umbrella) => u.id)));
      } catch {
        toast({ title: "네트워크 오류로 목록을 불러오지 못했습니다", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [toast]);

  useEffect(() => {
    if (umbrellas.length === 0) return;
    (async () => {
      const origin = window.location.origin;
      const generated = await Promise.all(
        umbrellas.map(async (u) => ({
          umbrella: u,
          dataUrl: await generateQRDataUrl(getRentUrl(origin, u.id)),
        }))
      );
      setItems(generated);
    })();
  }, [umbrellas]);

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.has(i.umbrella.id)),
    [items, selectedIds]
  );

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(umbrellas.map((u) => u.id)));
  const selectNone = () => setSelectedIds(new Set());

  if (isLoading) {
    return <div className="p-6 text-gray-400">불러오는 중...</div>;
  }

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          .no-print { display: none !important; }
          .print-grid { gap: 6mm !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/umbrellas"
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={16} />
              우산 관리
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">QR 일괄 인쇄</h1>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={selectedItems.length === 0}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            <Printer size={16} />
            인쇄 / PDF 저장 ({selectedItems.length})
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={selectNone}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50"
              >
                전체 해제
              </button>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-xs text-gray-600">열 수</label>
              <select
                value={cols}
                onChange={(e) => setCols(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={2}>2 (큰 사이즈)</option>
                <option value={3}>3</option>
                <option value={4}>4 (권장)</option>
                <option value={5}>5 (작은 사이즈)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-48 overflow-y-auto pr-1">
            {umbrellas.map((u) => {
              const checked = selectedIds.has(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    checked
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {u.number}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800 space-y-1.5">
          <p className="font-medium">둥근 손잡이 부착 팁</p>
          <ul className="list-disc list-inside text-xs space-y-0.5 text-amber-700">
            <li>QR 한 변이 <strong>20mm 이상</strong> 되도록 인쇄 (열 수 4 이하 권장)</li>
            <li>둘레의 1/4 이내 좁은 영역에만 부착 — 너무 감싸면 인식 실패</li>
            <li>손잡이 끝 <strong>평평한 캡</strong>이 있다면 그 위 부착이 가장 안정적</li>
            <li>방수 라미네이팅 라벨 사용 · 가장자리 흰 여백 2–3mm 유지</li>
          </ul>
        </div>
      </div>

      <div
        className="print-grid grid bg-white rounded-2xl shadow-sm p-4"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: "1rem",
        }}
      >
        {selectedItems.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-10 text-sm">
            선택된 QR이 없습니다
          </div>
        ) : (
          selectedItems.map(({ umbrella, dataUrl }) => (
            <div
              key={umbrella.id}
              className="flex flex-col items-center gap-1 p-2 border border-gray-200 rounded-lg break-inside-avoid"
            >
              <img src={dataUrl} alt={`QR ${umbrella.number}`} className="w-full h-auto" />
              <p className="text-sm font-bold text-gray-800 mt-1">{umbrella.number}번</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PrintPage;
