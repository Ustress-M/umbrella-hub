"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { returnSchema, type ReturnFormValues } from "@/lib/validations";
import { Camera } from "lucide-react";

interface Props {
  umbrellaId: string;
  umbrellaNumber: string;
}

type Step = "form" | "success";

const ReturnForm = ({ umbrellaId, umbrellaNumber }: Props) => {
  const [step, setStep] = useState<Step>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ReturnFormValues>({
    resolver: zodResolver(returnSchema),
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: ReturnFormValues) => {
    if (!photoFile) {
      setError("반납 사진을 업로드해주세요");
      return;
    }

    setIsLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("umbrellaId", umbrellaId);
    formData.append("studentId", data.studentId);
    formData.append("studentName", data.studentName);
    formData.append("photo", photoFile);

    const res = await fetch("/api/rentals/return", {
      method: "POST",
      body: formData,
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
        <div className="text-5xl">🎉</div>
        <div>
          <p className="text-xl font-bold text-gray-800">반납 완료!</p>
          <p className="text-gray-500 text-sm mt-1">
            우산 <strong>{umbrellaNumber}번</strong> 반납 감사합니다
          </p>
        </div>
        <p className="text-xs text-gray-400">다음에 또 이용해주세요 ☂️</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {[
        { name: "studentId" as const, label: "학번", placeholder: "학번을 입력하세요" },
        { name: "studentName" as const, label: "이름", placeholder: "이름을 입력하세요" },
      ].map(({ name, label, placeholder }) => (
        <div key={name} className="space-y-1">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <input
            {...register(name)}
            placeholder={placeholder}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {errors[name] && (
            <p className="text-red-500 text-xs">{errors[name]?.message}</p>
          )}
        </div>
      ))}

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">반납 사진 <span className="text-red-500">*</span></label>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-4 text-center hover:border-green-400 transition-colors"
        >
          {preview ? (
            <img src={preview} alt="미리보기" className="w-full max-h-40 object-cover rounded-lg" />
          ) : (
            <div className="space-y-1 text-gray-400">
              <Camera className="mx-auto" size={24} />
              <p className="text-sm">사진 촬영 또는 선택</p>
              <p className="text-xs">JPG, PNG · 최대 5MB</p>
            </div>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {isLoading ? "처리 중..." : "반납 완료하기"}
      </button>
    </form>
  );
};

export { ReturnForm };
