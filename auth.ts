import NextAuth, { CredentialsSignin } from "next-auth"
import { PrismaClient } from "@prisma/client"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

class InvalidLoginError extends CredentialsSignin {
  code = "Email ou senha incorretos"
}

const prisma = new PrismaClient()

export const { handlers, auth, signIn, signOut } = NextAuth({
  // SEM adapter - Credentials + JWT não precisa de adapter no banco
  session: { strategy: "jwt" },
  pages: {
    signIn: "/", // O grimório agora é a página principal
  },
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  providers: [
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
            email: credentials.email as string
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
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  }
})
