import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStats } from "@/lib/queries";
import type { ApiResponse, StatsData } from "@/types";

export const GET = async (): Promise<NextResponse<ApiResponse<StatsData>>> => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "인증이 필요합니다" }, { status: 401 });
  }

  const data = await getStats();
  return NextResponse.json({ success: true, data });
};
