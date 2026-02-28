import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    verifyRequest: "/auth/verify-request",
  },
  providers: [], // Providers are defined in auth.ts
} satisfies NextAuthConfig
