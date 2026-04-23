import { AdminAppShell } from "@/components/admin/AdminAppShell";
import { SessionProviderWrapper } from "@/components/admin/SessionProviderWrapper";

// 관리자 페이지는 절대 캐시/정적 렌더링되면 안 됨.
// Next.js 16 은 서버 컴포넌트를 적극적으로 prerender 하려고 하는데,
// cookies() 를 참조하는 auth() 만으로 dynamic 전환이 100% 보장되지 않음.
// 로그인된 대시보드 HTML 이 캐시되어 다른 사용자에게 제공되는 심각한 버그를
// 방지하기 위해 명시적으로 모든 정적화를 비활성화한다.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const AdminLayout = ({ children }: { children: React.ReactNode }) => (
  <SessionProviderWrapper>
    <AdminAppShell>{children}</AdminAppShell>
  </SessionProviderWrapper>
);

export default AdminLayout;
