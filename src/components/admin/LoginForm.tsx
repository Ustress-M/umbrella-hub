"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const LoginForm = () => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await signIn("credentials", {
      id,
      password,
      redirect: false,
    });

    // Auth.js v5에서는 인증 실패여도 ok가 true일 수 있어 error 필드를 우선 확인한다.
    if (result && !result.error) {
      // 프리페치된 /admin/dashboard RSC 는 "로그인 전" 상태로 캐시돼 있어
      // 단순 push 만 하면 새로고침 전까지 로그인이 반영되지 않은 화면이 보인다.
      // router.refresh() 로 클라이언트 라우터 캐시를 버린 뒤 이동해 쿠키가
      // 실린 새 RSC 를 받아오도록 강제한다.
      router.refresh();
      router.push("/admin/dashboard");
    } else {
      setError("아이디 또는 비밀번호가 올바르지 않습니다");
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">아이디</label>
        <input
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="username"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="current-password"
        />
      </div>

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
        {isLoading ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
};

export { LoginForm };
