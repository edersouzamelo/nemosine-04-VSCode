import NextAuth, { CredentialsSignin } from "next-auth"
import { PrismaClient } from "@prisma/client"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"

const GOOGLE_AUTHORIZATION_PARAMS = {
  scope: "openid email profile",
  response_type: "code",
}

class InvalidLoginError extends CredentialsSignin {
  code = "Email ou senha incorretos"
}

const prisma = new PrismaClient()

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  // JWT keeps the existing credential flow while the adapter persists linked OAuth accounts.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/access",
    error: "/access",
  },
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: GOOGLE_AUTHORIZATION_PARAMS,
      },
      // Link only identities whose email ownership Google has confirmed.
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        if (!profile.email || !profile.email_verified) {
          throw new Error("Google account email is not verified")
        }

        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email.trim().toLowerCase(),
          image: profile.picture,
        }
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Credenciais inválidas")
        }

        const user = await prisma.user.findUnique({
          where: {
            email: (credentials.email as string).trim().toLowerCase()
          }
        });

        if (!user || !user.password) {
          throw new InvalidLoginError()
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          throw new InvalidLoginError()
        }

        // Return a clean object for JWT
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email?.trim().toLowerCase();
        if (!email) return "/access?mode=register&reason=google-unregistered";

        const existingUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });

        return existingUser ? true : "/access?mode=register&reason=google-unregistered";
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      if (session.user && typeof token.picture === "string") {
        session.user.image = token.picture;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.sub = user.id;
      }
      if (account?.provider === "google" && typeof profile?.picture === "string") {
        token.picture = profile.picture;
      }
      return token;
    }
  }
})
