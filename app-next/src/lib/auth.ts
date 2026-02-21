import NextAuth, { getServerSession } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" as const, maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (!email || !password) return null;
        const devPass = process.env.NEXTAUTH_CREDENTIALS_PASSWORD;
        if (devPass && password === devPass) {
          let user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            user = await prisma.user.create({
              data: { email, name: email.split("@")[0] },
            });
          }
          return { id: user.id, email: user.email, name: user.name };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};

/** Returns session and DB user if the current user has manager role (was added by a manager). Otherwise null. */
export async function getManagerSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: (session.user as { id?: string }).id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) return null;
  if (user.role === "manager") return { session, user };
  // Bootstrap: if no manager exists yet, allow this user to access manager area to add the first manager
  const anyManager = await prisma.user.findFirst({ where: { role: "manager" }, select: { id: true } });
  if (!anyManager) return { session, user };
  return null;
}
