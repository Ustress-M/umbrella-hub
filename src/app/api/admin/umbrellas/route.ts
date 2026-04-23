import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { withNeonRetry } from "@/lib/db-retry";
import { addUmbrellaSchema } from "@/lib/validations";
import { generateQRDataUrl, getRentUrl, getBaseUrl } from "@/lib/utils";
import type { ApiResponse } from "@/types";
import type { Umbrella } from "@/generated/prisma/client";

export const GET = async (): Promise<NextResponse<ApiResponse<Umbrella[]>>> => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "인증이 필요합니다" }, { status: 401 });
  }

  const umbrellas = await withNeonRetry("admin/umbrellas GET", () =>
    db.umbrella.findMany({
      orderBy: { number: "asc" },
    })
  );

  return NextResponse.json({ success: true, data: umbrellas });
};

export const POST = async (
  req: NextRequest
): Promise<NextResponse<ApiResponse<Umbrella & { qrDataUrl: string }>>> => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = addUmbrellaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const exists = await db.umbrella.findUnique({
    where: { number: parsed.data.number },
  });

  if (exists) {
    return NextResponse.json(
      { success: false, error: "이미 존재하는 우산 번호입니다" },
      { status: 409 }
    );
  }

  const umbrella = await db.umbrella.create({
    data: { number: parsed.data.number },
  });

  const rentUrl = getRentUrl(getBaseUrl(), umbrella.id);
  const qrDataUrl = await generateQRDataUrl(rentUrl);

  return NextResponse.json(
    { success: true, data: { ...umbrella, qrDataUrl } },
    { status: 201 }
  );
};
