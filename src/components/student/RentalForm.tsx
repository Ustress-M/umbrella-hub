"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { rentalSchema, type RentalFormValues } from "@/lib/validations";
import Link from "next/link";

interface Props {
  umbrellaId: string;
  umbrellaNumber: string;
}

type Step = "form" | "success";

const RentalForm = ({ umbrellaId, umbrellaNumber }: Props) => {
  const [step, setStep] = useState<Step>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<RentalFormValues>({
    resolver: zodResolver(rentalSchema),
  });

  const onSubmit = async (data: RentalFormValues) => {
    setIsLoading(true);
    setError("");

    const res = await fetch("/api/rentals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, umbrellaId }),
    });

    const json = await res.json();
    if (json.success) {
      setStep("success");
    } else {
      setError(json.error ?? "오류가 발생했습니다");
    }
    setIsLoading(false);
  };

  if (step === "success") {
    return (
      <div className="text-center space-y-4">
        <div className="text-5xl">✅</div>
        <div>
          <p className="text-xl font-bold text-gray-800">대여 완료!</p>
          <p className="text-gray-500 text-sm mt-1">
            우산 <strong>{umbrellaNumber}번</strong>을 가져가세요
          </p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 space-y-2">
          <p className="text-sm text-green-700 font-medium">반납 방법</p>
          <p className="text-xs text-green-600">
            우산의 QR 코드를 다시 스캔하거나<br />
            아래 버튼을 눌러 반납하세요
          </p>
        </div>
        <Link
          href={`/return/${umbrellaId}`}
          className="block w-full bg-gray-800 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          나중에 반납하기
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {[
        { name: "studentId" as const, label: "학번", placeholder: "학번을 입력하세요" },
        { name: "studentName" as const, label: "이름", placeholder: "이름을 입력하세요" },
        { name: "phone" as const, label: "전화번호", placeholder: "01012345678", type: "tel" },
      ].map(({ name, label, placeholder, type }) => (
        <div key={name} className="space-y-1">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <input
            {...register(name)}
            type={type ?? "text"}
            placeholder={placeholder}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors[name] && (
            <p className="text-red-500 text-xs">{errors[name]?.message}</p>
          )}
        </div>
      ))}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isLoading ? "처리 중..." : "우산 빌리기"}
      </button>
    </form>
  );
};

export { RentalForm };
