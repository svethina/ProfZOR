import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

/**
 * Auth.js (NextAuth v5): Google OAuth + database sessions.
 * Стабильный userId = User.id в PostgreSQL (создаётся адаптером при первом входе).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    // Server-side сессии в таблице Session (не JWT)
    strategy: "database",
  },
  providers: [
    Google({
      // Поддержка имён из PROMPT.md и стандартных AUTH_* для Auth.js v5
      clientId: process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID,
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Прокидываем стабильный id и роль в session.user
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // role хранится в нашей таблице User
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        session.user.role = dbUser?.role ?? "USER";
      }
      return session;
    },
  },
  trustHost: true,
});
