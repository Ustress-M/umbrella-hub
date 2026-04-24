"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Printer, ArrowLeft, Download, Loader2, Check } from "lucide-react";
import Link from "next/link";
import { generateQRDataUrl, getRentUrl } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import type { Umbrella } from "@/generated/prisma/client";

type QrItem = { umbrella: Umbrella; dataUrl: string };
type Mode = "default" | "custom";

const CAPTION = "대여 및 반납 겸용 QR코드";

// 기본 용지
const DEFAULT_W_MM = 200;
const DEFAULT_H_MM = 300;

// 커스텀 입력 제한
const MIN_MM = 30;
const MAX_MM = 1000;

// 캔버스/PNG 해상도: 6 px/mm (≈150 DPI)
const PX_PER_MM = 6;

const clampMm = (v: number): number =>
  Number.isFinite(v) ? Math.max(MIN_MM, Math.min(MAX_MM, Math.round(v))) : MIN_MM;

const PrintPage = () => {
  const [umbrellas, setUmbrellas] = useState<Umbrella[]>([]);
  const [items, setItems] = useState<QrItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pngProgress, setPngProgress] = useState<{ current: number; total: number } | null>(null);
  const { toast } = useToast();

  // 용지 설정 — "적용" 누를 때만 paperW/paperH 에 반영해 QR 재생성 폭주 방지
  const [mode, setMode] = useState<Mode>("default");
  const [widthInput, setWidthInput] = useState(String(DEFAULT_W_MM));
  const [heightInput, setHeightInput] = useState(String(DEFAULT_H_MM));
  const [paperW, setPaperW] = useState(DEFAULT_W_MM);
  const [paperH, setPaperH] = useState(DEFAULT_H_MM);

  const qrMm = Math.min(paperW, paperH);
  const isPortrait = paperH >= paperW;
  const orientationLabel = isPortrait ? "세로" : "가로";

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

  // QR 을 짧은 변 = 변 길이 로 맞춰 재생성
  useEffect(() => {
    if (umbrellas.length === 0) return;
    (async () => {
      const origin = window.location.origin;
      const qrPx = qrMm * PX_PER_MM;
      const generated = await Promise.all(
        umbrellas.map(async (u) => ({
          umbrella: u,
          dataUrl: await generateQRDataUrl(getRentUrl(origin, u.id), qrPx),
        }))
      );
      setItems(generated);
    })();
  }, [umbrellas, qrMm]);

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

  const applyDefault = () => {
    setMode("default");
    setPaperW(DEFAULT_W_MM);
    setPaperH(DEFAULT_H_MM);
    setWidthInput(String(DEFAULT_W_MM));
    setHeightInput(String(DEFAULT_H_MM));
  };

  const applyCustom = () => {
    const w = clampMm(Number(widthInput));
    const h = clampMm(Number(heightInput));
    if (w === h) {
      toast({
        title: "가로/세로가 같으면 텍스트 공간이 없습니다",
        variant: "destructive",
      });
      return;
    }
    setMode("custom");
    setPaperW(w);
    setPaperH(h);
    setWidthInput(String(w));
    setHeightInput(String(h));
  };

  const renderLabelToBlob = useCallback(
    async (item: QrItem): Promise<Blob> => {
      const W = paperW * PX_PER_MM;
      const H = paperH * PX_PER_MM;
      const qrPx = Math.min(W, H);

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("캔버스 컨텍스트를 얻을 수 없습니다");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);

      const img = new Image();
      img.src = item.dataUrl;
      await img.decode();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, qrPx, qrPx);

      // 텍스트 영역: 세로 방향이면 QR 아래, 가로 방향이면 QR 오른쪽
      const textX = isPortrait ? 0 : qrPx;
      const textY = isPortrait ? qrPx : 0;
      const textW = isPortrait ? W : W - qrPx;
      const textH = isPortrait ? H - qrPx : H;

      if (textW <= 0 || textH <= 0) {
        return new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG 인코딩 실패"))), "image/png");
        });
      }

      ctx.fillStyle = "#111111";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const fontStack =
        '"Pretendard", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif';
      const cx = textX + textW / 2;

      // 폰트 크기 = 짧은 변(qrMm) 비례 — 기본 200mm 에서 25mm/13mm
      const numberFontPx = (qrMm / 8) * PX_PER_MM;
      const captionFontPx = (qrMm / 15) * PX_PER_MM;
      const numberY = textY + textH * 0.32;
      const captionY = textY + textH * 0.72;

      ctx.font = `800 ${numberFontPx}px ${fontStack}`;
      ctx.fillText(`${item.umbrella.number}번`, cx, numberY);

      ctx.font = `500 ${captionFontPx}px ${fontStack}`;
      const hPad = textW > 40 * PX_PER_MM ? 20 * PX_PER_MM : 4 * PX_PER_MM;
      const captionMaxWidth = textW - hPad;
      const words = CAPTION.split(" ");
      const lines: string[] = [];
      let current = "";
      for (const w of words) {
        const next = current ? `${current} ${w}` : w;
        if (ctx.measureText(next).width > captionMaxWidth && current) {
          lines.push(current);
          current = w;
        } else {
          current = next;
        }
      }
      if (current) lines.push(current);
      const lineGap = captionFontPx * 1.2;
      const totalH = lineGap * lines.length;
      const startY = captionY - totalH / 2 + lineGap / 2;
      lines.forEach((line, i) => ctx.fillText(line, cx, startY + i * lineGap));

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("PNG 인코딩 실패"));
        }, "image/png");
      });
    },
    [paperW, paperH, qrMm, isPortrait]
  );

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = async () => {
    if (selectedItems.length === 0) return;
    if (
      selectedItems.length > 10 &&
      !confirm(
        `${selectedItems.length}개의 PNG를 다운로드합니다.\n브라우저에서 "여러 파일 다운로드 허용"을 눌러주세요.`
      )
    ) {
      return;
    }
    setPngProgress({ current: 0, total: selectedItems.length });
    try {
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        const blob = await renderLabelToBlob(item);
        triggerDownload(blob, `umbrella-${item.umbrella.number}.png`);
        setPngProgress({ current: i + 1, total: selectedItems.length });
        await new Promise((r) => setTimeout(r, 80));
      }
      toast({ title: `${selectedItems.length}개 PNG 다운로드 완료` });
    } catch (e) {
      toast({
        title: `PNG 생성 오류: ${e instanceof Error ? e.message : "알 수 없음"}`,
        variant: "destructive",
      });
    } finally {
      setPngProgress(null);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-gray-400">불러오는 중...</div>;
  }

  const previewMaxPx = isPortrait ? 280 : 420;
  const metaFontScale = qrMm; // 화면 폰트 clamp 는 cqw 기반이라 자동

  return (
    <div className="space-y-4">
      {/*
        @page 는 JS 변수 보간이 불가하므로 <style> 블록 전체를 템플릿 리터럴로
        매 렌더마다 재작성. paperW/paperH 가 바뀌면 인쇄 규격이 즉시 갱신됨.
      */}
      <style>{`
        .label-card {
          width: 100%;
          max-width: ${previewMaxPx}px;
          margin: 0 auto;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          aspect-ratio: ${paperW} / ${paperH};
          display: flex;
          flex-direction: ${isPortrait ? "column" : "row"};
          container-type: inline-size;
        }
        .label-qr-wrap {
          ${isPortrait ? "width: 100%;" : "height: 100%;"}
          aspect-ratio: 1 / 1;
          flex: 0 0 auto;
        }
        .label-qr-wrap img {
          display: block;
          width: 100%;
          height: 100%;
          image-rendering: pixelated;
        }
        .label-meta {
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 4%;
          gap: 4%;
          word-break: keep-all;
        }
        .label-number {
          font-size: clamp(18px, 9cqw, 72px);
          font-weight: 800;
          color: #111;
          line-height: 1;
        }
        .label-caption {
          font-size: clamp(10px, 4.5cqw, 36px);
          color: #333;
          line-height: 1.25;
        }

        @media print {
          @page { size: ${paperW}mm ${paperH}mm; margin: 0; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .label-stack { display: block !important; padding: 0 !important; gap: 0 !important; background: #fff !important; }

          .label-card {
            width: ${paperW}mm !important;
            max-width: ${paperW}mm !important;
            height: ${paperH}mm !important;
            aspect-ratio: auto !important;
            flex-direction: ${isPortrait ? "column" : "row"} !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-after: always;
            break-after: page;
            overflow: visible !important;
          }
          .label-card:last-child { page-break-after: auto; break-after: auto; }
          .label-qr-wrap {
            width: ${qrMm}mm !important;
            height: ${qrMm}mm !important;
            aspect-ratio: auto !important;
            flex: 0 0 ${qrMm}mm !important;
          }
          .label-meta {
            ${isPortrait ? `width: ${paperW}mm` : `width: ${Math.max(0, paperW - qrMm)}mm`} !important;
            ${isPortrait ? `height: ${Math.max(0, paperH - qrMm)}mm` : `height: ${paperH}mm`} !important;
            flex: 0 0 auto !important;
            padding: ${Math.max(4, qrMm * 0.04)}mm !important;
            gap: ${Math.max(4, qrMm * 0.04)}mm !important;
          }
          .label-number { font-size: ${(qrMm / 8).toFixed(2)}mm !important; }
          .label-caption { font-size: ${(qrMm / 15).toFixed(2)}mm !important; }
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={selectedItems.length === 0 || pngProgress !== null}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
            >
              {pngProgress ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {pngProgress.current}/{pngProgress.total}
                </>
              ) : (
                <>
                  <Download size={16} />
                  PNG 일괄 다운로드 ({selectedItems.length})
                </>
              )}
            </button>
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
        </div>

        {/* 용지 설정 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm font-medium text-gray-800">용지 설정</div>
            <div className="text-xs text-gray-500">
              현재 적용 <strong className="text-gray-800">{paperW} × {paperH}mm</strong> · {orientationLabel} 방향 · QR {qrMm}mm
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
            <button
              type="button"
              onClick={applyDefault}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                mode === "default"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {mode === "default" && <Check size={14} />}
              기본 200 × 300mm (세로)
            </button>

            <div
              className={`flex-1 flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                mode === "custom"
                  ? "border-blue-500 bg-blue-50/30"
                  : "border-gray-300 bg-white"
              }`}
            >
              <span className="text-xs text-gray-500">사용자 지정</span>
              <label className="flex items-center gap-1">
                <span className="text-xs text-gray-600">가로</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={MIN_MM}
                  max={MAX_MM}
                  value={widthInput}
                  onChange={(e) => setWidthInput(e.target.value)}
                  className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500">mm</span>
              </label>
              <span className="text-gray-400">×</span>
              <label className="flex items-center gap-1">
                <span className="text-xs text-gray-600">세로</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={MIN_MM}
                  max={MAX_MM}
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500">mm</span>
              </label>
              <button
                type="button"
                onClick={applyCustom}
                className="ml-auto bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-700"
              >
                적용
              </button>
            </div>
          </div>

          <p className="text-[11px] text-gray-500">
            QR 크기는 짧은 변과 동일하게 자동 설정되고, 긴 변의 남는 영역에 우산 번호와 안내 문구가 배치됩니다 ({MIN_MM}–{MAX_MM}mm).
          </p>
        </div>

        {/* 우산 선택 */}
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
            <p className="text-xs text-gray-500 ml-auto">선택 {selectedIds.size} / 전체 {umbrellas.length}</p>
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
          <p className="font-medium">인쇄 대화상자 권장 설정</p>
          <ul className="list-disc list-inside text-xs space-y-0.5 text-amber-700">
            <li>
              용지 크기: <strong>사용자 지정 {paperW} × {paperH}mm</strong> ({orientationLabel})
            </li>
            <li>여백 <strong>없음</strong>, 배율 <strong>100% (실제 크기)</strong></li>
          </ul>
        </div>
      </div>

      <div className="label-stack flex flex-col items-center gap-6" style={{ fontSize: metaFontScale }}>
        {selectedItems.length === 0 ? (
          <div className="no-print bg-white rounded-2xl shadow-sm text-center text-gray-400 py-10 text-sm w-full">
            선택된 QR이 없습니다
          </div>
        ) : (
          selectedItems.map(({ umbrella, dataUrl }) => (
            <div key={umbrella.id} className="label-card">
              <div className="label-qr-wrap">
                <img src={dataUrl} alt={`QR ${umbrella.number}`} />
              </div>
              <div className="label-meta">
                <div className="label-number">{umbrella.number}번</div>
                <div className="label-caption">{CAPTION}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PrintPage;
