"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { statusQuerySchema, type StatusQueryValues } from "@/lib/validations";
import { formatDate, statusLabel } from "@/lib/utils";
import type { RentalWithUmbrella } from "@/types";
import Link from "next/link";

const StatusChecker = () => {
  const [rental, setRental] = useState<RentalWithUmbrella | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<StatusQueryValues>({
    resolver: zodResolver(statusQuerySchema),
  });

  const onSubmit = async (data: StatusQueryValues) => {
    setIsLoading(true);
    const params = new URLSearchParams({
      studentId: data.studentId,
      studentName: data.studentName,
    });
    const res = await fetch(`/api/rentals/status?${params}`);
    const json = await res.json();
    setRental(json.success ? json.data : null);
    setIsLoading(false);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-1">
          <input
            {...register("studentId")}
            placeholder="학번"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.studentId && (
            <p className="text-red-500 text-xs">{errors.studentId.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <input
            {...register("studentName")}
            placeholder="이름"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.studentName && (
            <p className="text-red-500 text-xs">{errors.studentName.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? "조회 중..." : "조회하기"}
        </button>
      </form>

      {rental === null && (
        <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-500">
          현재 대여 중인 우산이 없습니다.
        </div>
      )}

      {rental && (
        <div className="bg-blue-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-blue-800">
              우산 {rental.umbrella.number}번
            </span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {statusLabel[rental.status] ?? rental.status}
            </span>
          </div>
          <p className="text-xs text-blue-600">대여일: {formatDate(rental.createdAt)}</p>
          <Link
            href={`/return/${rental.umbrella.id}`}
            className="block w-full text-center bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors mt-2"
          >
            반납하기
          </Link>
        </div>
      )}
    </div>
  );
};

export { StatusChecker };
