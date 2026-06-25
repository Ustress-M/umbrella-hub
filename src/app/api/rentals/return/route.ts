import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  uploadFile,
  generateReturnPhotoKey,
} from "@/lib/r2";
import {
  validateFileSize,
  validateFileType,
  calcDeleteAt,
} from "@/lib/utils";
import type { ApiResponse } from "@/types";

export const POST = async (
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ message: string }>>> => {
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { success: false, error: "요청 형식이 올바르지 않습니다" },
      { status: 400 }
    );
  }

  const umbrellaId = formData.get("umbrellaId") as string;
  const studentId = formData.get("studentId") as string;
  const studentName = formData.get("studentName") as string;
  const photo = formData.get("photo") as File | null;

  if (!umbrellaId || !studentId || !studentName) {
    return NextResponse.json(
      { success: false, error: "필수 정보가 누락되었습니다" },
      { status: 400 }
    );
  }

  if (!photo) {
    return NextResponse.json(
      { success: false, error: "반납 사진을 업로드해주세요" },
      { status: 400 }
    );
  }

  if (!validateFileType(photo)) {
    return NextResponse.json(
      { success: false, error: "JPG, PNG 파일만 업로드 가능합니다" },
      { status: 400 }
    );
  }

  if (!validateFileSize(photo)) {
    const maxMB = process.env.MAX_UPLOAD_SIZE_MB ?? "5";
    return NextResponse.json(
      { success: false, error: `파일 크기는 ${maxMB}MB 이하여야 합니다` },
      { status: 400 }
    );
  }

  const rental = await db.rental.findFirst({
    where: { umbrellaId, studentId, studentName, status: "RENTED" },
  });

  if (!rental) {
    return NextResponse.json(
      { success: false, error: "대여 정보를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const key = generateReturnPhotoKey(rental.id, photo.name);
  const photoUrl = await uploadFile(photo, key);
  const returnedAt = new Date();

  await db.$transaction(async (tx) => {
    await Promise.all([
      tx.rental.update({
        where: { id: rental.id },
        data: {
          status: "RETURNED",
          returnPhotoUrl: photoUrl,
          returnedAt,
          deleteAt: calcDeleteAt(returnedAt),
        },
      }),
      tx.umbrella.update({
        where: { id: umbrellaId },
        data: { status: "AVAILABLE" },
      }),
    ]);
  });

  return NextResponse.json({
    success: true,
    data: { message: "반납이 완료되었습니다. 감사합니다!" },
  });
};
