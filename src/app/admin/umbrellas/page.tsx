"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { UmbrellaTable } from "@/components/admin/UmbrellaTable";
import { AddUmbrellaModal } from "@/components/admin/AddUmbrellaModal";
import { useToast } from "@/components/ui/use-toast";
import type { Umbrella } from "@prisma/client";

const UmbrellasPage = () => {
  const [umbrellas, setUmbrellas] = useState<Umbrella[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchUmbrellas = useCallback(async () => {
    setIsLoading(true);
    const res = await fetch("/api/admin/umbrellas");
    const json = await res.json();
    if (json.success) setUmbrellas(json.data);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchUmbrellas(); }, [fetchUmbrellas]);

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/umbrellas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (json.success) {
      toast({ title: "상태가 변경되었습니다" });
      fetchUmbrellas();
    } else {
      toast({ title: json.error, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("우산을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/admin/umbrellas/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast({ title: "우산이 삭제되었습니다" });
      fetchUmbrellas();
    } else {
      toast({ title: json.error, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">우산 관리</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          우산 추가
        </button>
      </div>

      <UmbrellaTable
        umbrellas={umbrellas}
        isLoading={isLoading}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />

      <AddUmbrellaModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { setIsModalOpen(false); fetchUmbrellas(); }}
      />
    </div>
  );
};

export default UmbrellasPage;
