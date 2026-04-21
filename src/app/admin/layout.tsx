import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SessionProviderWrapper } from "@/components/admin/SessionProviderWrapper";

const AdminLayout = ({ children }: { children: React.ReactNode }) => (
  <SessionProviderWrapper>
    <div className="min-h-screen bg-gray-100 flex">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  </SessionProviderWrapper>
);

export default AdminLayout;
