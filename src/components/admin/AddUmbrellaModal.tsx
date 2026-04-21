"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addUmbrellaSchema, type AddUmbrellaValues } from "@/lib/validations";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddUmbrellaModal = ({ open, onClose, onSuccess }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddUmbrellaValues>({
    resolver: zodResolver(addUmbrellaSchema),
  });

  const onSubmit = async (data: AddUmbrellaValues) => {
    setIsLoading(true);
    const res = await fetch("/api/admin/umbrellas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      toast({ title: `우산 ${data.number}번이 추가되었습니다` });
      reset();
      onSuccess();
    } else {
      toast({ title: json.error, variant: "destructive" });
    }
    setIsLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800">우산 추가</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">우산 번호</label>
            <input
              {...register("number")}
              placeholder="예: 001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.number && (
              <p className="text-red-500 text-xs">{errors.number.message}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "추가 중..." : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { AddUmbrellaModal };
