import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // nginx 역방향 프록시 뒤에서 구동되므로 X-Forwarded-* 헤더를 신뢰해야 함.
  // 이 값을 명시하지 않으면 Auth.js v5 는 요청 host 와 AUTH_URL/NEXTAUTH_URL 이
  // 불일치할 때 "server configuration" 오류를 내거나 stub 세션을 반환해
  // 인증 체크가 망가질 수 있음.
  trustHost: true,

  // .env 에 AUTH_SECRET 또는 NEXTAUTH_SECRET 둘 중 하나가 있으면 되도록 폴백.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        id: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { id, password } = parsed.data;

        const adminId = process.env.ADMIN_ID;
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

        if (!adminId || !adminPasswordHash) return null;
        if (id !== adminId) return null;

        const isValid = await bcrypt.compare(password, adminPasswordHash);
        if (!isValid) return null;

        return { id: "admin", name: "관리자", email: adminId };
      },
    }),
  ],
  pages: {
    signIn: "/admin",
  },
  session: {
    strategy: "jwt",
    maxAge: Number(process.env.SESSION_LIFETIME_SECONDS ?? 7200),
  },
  callbacks: {
    // authorized() 는 middleware/server component 의 auth() 가 세션을 검증할 때
    // 호출됨. 반드시 user 가 존재할 때만 true 를 반환해, 빈 토큰/무효 쿠키로 인한
    // 우연한 승격을 원천 차단한다.
    authorized({ auth: session }) {
      return !!session?.user;
    },
    jwt({ token, user }) {
      if (user) token.role = "admin";
      return token;
    },
    session({ session, token }) {
      if (token.role) session.user.role = token.role as string;
      return session;
    },
  },
});
