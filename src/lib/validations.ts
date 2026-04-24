import { z } from "zod";

export const rentalSchema = z.object({
  studentId: z
    .string()
    .min(1, "학번을 입력해주세요")
    .max(20, "학번이 너무 깁니다"),
  studentName: z
    .string()
    .min(1, "이름을 입력해주세요")
    .max(20, "이름이 너무 깁니다"),
  phone: z
    .string()
    .regex(/^01[0-9]{8,9}$/, "전화번호 형식이 올바르지 않습니다 (예: 01012345678)"),
});

export const statusQuerySchema = z.object({
  studentId: z.string().min(1, "학번을 입력해주세요"),
  studentName: z.string().min(1, "이름을 입력해주세요"),
});

export const returnSchema = z.object({
  studentId: z.string().min(1, "학번을 입력해주세요"),
  studentName: z.string().min(1, "이름을 입력해주세요"),
});

export const addUmbrellaSchema = z.object({
  number: z
    .string()
    .min(1, "우산 번호를 입력해주세요")
    .max(10, "우산 번호가 너무 깁니다"),
});

export const bulkAddUmbrellaSchema = z.object({
  numbers: z
    .array(
      z
        .string()
        .trim()
        .min(1, "우산 번호가 비어있습니다")
        .max(10, "우산 번호가 너무 깁니다")
    )
    .min(1, "최소 1개 이상 입력해주세요")
    .max(100, "한 번에 최대 100개까지 추가할 수 있습니다"),
});

// Umbrella 모델에는 note 필드가 없으므로 제거
export const updateUmbrellaSchema = z.object({
  status: z.enum(["AVAILABLE", "RENTED", "MAINTENANCE"]),
});

export const updateRentalSchema = z.object({
  status: z.enum(["RENTED", "RETURNED", "LOST", "OVERDUE"]),
  note: z.string().max(200, "메모는 200자 이내로 입력해주세요").optional(),
});

// 관리자 대여 목록 필터 쿼리 파라미터 검증
export const rentalListQuerySchema = z.object({
  status: z.enum(["RENTED", "RETURNED", "LOST", "OVERDUE"]).optional(),
  umbrellaNumber: z.string().optional(),
});

export const exportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export type RentalFormValues = z.infer<typeof rentalSchema>;
export type StatusQueryValues = z.infer<typeof statusQuerySchema>;
export type ReturnFormValues = z.infer<typeof returnSchema>;
export type AddUmbrellaValues = z.infer<typeof addUmbrellaSchema>;
export type BulkAddUmbrellaValues = z.infer<typeof bulkAddUmbrellaSchema>;
export type RentalListQuery = z.infer<typeof rentalListQuerySchema>;
