import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { isAdminEmail } from "@/app/lib/accessControl";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await auth();
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // 1. Buscar todos os usuários cadastrados
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

    const termsAcceptances = await prisma.termsAcceptance.findMany({
      select: {
        id: true,
        termsVersion: true,
        acceptedAt: true,
        ipApprox: true,
        sessionRecord: true,
        userAgent: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { acceptedAt: "desc" },
      take: 200,
    });

    // 2. Buscar todas as threads com suas contagens e datas de modificação
    const allThreads = await prisma.thread.findMany({
      select: {
        id: true,
        userId: true,
        personaId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Função utilitária para compilar métricas avançadas baseadas em um subconjunto de dados
    const compileMetrics = (subsetUsers: typeof users, subsetThreads: typeof allThreads) => {
      const totalUsers = subsetUsers.length;
      const totalThreads = subsetThreads.length;
      const totalMessages = subsetThreads.reduce((sum, t) => sum + t._count.messages, 0);
      const avgMessagesPerThread = totalThreads > 0 ? Number((totalMessages / totalThreads).toFixed(1)) : 0;

      // Agrupar threads por ID de usuário
      const threadsByUser: Record<string, typeof allThreads> = {};
      subsetThreads.forEach((t) => {
        if (t.userId) {
          threadsByUser[t.userId] = threadsByUser[t.userId] || [];
          threadsByUser[t.userId].push(t);
        }
      });

      // Calcular contagem de usuários engajados e fidelizados
      let engagedUsers = 0;
      let loyalUsers = 0;

      subsetUsers.forEach((u) => {
        const userThreads = threadsByUser[u.id] || [];
        const msgCount = userThreads.reduce((sum, t) => sum + t._count.messages, 0);

        // Engajado: mais de 1 thread OU mais de 5 mensagens totais
        if (userThreads.length > 1 || msgCount > 5) {
          engagedUsers++;
        }

        // Fidelizado: tempo de retenção (diferença entre threads ou do cadastro) maior que 7 dias
        if (userThreads.length > 0) {
          const dates = userThreads.map((t) => new Date(t.createdAt).getTime());
          const maxDate = Math.max(...dates);
          const minDate = Math.min(...dates);
          const userCreatedDate = new Date(u.createdAt).getTime();
          const span = Math.max(maxDate, userCreatedDate) - Math.min(minDate, userCreatedDate);

          if (span > 7 * 24 * 60 * 60 * 1000) {
            loyalUsers++;
          }
        }
      });

      // Personas mais usadas
      const personaMap: Record<string, number> = {};
      subsetThreads.forEach((t) => {
        personaMap[t.personaId] = (personaMap[t.personaId] || 0) + 1;
      });
      const personaUsage = Object.entries(personaMap)
        .map(([personaId, count]) => ({ personaId, _count: { id: count } }))
        .sort((a, b) => b._count.id - a._count.id)
        .slice(0, 20);

      // Atividade recente (50 últimas threads)
      const recentActivity = subsetThreads.slice(0, 50).map((t) => {
        const u = subsetUsers.find((usr) => usr.id === t.userId);
        return {
          id: t.id,
          personaId: t.personaId,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
          user: {
            name: u?.name || "Sem nome",
            email: u?.email || "—",
          },
          _count: {
            messages: t._count.messages,
          },
        };
      });

      // Atividade por dia (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activityByDay: Record<string, number> = {};

      subsetThreads.forEach((t) => {
        if (t.updatedAt >= thirtyDaysAgo) {
          const day = t.updatedAt.toISOString().split("T")[0];
          activityByDay[day] = (activityByDay[day] || 0) + t._count.messages;
        }
      });

      // Métricas extra sugeridas: Horários de Pico
      const hourMap: Record<number, number> = {};
      subsetThreads.forEach((t) => {
        const hour = new Date(t.createdAt).getHours();
        hourMap[hour] = (hourMap[hour] || 0) + t._count.messages;
      });
      const peakHourStr = Object.entries(hourMap).length > 0 
        ? Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0][0] + "h"
        : "—";

      return {
        totalUsers,
        totalThreads,
        totalMessages,
        avgMessagesPerThread,
        engagedUsers,
        loyalUsers,
        peakHour: peakHourStr,
        personaUsage,
        recentActivity,
        activityByDay,
        users: subsetUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          createdAt: u.createdAt.toISOString(),
          _count: u._count,
        })),
      };
    };

    // Global: Todas as informações juntas
    const globalMetrics = compileMetrics(users, allThreads);

    // Orgânica: Exclusão da conta do criador (edersouzamelo@gmail.com)
    const organicUsers = users.filter((u) => u.email !== "edersouzamelo@gmail.com");
    const organicThreads = allThreads.filter((t) => {
      const u = users.find((usr) => usr.id === t.userId);
      return u && u.email !== "edersouzamelo@gmail.com";
    });
    const organicMetrics = compileMetrics(organicUsers, organicThreads);

    // Criador: Apenas os seus dados de teste e autoanálise
    const creatorUsers = users.filter((u) => u.email === "edersouzamelo@gmail.com");
    const creatorThreads = allThreads.filter((t) => {
      const u = users.find((usr) => usr.id === t.userId);
      return u && u.email === "edersouzamelo@gmail.com";
    });
    const creatorMetrics = compileMetrics(creatorUsers, creatorThreads);

    return NextResponse.json({
      globalMetrics,
      organicMetrics,
      creatorMetrics,
      termsAcceptances: termsAcceptances.map((acceptance) => ({
        id: acceptance.id,
        termsVersion: acceptance.termsVersion,
        acceptedAt: acceptance.acceptedAt.toISOString(),
        ipApprox: acceptance.ipApprox,
        sessionRecord: acceptance.sessionRecord,
        userAgent: acceptance.userAgent,
        user: acceptance.user,
      })),
    });
  } catch (error) {
    console.error("Admin API error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
