import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      if (existingUser.password) {
        return NextResponse.json(
          { message: "Usuário já existe" },
          { status: 400 }
        );
      } else {
        // Usuário existe mas não tinha senha (ex: criado pelo bypass ou outro provider)
        await prisma.user.update({
          where: { email },
          data: { 
            password: hashedPassword,
            name: name || existingUser.name
          }
        });
        return NextResponse.json({ message: "Senha configurada e usuário registrado com sucesso" }, { status: 201 });
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json({ message: "Usuário registrado com sucesso" }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao registrar usuário" },
      { status: 500 }
    );
  }
}
