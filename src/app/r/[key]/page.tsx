import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { withNeonRetry } from "@/lib/db-retry";

interface Props {
  params: Promise<{ key: string }>;
}

// 단축 URL 엔드포인트: QR 코드에 인쇄되는 URL 길이를 줄여
// 100×100mm 곡면 라벨에서도 모듈이 커져 인식률이 올라간다.
//
// key 는 다음 우선순위로 해석한다:
//  1) Umbrella.number (예: "001") — 신규 QR 용 기본 키
//  2) Umbrella.id (CUID) — 이전에 배포된 긴 URL QR 호환
//
// 해석 성공 시 기존 /rent/[umbrellaId] 로 redirect 해 렌더 로직을 단일화.
// 실패 시 404.
const ShortRentPage = async ({ params }: Props) => {
  const { key } = await params;

  const umbrella = await withNeonRetry("r/[key] lookup", async () => {
    const byNumber = await db.umbrella.findUnique({ where: { number: key } });
    if (byNumber) return byNumber;
    return db.umbrella.findUnique({ where: { id: key } });
  });

  if (!umbrella) notFound();

  redirect(`/rent/${umbrella.id}`);
};

export default ShortRentPage;
