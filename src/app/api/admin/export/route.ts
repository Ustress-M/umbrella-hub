import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, buildCsvRow, statusLabel } from "@/lib/utils";

const CSV_HEADER = buildCsvRow([
  "학번",
  "이름",
  "전화번호",
  "우산번호",
  "대여일시",
  "반납일시",
  "상태",
]);

export const GET = async (
  req: NextRequest
): Promise<NextResponse> => {
  const session = await auth();
  if (!session) {
    return new NextResponse("인증이 필요합니다", { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const rentals = await db.rental.findMany({
    where: {
      ...(from ? { createdAt: { gte: new Date(from) } } : {}),
      ...(to ? { createdAt: { lte: new Date(to) } } : {}),
    },
    include: { umbrella: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = rentals.map((r) =>
    buildCsvRow([
      r.studentId,
      r.studentName,
      r.phone,
      r.umbrella.number,
      formatDate(r.createdAt),
      formatDate(r.returnedAt),
      statusLabel[r.status] ?? r.status,
    ])
  );

  const csv = [CSV_HEADER, ...rows].join("\n");
  const bom = "\uFEFF";

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rentals_${Date.now()}.csv"`,
    },
  });
};
