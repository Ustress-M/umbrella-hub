"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addUmbrellaSchema, type AddUmbrellaValues } from "@/lib/validations";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = "single" | "range" | "list";

const MAX_BULK = 100;

const pad = (n: number, width: number): string =>
  width > 0 ? String(n).padStart(width, "0") : String(n);

const AddUmbrellaModal = ({ open, onClose, onSuccess }: Props) => {
  const [mode, setMode] = useState<Mode>("single");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // 단일 추가
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddUmbrellaValues>({
    resolver: zodResolver(addUmbrellaSchema),
  });

  // 범위 추가
  const [rangeStart, setRangeStart] = useState("1");
  const [rangeEnd, setRangeEnd] = useState("100");
  const [padWidth, setPadWidth] = useState("3");

  // 목록 추가
  const [listText, setListText] = useState("");

  const resetAll = () => {
    reset();
    setRangeStart("1");
    setRangeEnd("100");
    setPadWidth("3");
    setListText("");
  };

  const onSubmitSingle = async (data: AddUmbrellaValues) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/umbrellas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: `우산 ${data.number}번이 추가되었습니다` });
        resetAll();
        onSuccess();
      } else {
        toast({ title: json.error, variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const submitBulk = async (numbers: string[]) => {
    if (numbers.length === 0) {
      toast({ title: "추가할 번호가 없습니다", variant: "destructive" });
      return;
    }
    if (numbers.length > MAX_BULK) {
      toast({ title: `한 번에 최대 ${MAX_BULK}개까지 추가할 수 있습니다`, variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/umbrellas/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers }),
      });
      const json = await res.json();
      if (json.success) {
        const { createdCount, skippedCount } = json.data;
        toast({
          title: `${createdCount}개 추가${skippedCount > 0 ? ` · ${skippedCount}개 중복 스킵` : ""}`,
        });
        resetAll();
        onSuccess();
      } else {
        toast({ title: json.error, variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRange = () => {
    const start = Number(rangeStart);
    const end = Number(rangeEnd);
    const width = Number(padWidth);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < 0) {
      toast({ title: "시작/끝 번호는 0 이상의 정수여야 합니다", variant: "destructive" });
      return;
    }
    if (start > end) {
      toast({ title: "시작 번호는 끝 번호보다 작거나 같아야 합니다", variant: "destructive" });
      return;
    }
    const count = end - start + 1;
    if (count > MAX_BULK) {
      toast({ title: `범위가 너무 큽니다 (최대 ${MAX_BULK}개)`, variant: "destructive" });
      return;
    }
    const numbers: string[] = [];
    for (let i = start; i <= end; i++) numbers.push(pad(i, width));
    submitBulk(numbers);
  };

  const handleList = () => {
    const numbers = listText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    submitBulk(numbers);
  };

  if (!open) return null;

  const rangePreviewCount = (() => {
    const s = Number(rangeStart);
    const e = Number(rangeEnd);
    if (!Number.isInteger(s) || !Number.isInteger(e) || s > e) return 0;
    return Math.max(0, e - s + 1);
  })();

  const listPreviewCount = listText
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800">우산 추가</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg text-xs font-medium">
          {([
            ["single", "단일"],
            ["range", "범위"],
            ["list", "목록"],
          ] as const).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-md transition-colors ${
                mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "single" && (
          <form onSubmit={handleSubmit(onSubmitSingle)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">우산 번호</label>
              <input
                {...register("number")}
                placeholder="예: 001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.number && (
                <p className="text-red-500 text-xs">{errors.number.message}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? "추가 중..." : "추가"}
              </button>
            </div>
          </form>
        )}

        {mode === "range" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">시작 번호</label>
                <input
                  type="number"
                  min={0}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">끝 번호</label>
                <input
                  type="number"
                  min={0}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">자릿수 (0 패딩)</label>
              <input
                type="number"
                min={0}
                max={10}
                value={padWidth}
                onChange={(e) => setPadWidth(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500">
                예: 3자리 → {pad(1, Number(padWidth) || 0)}, {pad(2, Number(padWidth) || 0)}, ... 0이면 패딩 안 함
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
              생성 예정: <strong>{rangePreviewCount}개</strong>
              {rangePreviewCount > MAX_BULK && (
                <span className="text-red-600 ml-2">· 최대 {MAX_BULK}개 초과</span>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleRange}
                disabled={isLoading || rangePreviewCount === 0 || rangePreviewCount > MAX_BULK}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? "추가 중..." : `${rangePreviewCount}개 추가`}
              </button>
            </div>
          </div>
        )}

        {mode === "list" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                번호 목록 (쉼표 또는 줄바꿈 구분)
              </label>
              <textarea
                rows={6}
                value={listText}
                onChange={(e) => setListText(e.target.value)}
                placeholder={"001, 002, 003\n또는\n001\n002\n003"}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
              인식된 번호: <strong>{listPreviewCount}개</strong>
              {listPreviewCount > MAX_BULK && (
                <span className="text-red-600 ml-2">· 최대 {MAX_BULK}개 초과</span>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleList}
                disabled={isLoading || listPreviewCount === 0 || listPreviewCount > MAX_BULK}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? "추가 중..." : `${listPreviewCount}개 추가`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { AddUmbrellaModal };
