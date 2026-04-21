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

export const generateQRDataUrl = async (url: string): Promise<string> => {
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
};

export const getRentUrl = (baseUrl: string, umbrellaId: string): string =>
  `${baseUrl}/rent/${umbrellaId}`;

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
