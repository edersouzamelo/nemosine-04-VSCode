import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import { authConfig } from "./auth.config"

const prisma = new PrismaClient()

console.log("AUTH_SECRET present:", !!process.env.AUTH_SECRET);
console.log("AUTH_RESEND_KEY present:", !!process.env.AUTH_RESEND_KEY);
console.log("Node Env:", process.env.NODE_ENV);

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    pages: {
        verifyRequest: "/auth/verify-request",
    },
    secret: process.env.AUTH_SECRET,
    debug: true,
    ...authConfig,
})
