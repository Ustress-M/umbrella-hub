"use client";

import { useEffect, useState, useCallback } from "react";
import { RentalTable } from "@/components/admin/RentalTable";
import { useToast } from "@/components/ui/use-toast";
import type { RentalWithUmbrella } from "@/types";

const RentalsPage = () => {
  const [rentals, setRentals] = useState<RentalWithUmbrella[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const { toast } = useToast();

  const fetchRentals = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/rentals?${params}`);
    const json = await res.json();
    if (json.success) setRentals(json.data);
    setIsLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchRentals(); }, [fetchRentals]);

  const handleStatusChange = async (id: string, status: string, note?: string) => {
    const res = await fetch(`/api/admin/rentals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note }),
    });
    const json = await res.json();
    if (json.success) {
      toast({ title: "상태가 변경되었습니다" });
      fetchRentals();
    } else {
      toast({ title: json.error, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">대여 현황</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체</option>
          <option value="RENTED">대여중</option>
          <option value="RETURNED">반납완료</option>
          <option value="LOST">분실</option>
          <option value="OVERDUE">장기미반납</option>
        </select>
      </div>

      <RentalTable
        rentals={rentals}
        isLoading={isLoading}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default RentalsPage;
