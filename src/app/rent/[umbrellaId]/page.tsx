import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Umbrella } from "lucide-react";
import { RentalForm } from "@/components/student/RentalForm";

interface Props {
  params: { umbrellaId: string };
}

const RentPage = async ({ params }: Props) => {
  const umbrella = await db.umbrella.findUnique({
    where: { id: params.umbrellaId },
  });

  if (!umbrella) notFound();

  if (umbrella.status === "MAINTENANCE") {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm w-full">
          <div className="text-4xl mb-4">🔧</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">점검 중</h2>
          <p className="text-gray-500 text-sm">
            우산 {umbrella.number}번은 현재 점검 중입니다.<br />
            다른 우산을 이용해주세요.
          </p>
        </div>
      </div>
    );
  }

  if (umbrella.status === "RENTED") {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm w-full">
          <div className="text-4xl mb-4">☂️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">대여 중</h2>
          <p className="text-gray-500 text-sm">
            우산 {umbrella.number}번은 현재 대여 중입니다.<br />
            다른 우산을 이용해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Umbrella size={28} />
            <span className="font-bold text-lg">우산 대여</span>
          </div>
          <div className="bg-blue-50 rounded-xl py-3">
            <p className="text-2xl font-bold text-blue-700">{umbrella.number}번</p>
            <p className="text-sm text-blue-500">대여 가능</p>
          </div>
        </div>

        <RentalForm umbrellaId={umbrella.id} umbrellaNumber={umbrella.number} />

        <p className="text-xs text-gray-400 text-center">
          당일 반납을 원칙으로 합니다.<br />
          반납 시 우산의 QR을 다시 스캔해주세요.
        </p>
      </div>
    </div>
  );
};

export default RentPage;
