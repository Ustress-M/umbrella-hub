import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { withNeonRetry } from "@/lib/db-retry";
import { bulkAddUmbrellaSchema } from "@/lib/validations";
import type { ApiResponse } from "@/types";

type BulkResult = {
  createdCount: number;
  skippedCount: number;
  createdNumbers: string[];
  skippedNumbers: string[];
};

export const POST = async (
  req: NextRequest
): Promise<NextResponse<ApiResponse<BulkResult>>> => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bulkAddUmbrellaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const unique = Array.from(new Set(parsed.data.numbers.map((n) => n.trim())));

  const existing = await withNeonRetry("admin/umbrellas/bulk findMany", () =>
    db.umbrella.findMany({
      where: { number: { in: unique } },
      select: { number: true },
    })
  );
  const existingSet = new Set(existing.map((e) => e.number));
  const toCreate = unique.filter((n) => !existingSet.has(n));

  if (toCreate.length > 0) {
    await withNeonRetry("admin/umbrellas/bulk createMany", () =>
      db.umbrella.createMany({
        data: toCreate.map((number) => ({ number })),
        skipDuplicates: true,
      })
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        createdCount: toCreate.length,
        skippedCount: unique.length - toCreate.length,
        createdNumbers: toCreate,
        skippedNumbers: Array.from(existingSet),
      },
    },
    { status: 201 }
  );
};
