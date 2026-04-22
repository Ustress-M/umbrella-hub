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
  const qrUrl = getRentUrl(window.location.origin, umbrella.id);

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-xs w-full space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800">우산 {umbrella.number}번 QR</h3>
            <p className="text-xs text-gray-500 mt-0.5">대여·반납 겸용</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
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
          onClick={handleDownload}
          disabled={!qrDataUrl}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Download size={16} />
          PNG 다운로드
        </button>
      </div>
    </div>
  );
};

export { QRModal };
