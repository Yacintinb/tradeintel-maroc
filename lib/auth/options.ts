import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isDatabaseUnavailable } from "@/lib/demo-data";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        try {
          const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
          if (!user) return null;
          const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
          if (!valid) return null;
          return { id: user.id, name: user.name, email: user.email, role: user.role };
        } catch (error) {
          if (!isDatabaseUnavailable(error)) throw error;
          if (parsed.data.email === "admin@tradeintel.ma" && parsed.data.password === "admin123") {
            return { id: "preview-admin", name: "Admin Preview", email: parsed.data.email, role: "ADMIN" };
          }
          if (parsed.data.email === "client@tradeintel.ma" && parsed.data.password === "client123") {
            return { id: "preview-client", name: "Client Preview", email: parsed.data.email, role: "CLIENT" };
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = String(token.role);
      }
      return session;
    },
  },
};
