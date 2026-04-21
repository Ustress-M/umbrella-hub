import Link from "next/link";
import { Umbrella, Search, Info } from "lucide-react";
import { StatusChecker } from "@/components/student/StatusChecker";

const HomePage = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <header className="bg-white shadow-sm">
      <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
        <Umbrella className="text-blue-600" size={28} />
        <h1 className="text-xl font-bold text-gray-800">우산 대여 시스템</h1>
      </div>
    </header>

    <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center space-y-3">
        <div className="text-5xl">☂️</div>
        <h2 className="text-xl font-bold text-gray-800">우산이 필요하신가요?</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          우산 거치대에서 QR 코드를 스캔하면<br />
          바로 대여할 수 있습니다.
        </p>
      </div>

      <div className="bg-blue-600 rounded-2xl p-6 text-white space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <Info size={18} />
          <span>이용 방법</span>
        </div>
        <ol className="text-sm space-y-1 text-blue-100 list-decimal list-inside">
          <li>우산에 부착된 QR 코드 스캔</li>
          <li>학번 · 이름 · 전화번호 입력</li>
          <li>우산을 가져가세요</li>
          <li>반납 시 QR 재스캔 후 사진 촬영</li>
        </ol>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-2 font-semibold text-gray-800">
          <Search size={18} />
          <span>대여 현황 조회</span>
        </div>
        <p className="text-gray-500 text-sm">학번과 이름으로 현재 대여 상태를 확인하세요.</p>
        <StatusChecker />
      </div>
    </main>

    <footer className="text-center text-xs text-gray-400 py-6">
      <Link href="/admin" className="hover:text-gray-600">관리자</Link>
    </footer>
  </div>
);

export default HomePage;
