import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteFile, extractKeyFromUrl } from "@/lib/r2";
import { calcPhotoExpiryCutoff } from "@/lib/utils";

const verifySecret = (req: NextRequest): boolean => {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
};

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const legacyCutoff = calcPhotoExpiryCutoff();

  const expired = await db.rental.findMany({
    where: {
      returnPhotoUrl: { not: null },
      OR: [
        { deleteAt: { lte: now } },
        { deleteAt: null, returnedAt: { lte: legacyCutoff } },
      ],
    },
    select: { id: true, returnPhotoUrl: true },
  });

  const deleteResults = await Promise.allSettled(
    expired.map(async (rental) => {
      if (rental.returnPhotoUrl) {
        const key = extractKeyFromUrl(rental.returnPhotoUrl);
        await deleteFile(key);
      }
      await db.rental.update({
        where: { id: rental.id },
        data: { returnPhotoUrl: null, deleteAt: null },
      });
      return rental.id;
    })
  );

  const succeeded = deleteResults.filter((r) => r.status === "fulfilled").length;
  const failed = deleteResults.filter((r) => r.status === "rejected").length;

  return NextResponse.json({
    message: `반납 사진 정리 완료: 성공 ${succeeded}건, 실패 ${failed}건`,
    succeeded,
    failed,
  });
};
