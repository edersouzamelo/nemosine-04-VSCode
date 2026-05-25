import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESERVED_REGISTRATION_EMAILS = new Set(["edersouzamelo@gmail.com"]);

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!EMAIL_PATTERN.test(normalizedEmail) || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { message: "Informe um email valido e uma senha com pelo menos 8 caracteres" },
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
    await prisma.user.create({
      data: {
        name: typeof name === "string" ? name.trim() : null,
        email: normalizedEmail,
        password: hashedPassword,
      },
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
