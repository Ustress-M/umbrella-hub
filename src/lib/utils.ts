import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import QRCode from "qrcode";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatDate = (date: Date | string | null): string => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export const formatDateOnly = (date: Date | string | null): string => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
};

export const calcDeleteAt = (returnedAt: Date): Date => {
  const days = Number(process.env.DELETE_AFTER_DAYS ?? 7);
  const deleteAt = new Date(returnedAt);
  deleteAt.setDate(deleteAt.getDate() + days);
  return deleteAt;
};

// 둥근 손잡이 등 곡면 부착 시 인식률 확보:
// - errorCorrectionLevel 'H' 는 30% 손상 복구 가능 (기본 'M' 은 15%)
// - margin 4 는 스캐너가 파인더 패턴을 잡기 위한 quiet zone
// - width 기본 512 는 스크린용. 대형 인쇄/PNG 추출 시 1200+ 로 지정
export const generateQRDataUrl = async (url: string, width = 512): Promise<string> => {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "H",
    width,
    margin: 4,
    color: { dark: "#000000", light: "#ffffff" },
  });
};

// QR 에 인쇄되는 URL. 짧을수록 QR 모듈이 커져 곡면·저해상도 인식률이 상승.
// 신규 QR 은 /r/{number} 로 단축 (예: /r/001). /r/[key] 라우트가
// number → id 순서로 해석하고, 기존에 배포된 /rent/{cuid} QR 도 계속 동작.
// key 는 DB 에 저장된 사용자 입력이므로 안전을 위해 URL 인코딩.
export const getRentUrl = (baseUrl: string, numberOrId: string): string =>
  `${baseUrl}/r/${encodeURIComponent(numberOrId)}`;

export const getReturnUrl = (baseUrl: string, umbrellaId: string): string =>
  `${baseUrl}/return/${umbrellaId}`;

export const getBaseUrl = (): string =>
  process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const validateFileSize = (file: File): boolean => {
  const maxMB = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 5);
  return file.size <= maxMB * 1024 * 1024;
};

export const validateFileType = (file: File): boolean => {
  const allowed = ["image/jpeg", "image/png", "image/jpg"];
  return allowed.includes(file.type);
};

export const buildCsvRow = (values: string[]): string =>
  values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");

export const statusLabel: Record<string, string> = {
  RENTED: "대여중",
  RETURNED: "반납완료",
  LOST: "분실",
  OVERDUE: "장기미반납",
};

export const umbrellaStatusLabel: Record<string, string> = {
  AVAILABLE: "대여가능",
  RENTED: "대여중",
  MAINTENANCE: "점검중",
};
