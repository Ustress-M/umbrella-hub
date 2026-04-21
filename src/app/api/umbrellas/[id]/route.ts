import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import type { Umbrella } from "@/generated/prisma/client";

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Umbrella>>> => {
  const { id } = await params;

  const umbrella = await db.umbrella.findUnique({
    where: { id },
  });

  if (!umbrella) {
    return NextResponse.json(
      { success: false, error: "우산을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: umbrella });
};
