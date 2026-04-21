import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
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
