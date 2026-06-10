import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Nao autenticado" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json(
      { message: "A nova senha deve ter pelo menos 8 caracteres." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!user) {
    return NextResponse.json({ message: "Usuario nao encontrado" }, { status: 404 });
  }

  if (user.password) {
    if (typeof currentPassword !== "string" || currentPassword.length === 0) {
      return NextResponse.json({ message: "Informe a senha atual." }, { status: 400 });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ message: "Senha atual incorreta." }, { status: 403 });
    }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  });

  return NextResponse.json({
    message: user.password ? "Senha alterada com sucesso." : "Senha criada com sucesso.",
  });
}
