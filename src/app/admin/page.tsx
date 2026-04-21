import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { Umbrella } from "lucide-react";

const AdminLoginPage = async () => {
  const session = await auth();
  if (session) redirect("/admin/dashboard");

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Umbrella size={28} />
            <span className="font-bold text-xl">관리자</span>
          </div>
          <p className="text-gray-500 text-sm">우산 대여 시스템</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
};

export default AdminLoginPage;
