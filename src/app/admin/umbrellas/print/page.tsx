"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Printer, ArrowLeft, Download, Loader2 } from "lucide-react";
import Link from "next/link";
import { generateQRDataUrl, getRentUrl } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import type { Umbrella } from "@/generated/prisma/client";

type QrItem = { umbrella: Umbrella; dataUrl: string };

const CAPTION = "QR코드로 대여 및 반납";

// 용지 200×300mm 기준 PNG 해상도: 6 px/mm (≈150 DPI)
// → 캔버스 1200×1800, QR 영역 1200×1200, 텍스트 영역 1200×600
const PX_PER_MM = 6;
const PNG_W = 200 * PX_PER_MM;
const PNG_H = 300 * PX_PER_MM;
const PNG_QR = 200 * PX_PER_MM;
const PNG_META_Y = 200 * PX_PER_MM;
const PNG_META_H = 100 * PX_PER_MM;

const PrintPage = () => {
  const [umbrellas, setUmbrellas] = useState<Umbrella[]>([]);
  const [items, setItems] = useState<QrItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pngProgress, setPngProgress] = useState<{ current: number; total: number } | null>(null);
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
      // 1200px 고해상도 QR 생성 — 200mm 폭 인쇄 시 뭉개지지 않음
      const generated = await Promise.all(
        umbrellas.map(async (u) => ({
          umbrella: u,
          dataUrl: await generateQRDataUrl(getRentUrl(origin, u.id), PNG_QR),
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

  const renderLabelToBlob = useCallback(async (item: QrItem): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    canvas.width = PNG_W;
    canvas.height = PNG_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("캔버스 컨텍스트를 얻을 수 없습니다");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PNG_W, PNG_H);

    const img = new Image();
    img.src = item.dataUrl;
    await img.decode();
    // QR 은 픽셀 아트라 스무딩 끄면 에지가 선명하게 유지됨
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, PNG_QR, PNG_QR);

    // 텍스트 영역: y = PNG_META_Y..PNG_H
    ctx.fillStyle = "#111111";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fontStack = '"Pretendard", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif';
    const cx = PNG_W / 2;

    // 우산 번호 — 크게, 텍스트 영역 상단 1/3 지점
    const numberY = PNG_META_Y + PNG_META_H * 0.32;
    ctx.font = `800 ${25 * PX_PER_MM}px ${fontStack}`;
    ctx.fillText(`${item.umbrella.number}번`, cx, numberY);

    // 캡션 — 작게, 필요 시 줄바꿈
    const captionY = PNG_META_Y + PNG_META_H * 0.72;
    const captionFontPx = 13 * PX_PER_MM;
    ctx.font = `500 ${captionFontPx}px ${fontStack}`;
    const captionMaxWidth = PNG_W - 20 * PX_PER_MM;
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
  }, []);

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
        // 브라우저 다운로드 큐 throttle 방지용 소량 지연
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

  return (
    <div className="space-y-4">
      <style>{`
        /* 화면 프리뷰: 200×300mm 비율을 유지하며 화면 폭에 맞게 축소 */
        .label-card {
          width: 100%;
          max-width: 280px;
          margin: 0 auto;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          aspect-ratio: 2 / 3;
          display: flex;
          flex-direction: column;
        }
        .label-qr-wrap {
          width: 100%;
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
          font-size: clamp(24px, 9cqw, 72px);
          font-weight: 800;
          color: #111;
          line-height: 1;
        }
        .label-caption {
          font-size: clamp(12px, 4.5cqw, 36px);
          color: #333;
          line-height: 1.25;
        }

        @media print {
          @page { size: 200mm 300mm; margin: 0; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .label-stack { display: block !important; padding: 0 !important; gap: 0 !important; background: #fff !important; }

          .label-card {
            width: 200mm !important;
            max-width: 200mm !important;
            height: 300mm !important;
            aspect-ratio: auto !important;
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
            width: 200mm !important;
            height: 200mm !important;
            aspect-ratio: auto !important;
          }
          .label-meta {
            width: 200mm !important;
            height: 100mm !important;
            flex: 0 0 auto !important;
            padding: 8mm !important;
            gap: 8mm !important;
          }
          .label-number { font-size: 25mm !important; }
          .label-caption { font-size: 13mm !important; }
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
            <p className="text-xs text-gray-500 ml-auto">
              라벨 규격 200 × 300mm · 1장당 우산 1개 (QR 200 × 200 + 텍스트 100mm)
            </p>
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
          <p className="font-medium">인쇄 설정</p>
          <ul className="list-disc list-inside text-xs space-y-0.5 text-amber-700">
            <li>브라우저 인쇄 대화상자에서 용지 크기를 <strong>사용자 지정 200 × 300mm</strong> 로 설정</li>
            <li>여백 <strong>없음</strong>, 배율 <strong>100% (실제 크기)</strong></li>
            <li>&quot;배경 그래픽&quot; 옵션은 끄지 않아도 무방 (흰 배경)</li>
          </ul>
        </div>
      </div>

      <div
        className="label-stack flex flex-col items-center gap-6"
        style={{ containerType: "inline-size" }}
      >
        {selectedItems.length === 0 ? (
          <div className="no-print bg-white rounded-2xl shadow-sm text-center text-gray-400 py-10 text-sm w-full">
            선택된 QR이 없습니다
          </div>
        ) : (
          selectedItems.map(({ umbrella, dataUrl }) => (
            <div
              key={umbrella.id}
              className="label-card"
              style={{ containerType: "inline-size" }}
            >
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
