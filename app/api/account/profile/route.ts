import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";

const prisma = new PrismaClient();

export async function PATCH(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Nao autenticado" }, { status: 401 });
  }

  const { name } = await req.json();
  const nextName = typeof name === "string" ? name.trim() : "";

  if (nextName.length < 2 || nextName.length > 80) {
    return NextResponse.json(
      { message: "Informe um nome entre 2 e 80 caracteres." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: nextName },
  });

  return NextResponse.json({ message: "Nome atualizado com sucesso.", name: nextName });
}
