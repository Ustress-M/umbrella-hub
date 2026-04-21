"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { generateQRDataUrl, getRentUrl } from "@/lib/utils";
import type { Umbrella } from "@prisma/client";

interface Props {
  umbrella: Umbrella;
  onClose: () => void;
}

const QRModal = ({ umbrella, onClose }: Props) => {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const rentUrl = getRentUrl(window.location.origin, umbrella.id);

  useEffect(() => {
    generateQRDataUrl(rentUrl).then(setQrDataUrl);
  }, [rentUrl]);

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
          <h3 className="font-bold text-gray-800">우산 {umbrella.number}번 QR</h3>
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

        <p className="text-xs text-gray-400 text-center break-all">{rentUrl}</p>

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
