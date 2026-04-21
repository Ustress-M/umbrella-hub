import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rentalSchema } from "@/lib/validations";
import { ACTIVE_RENTAL_STATUSES } from "@/lib/queries";
import type { ApiResponse } from "@/types";
import type { Rental } from "@prisma/client";

export const POST = async (
  req: NextRequest
): Promise<NextResponse<ApiResponse<Rental>>> => {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { success: false, error: "요청 형식이 올바르지 않습니다" },
      { status: 400 }
    );
  }

  const parsed = rentalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { studentId, studentName, phone } = parsed.data;
  const umbrellaId = body.umbrellaId as string;

  if (!umbrellaId) {
    return NextResponse.json(
      { success: false, error: "우산 정보가 없습니다" },
      { status: 400 }
    );
  }

  const [umbrella, activeRental] = await Promise.all([
    db.umbrella.findUnique({ where: { id: umbrellaId } }),
    // RENTED + OVERDUE 모두 진행 중인 대여로 판단하여 중복 신청 차단
    db.rental.findFirst({
      where: {
        studentId,
        status: { in: [...ACTIVE_RENTAL_STATUSES] },
      },
    }),
  ]);

  if (!umbrella) {
    return NextResponse.json(
      { success: false, error: "우산을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  if (umbrella.status !== "AVAILABLE") {
    return NextResponse.json(
      { success: false, error: "현재 대여할 수 없는 우산입니다" },
      { status: 409 }
    );
  }

  if (activeRental) {
    return NextResponse.json(
      { success: false, error: "이미 대여 중인 우산이 있습니다" },
      { status: 409 }
    );
  }

  const rental = await db.$transaction(async (tx) => {
    const [newRental] = await Promise.all([
      tx.rental.create({
        data: { umbrellaId, studentId, studentName, phone },
      }),
      tx.umbrella.update({
        where: { id: umbrellaId },
        data: { status: "RENTED" },
      }),
    ]);
    return newRental;
  });

  return NextResponse.json({ success: true, data: rental }, { status: 201 });
};
