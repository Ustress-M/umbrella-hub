import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { withNeonRetry } from "@/lib/db-retry";
import { rentalListQuerySchema } from "@/lib/validations";
import type { ApiResponse, RentalWithUmbrella } from "@/types";

export const GET = async (
  req: NextRequest
): Promise<NextResponse<ApiResponse<RentalWithUmbrella[]>>> => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "인증이 필요합니다" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const parsed = rentalListQuerySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    umbrellaNumber: searchParams.get("umbrellaNumber") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { status, umbrellaNumber } = parsed.data;

  const rentals = await withNeonRetry("admin/rentals GET", () =>
    db.rental.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(umbrellaNumber
          ? { umbrella: { number: { contains: umbrellaNumber } } }
          : {}),
      },
      include: { umbrella: true },
      orderBy: { createdAt: "desc" },
    })
  );

  return NextResponse.json({ success: true, data: rentals });
};
