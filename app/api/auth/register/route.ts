import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NEMOSINE_TERMS_VERSION } from "@/app/lib/legalConsent";

const prisma = new PrismaClient();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESERVED_REGISTRATION_EMAILS = new Set(["edersouzamelo@gmail.com"]);

function readApproximateIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwardedFor ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    null
  );
}

function readSessionRecord(req: Request) {
  return (
    req.headers.get("x-vercel-id") ||
    req.headers.get("x-request-id") ||
    req.headers.get("cf-ray") ||
    null
  );
}

export async function POST(req: Request) {
  try {
    const { name, email, password, termsAccepted } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!EMAIL_PATTERN.test(normalizedEmail) || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { message: "Informe um email valido e uma senha com pelo menos 8 caracteres" },
        { status: 400 }
      );
    }

    if (termsAccepted !== true) {
      return NextResponse.json(
        { message: "E necessario aceitar os termos para criar sua conta" },
        { status: 400 }
      );
    }

    if (RESERVED_REGISTRATION_EMAILS.has(normalizedEmail)) {
      return NextResponse.json(
        { message: "Nao foi possivel registrar este email" },
        { status: 409 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Nao foi possivel registrar este email" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: typeof name === "string" ? name.trim() : null,
          email: normalizedEmail,
          password: hashedPassword,
        },
      });

      await tx.termsAcceptance.create({
        data: {
          userId: user.id,
          termsVersion: NEMOSINE_TERMS_VERSION,
          ipApprox: readApproximateIp(req),
          sessionRecord: readSessionRecord(req),
          userAgent: req.headers.get("user-agent"),
        },
      });
    });

    return NextResponse.json({ message: "Usuario registrado com sucesso" }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Erro ao registrar usuario" },
      { status: 500 }
    );
  }
}
