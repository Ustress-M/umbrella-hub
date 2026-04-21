import { AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { RentalWithUmbrella } from "@/types";

interface Props {
  rentals: RentalWithUmbrella[];
}

const OverdueList = ({ rentals }: Props) => (
  <div className="bg-white rounded-2xl shadow-sm p-5">
    <div className="flex items-center gap-2 mb-4">
      <AlertTriangle size={18} className="text-orange-500" />
      <h3 className="font-semibold text-gray-800">3일 이상 미반납</h3>
      {rentals.length > 0 && (
        <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
          {rentals.length}건
        </span>
      )}
    </div>

    {rentals.length === 0 ? (
      <p className="text-sm text-gray-400 text-center py-6">장기 미반납 없음</p>
    ) : (
      <div className="space-y-3">
        {rentals.map((r) => (
          <div key={r.id} className="flex items-center justify-between text-sm p-3 bg-orange-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-800">
                {r.studentName} ({r.studentId})
              </p>
              <p className="text-xs text-gray-500">{r.phone}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-orange-700">{r.umbrella.number}번</p>
              <p className="text-xs text-gray-400">{formatDate(r.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export { OverdueList };
