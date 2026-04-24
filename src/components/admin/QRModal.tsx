"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { generateQRDataUrl, getRentUrl } from "@/lib/utils";
import type { Umbrella } from "@/generated/prisma/client";

interface Props {
  umbrella: Umbrella;
  onClose: () => void;
}

// 단일 QR 이 대여·반납 양쪽에 쓰인다. /rent/[id] 라우트가 우산 상태에 따라
// 자동으로 올바른 폼(RentalForm | ReturnForm)을 렌더하므로, 스티커는 우산당
// 한 장만 부착하면 됨.
const QRModal = ({ umbrella, onClose }: Props) => {
  const [qrDataUrl, setQrDataUrl] = useState("");
  // number 기반 단축 URL 사용 — 동일 QR 크기에서 모듈이 커져 인식률 개선.
  // /r/[key] 라우트가 number → id 순으로 해석하므로 기존 QR 도 호환됨.
  const qrUrl = getRentUrl(window.location.origin, umbrella.number);

  useEffect(() => {
    generateQRDataUrl(qrUrl).then(setQrDataUrl);
  }, [qrUrl]);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `umbrella-${umbrella.number}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center sm:p-4">
      <div
        className="max-h-[90dvh] w-full max-w-xs overflow-y-auto rounded-2xl bg-white p-5 space-y-4 shadow-xl"
        style={{ marginBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-800">우산 {umbrella.number}번 QR</h3>
            <p className="text-xs text-gray-500 mt-0.5">대여·반납 겸용</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200"
            aria-label="닫기"
          >
            <X size={22} />
          </button>
        </div>

        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code" className="w-full rounded-xl" />
        ) : (
          <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">
            생성 중...
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          <p className="text-xs text-gray-600">
            이 QR 한 장으로 대여와 반납이 모두 됩니다.<br />
            학생이 스캔하면 현재 상태에 따라 자동 전환됩니다.
          </p>
          <p className="text-[10px] text-gray-400 break-all pt-1 border-t border-gray-200 mt-2">
            {qrUrl}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={!qrDataUrl}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 active:bg-blue-800"
        >
          <Download size={16} />
          PNG 다운로드
        </button>
      </div>
    </div>
  );
};

export { QRModal };
