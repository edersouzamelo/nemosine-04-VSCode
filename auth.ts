import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import Resend from "next-auth/providers/resend"

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
    providers: [
        Resend({
            apiKey: process.env.AUTH_RESEND_KEY,
            from: "Nemosine <onboarding@resend.dev>",
            sendVerificationRequest: async ({ identifier: email, url, provider }) => {
                const { host } = new URL(url)
                const res = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${provider.apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: provider.from,
                        to: email,
                        subject: `Acesso ao Grimório Nemosine`,
                        html: `
<body style="background-color: #0a0a0a; color: #E5D0A1; font-family: 'Courier New', Courier, monospace; padding: 40px; text-align: center;">
  <div style="max-width: 600px; margin: 0 auto; border: 1px solid #333; padding: 20px; background-color: #111;">
    <h1 style="color: #C5A059; letter-spacing: 2px; text-transform: uppercase; font-size: 24px; margin-bottom: 30px;">
      Nemosine Nous
    </h1>
    <p style="font-size: 16px; color: #aaa; margin-bottom: 40px;">
      Uma conexão foi solicitada para o seu grimório digital.
    </p>
    <a href="${url}" style="background-color: #C5A059; color: #000; padding: 15px 30px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 40px;">
      Entrar no Sistema
    </a>
    <p style="font-size: 12px; color: #555;">
      Se você não solicitou este chamado, ignore esta mensagem. O portal se fechará sozinho.
    </p>
  </div>
</body>
                        `,
                        text: `Entre no Nemosine: ${url}`,
                    }),
                })

                if (!res.ok)
                    throw new Error("Resend error: " + JSON.stringify(await res.json()))
            },
        }),
    ],
})
