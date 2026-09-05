import type { AuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/security/rate-limit";
import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  organizationId: string;
  organizationSlug: string;
  role: Role;
}

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
}

export const authOptions: AuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  secret: getEnv().AUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        organizationSlug: { label: "Organización", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate limiting por email: máximo 10 intentos cada 5 minutos, para frenar fuerza bruta.
        const rate = await checkRateLimit(`login:${credentials.email.toLowerCase()}`, 10, 300);
        if (!rate.allowed) throw new Error("Demasiados intentos de inicio de sesión. Inténtalo de nuevo en unos minutos.");

        const user = await db.user.findUnique({ where: { email: credentials.email.toLowerCase() } });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        const membership = await db.membership.findFirst({
          where: {
            userId: user.id,
            ...(credentials.organizationSlug ? { organization: { slug: credentials.organizationSlug } } : {}),
          },
          include: { organization: true },
          orderBy: { createdAt: "asc" },
        });
        if (!membership) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: membership.organizationId,
          organizationSlug: membership.organization.slug,
          role: membership.role,
        } satisfies SessionUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as SessionUser;
        token.sessionUser = u;
      }
      return token;
    },
    async session({ session, token }): Promise<Session> {
      session.user = token.sessionUser as SessionUser;
      return session;
    },
  },
};
