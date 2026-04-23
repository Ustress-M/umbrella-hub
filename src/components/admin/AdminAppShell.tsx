"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

type Props = {
  children: React.ReactNode;
};

const AdminAppShell = ({ children }: Props) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* 모바일 상단 바 */}
      <header
        className="md:hidden sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-800 hover:bg-gray-100 active:bg-gray-200"
          aria-expanded={mobileOpen}
          aria-controls="admin-mobile-drawer"
          aria-label="메뉴 열기"
        >
          <Menu size={22} strokeWidth={2} />
        </button>
        <span className="font-semibold text-gray-900">관리자</span>
        <span className="w-11" aria-hidden />
      </header>

      {/* 딤 배경 */}
      {mobileOpen ? (
        <button
          type="button"
          id="admin-drawer-backdrop"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="메뉴 닫기"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* 사이드바: 모바일은 드로어, 데스크톱은 고정 열림 */}
      <div
        id="admin-mobile-drawer"
        className={
          "fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] transition-transform duration-200 ease-out md:static md:z-0 md:w-56 md:shrink-0 md:translate-x-0 " +
          (mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")
        }
        role="navigation"
      >
        <div className="flex h-full flex-col shadow-xl md:shadow-none">
          <div className="flex items-center justify-between border-b border-gray-700 bg-gray-900 px-3 py-3 md:hidden">
            <span className="pl-1 text-sm font-semibold text-white">메뉴</span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white"
              aria-label="메뉴 닫기"
            >
              <X size={22} strokeWidth={2} />
            </button>
          </div>
          <AdminSidebar onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:p-6">
        {children}
      </main>
    </div>
  );
};

export { AdminAppShell };
