import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { withNeonRetry } from "@/lib/db-retry";
import { Umbrella } from "lucide-react";
import { ReturnForm } from "@/components/student/ReturnForm";

interface Props {
  params: Promise<{ umbrellaId: string }>;
}

type UnavailableMessageProps = {
  emoji: string;
  title: string;
  description: string;
};

const UnavailableMessage = ({ emoji, title, description }: UnavailableMessageProps) => (
  <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm w-full">
      <div className="text-4xl mb-4">{emoji}</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-500 text-sm">{description}</p>
    </div>
  </div>
);

const ReturnPage = async ({ params }: Props) => {
  const { umbrellaId } = await params;
  const umbrella = await withNeonRetry("return/umbrella", () =>
    db.umbrella.findUnique({
      where: { id: umbrellaId },
    })
  );

  if (!umbrella) notFound();

  if (umbrella.status === "AVAILABLE") {
    return (
      <UnavailableMessage
        emoji="✅"
        title="이미 반납된 우산"
        description={`우산 ${umbrella.number}번은 이미 반납 처리되었습니다.`}
      />
    );
  }

  if (umbrella.status === "MAINTENANCE") {
    return (
      <UnavailableMessage
        emoji="🔧"
        title="점검 중인 우산"
        description={`우산 ${umbrella.number}번은 현재 점검 중입니다. 관리자에게 문의해주세요.`}
      />
    );
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <Umbrella size={28} />
            <span className="font-bold text-lg">우산 반납</span>
          </div>
          <div className="bg-green-50 rounded-xl py-3">
            <p className="text-2xl font-bold text-green-700">{umbrella.number}번</p>
            <p className="text-sm text-green-500">반납 진행 중</p>
          </div>
        </div>

        <ReturnForm umbrellaId={umbrella.id} umbrellaNumber={umbrella.number} />

        <p className="text-xs text-gray-400 text-center">
          우산과 거치대가 함께 보이도록 사진을 촬영해주세요.
        </p>
      </div>
    </div>
  );
};

export default ReturnPage;
