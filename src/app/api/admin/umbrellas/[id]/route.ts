import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateUmbrellaSchema } from "@/lib/validations";
import type { ApiResponse } from "@/types";
import type { Umbrella } from "@prisma/client";

export const PATCH = async (
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<Umbrella>>> => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateUmbrellaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const umbrella = await db.umbrella.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ success: true, data: umbrella });
};

export const DELETE = async (
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<{ message: string }>>> => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "인증이 필요합니다" }, { status: 401 });
  }

  const activeRental = await db.rental.findFirst({
    where: { umbrellaId: params.id, status: "RENTED" },
  });

  if (activeRental) {
    return NextResponse.json(
      { success: false, error: "대여 중인 우산은 삭제할 수 없습니다" },
      { status: 409 }
    );
  }

  await db.umbrella.delete({ where: { id: params.id } });

  return NextResponse.json({
    success: true,
    data: { message: "우산이 삭제되었습니다" },
  });
};
