import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateRentalSchema } from "@/lib/validations";
import type { ApiResponse, RentalWithUmbrella } from "@/types";
import type { UmbrellaStatus } from "@/generated/prisma/client";

/**
 * 대여 상태에 따른 우산 상태 매핑.
 * - 학생이 우산을 소지 중인 상태 (RENTED, OVERDUE) → 우산은 RENTED
 * - 대여가 종료된 상태 (RETURNED) → 우산은 AVAILABLE
 * - 분실 (LOST) → 우산은 MAINTENANCE (관리자 확인 필요)
 */
const toUmbrellaStatus = (rentalStatus: string): UmbrellaStatus => {
  switch (rentalStatus) {
    case "RENTED":
    case "OVERDUE":
      return "RENTED";
    case "RETURNED":
      return "AVAILABLE";
    case "LOST":
    default:
      return "MAINTENANCE";
  }
};

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<RentalWithUmbrella>>> => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateRentalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { status, note } = parsed.data;

  const { id } = await params;

  const rental = await db.rental.findUnique({
    where: { id },
    include: { umbrella: true },
  });

  if (!rental) {
    return NextResponse.json(
      { success: false, error: "대여 기록을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const umbrellaStatus = toUmbrellaStatus(status);

  const updated = await db.$transaction(async (tx) => {
    const [updatedRental] = await Promise.all([
      tx.rental.update({
        where: { id },
        data: { status, note },
        include: { umbrella: true },
      }),
      tx.umbrella.update({
        where: { id: rental.umbrellaId },
        data: { status: umbrellaStatus },
      }),
    ]);
    return updatedRental;
  });

  return NextResponse.json({ success: true, data: updated });
};
