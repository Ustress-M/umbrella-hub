"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Umbrella, List, Download, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/umbrellas", label: "우산 관리", icon: Umbrella },
  { href: "/admin/rentals", label: "대여 현황", icon: List },
  { href: "/admin/export", label: "CSV 내보내기", icon: Download },
];

type Props = {
  /** 모바일 드로어에서 링크 탭 시 닫기 */
  onNavigate?: () => void;
};

const AdminSidebar = ({ onNavigate }: Props) => {
  const pathname = usePathname();

  const itemClass = (active: boolean) =>
    cn(
      "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors md:py-2.5",
      active
        ? "bg-blue-600 text-white"
        : "text-gray-400 hover:bg-gray-800 hover:text-white active:bg-gray-800"
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-900 text-white md:min-h-screen">
      <div className="hidden border-b border-gray-700 p-5 md:block">
        <div className="flex items-center gap-2">
          <Umbrella size={20} className="text-blue-400" />
          <span className="font-bold text-sm">관리자 패널</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => onNavigate?.()}
            className={itemClass(pathname === href)}
          >
            <Icon size={18} className="shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-gray-700 p-3">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            void signOut({ callbackUrl: "/admin" });
          }}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white active:bg-gray-800 md:py-2.5"
        >
          <LogOut size={18} className="shrink-0" />
          로그아웃
        </button>
      </div>
    </div>
  );
};

export { AdminSidebar };
