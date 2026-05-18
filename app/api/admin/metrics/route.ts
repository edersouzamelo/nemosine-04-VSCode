import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Email do criador — único com acesso ao painel admin
const ADMIN_EMAIL = "edersouzamelo@gmail.com";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // 1. Total de usuários registrados
    const totalUsers = await prisma.user.count();

    // 2. Lista de usuários (sem senha, sem conteúdo de conversas)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            threads: true,
            memories: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Personas mais usadas (por quantidade de threads)
    const personaUsage = await prisma.thread.groupBy({
      by: ["personaId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    });

    // 4. Atividade recente (últimas 50 threads, sem conteúdo das mensagens)
    const recentActivity = await prisma.thread.findMany({
      select: {
        id: true,
        personaId: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: { name: true, email: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    // 5. Total de mensagens no sistema
    const totalMessages = await prisma.message.count();

    // 6. Total de threads
    const totalThreads = await prisma.thread.count();

    // 7. Atividade por dia (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMessages = await prisma.message.findMany({
      where: { timestamp: { gte: thirtyDaysAgo } },
      select: { timestamp: true },
      orderBy: { timestamp: "asc" },
    });

    // Agrupa mensagens por dia
    const activityByDay: Record<string, number> = {};
    recentMessages.forEach((m) => {
      const day = m.timestamp.toISOString().split("T")[0];
      activityByDay[day] = (activityByDay[day] || 0) + 1;
    });

    return NextResponse.json({
      totalUsers,
      totalThreads,
      totalMessages,
      users,
      personaUsage,
      recentActivity,
      activityByDay,
    });
  } catch (error) {
    console.error("Admin API error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
