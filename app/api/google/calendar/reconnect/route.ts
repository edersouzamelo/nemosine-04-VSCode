import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";

const prisma = new PrismaClient();

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  await prisma.account.deleteMany({
    where: {
      userId: session.user.id,
      provider: "google",
    },
  });

  return NextResponse.json({ ok: true });
}
