import { NextRequest, NextResponse } from "next/server";
import { statusQuerySchema } from "@/lib/validations";
import { getActiveRentalByStudent } from "@/lib/queries";
import type { ApiResponse, RentalWithUmbrella } from "@/types";

export const GET = async (
  req: NextRequest
): Promise<NextResponse<ApiResponse<RentalWithUmbrella | null>>> => {
  const { searchParams } = req.nextUrl;

  const parsed = statusQuerySchema.safeParse({
    studentId: searchParams.get("studentId"),
    studentName: searchParams.get("studentName"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { studentId, studentName } = parsed.data;
  // RENTED + OVERDUE 모두 진행 중인 대여로 조회
  const rental = await getActiveRentalByStudent(studentId, studentName);

  return NextResponse.json({ success: true, data: rental });
};
