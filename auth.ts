import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import Nodemailer from "next-auth/providers/nodemailer"

const prisma = new PrismaClient()

console.log("AUTH_SECRET present:", !!process.env.AUTH_SECRET);
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
    Nodemailer({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        const transport = (await import("nodemailer")).createTransport(provider.server)
        const result = await transport.sendMail({
          to: email,
          from: provider.from,
          subject: `Acesso ao Grimório Nemosine`,
          text: `Entre no Nemosine: ${url}`,
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
        })
        const failed = result.rejected.concat(result.pending).filter(Boolean)
        if (failed.length) {
          throw new Error(`Email(s) (${failed.join(", ")}) could not be sent`)
        }
      },
    }),
  ],
})
