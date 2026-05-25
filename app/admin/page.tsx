"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";

interface AdminMetrics {
  totalUsers: number;
  totalThreads: number;
  totalMessages: number;
  users: Array<{
    id: string;
    name: string | null;
    email: string | null;
    createdAt: string;
    _count: { threads: number; memories: number };
  }>;
  personaUsage: Array<{
    personaId: string;
    _count: { id: number };
  }>;
  recentActivity: Array<{
    id: string;
    personaId: string;
    createdAt: string;
    updatedAt: string;
    user: { name: string | null; email: string | null };
    _count: { messages: number };
  }>;
  activityByDay: Record<string, number>;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/admin/metrics")
        .then((res) => {
          if (!res.ok) throw new Error("Acesso negado");
          return res.json();
        })
        .then(setMetrics)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-[#050507] text-[#e1e1e6] flex items-center justify-center">
        <div className="text-[#c5a059] animate-pulse text-lg uppercase tracking-widest font-serif">
          Carregando dados do sistema...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#050507] text-[#e1e1e6] flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl text-red-400 font-serif">Acesso Negado</h1>
        <p className="text-white/40 text-sm">
          Apenas o Criador pode acessar este painel.
        </p>
      </main>
    );
  }

  if (!metrics) return null;

  const maxPersonaCount = Math.max(
    ...metrics.personaUsage.map((p) => p._count.id),
    1
  );
  const activityEntries = Object.entries(metrics.activityByDay);
  const maxActivityCount = Math.max(...activityEntries.map(([, count]) => count), 1);

  return (
    <main className="relative min-h-screen bg-[#050507] text-[#e1e1e6]">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-black/60 z-10 backdrop-blur-[2px]"></div>
        <div className="w-full h-full bg-[#0a0a0c] bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center opacity-30 mix-blend-luminosity"></div>
      </div>

      <Navbar />

      <section className="relative z-10 p-4 md:p-8 lg:p-12 max-w-[1400px] mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-serif text-[#c5a059] uppercase tracking-tight">
            Painel do Criador
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/40 mt-1">
            Monitoramento do Sistema Nemosine Nous
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <StatCard
            label="Usuários Registrados"
            value={metrics.totalUsers}
            icon="👤"
          />
          <StatCard
            label="Conversas Abertas"
            value={metrics.totalThreads}
            icon="💬"
          />
          <StatCard
            label="Mensagens Totais"
            value={metrics.totalMessages}
            icon="📜"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Personas Mais Usadas */}
          <div className="bg-black/40 border border-[#c5a059]/20 rounded-lg p-6 backdrop-blur-md">
            <h2 className="text-sm uppercase tracking-widest text-[#c5a059] font-bold mb-6">
              Personas Mais Consultadas
            </h2>
            <div className="space-y-3">
              {metrics.personaUsage.map((p) => (
                <div key={p.personaId} className="flex items-center gap-3">
                  <span className="text-xs text-white/70 w-36 truncate capitalize font-serif">
                    {p.personaId}
                  </span>
                  <div className="flex-1 h-5 bg-black/40 rounded-full overflow-hidden border border-[#c5a059]/10">
                    <div
                      className="h-full bg-gradient-to-r from-[#c5a059]/60 to-[#c5a059] rounded-full transition-all duration-700"
                      style={{
                        width: `${(p._count.id / maxPersonaCount) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-xs text-[#c5a059] font-bold w-8 text-right">
                    {p._count.id}
                  </span>
                </div>
              ))}
              {metrics.personaUsage.length === 0 && (
                <p className="text-white/30 text-sm italic">
                  Nenhuma persona foi consultada ainda.
                </p>
              )}
            </div>
          </div>

          {/* Usuários Registrados */}
          <div className="bg-black/40 border border-[#c5a059]/20 rounded-lg p-6 backdrop-blur-md">
            <h2 className="text-sm uppercase tracking-widest text-[#c5a059] font-bold mb-6">
              Usuários Registrados
            </h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#c5a059]/20">
              {metrics.users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-black/30 rounded border border-[#c5a059]/10"
                >
                  <div>
                    <p className="text-sm text-white/90 font-serif">
                      {u.name || "Sem nome"}
                    </p>
                    <p className="text-[10px] text-white/40">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#c5a059]/60">
                      {u._count.threads} conversas · {u._count.memories}{" "}
                      memórias
                    </p>
                    <p className="text-[10px] text-white/30">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Atividade por Dia */}
        {activityEntries.length > 0 && (
          <div className="bg-black/40 border border-[#c5a059]/20 rounded-lg p-6 backdrop-blur-md mb-10">
            <h2 className="text-sm uppercase tracking-widest text-[#c5a059] font-bold mb-6">
              Atividade dos Últimos 30 Dias
            </h2>
            <div className="flex items-end gap-1 h-32">
              {activityEntries.map(([day, count]) => {
                const height = (count / maxActivityCount) * 100;
                return (
                  <div
                    key={day}
                    className="flex-1 h-full flex flex-col items-center justify-end gap-1 group"
                  >
                    <span className="text-[8px] text-[#c5a059] opacity-0 group-hover:opacity-100 transition-opacity">
                      {count}
                    </span>
                    <div className="w-full h-24 flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-[#c5a059]/40 to-[#c5a059] rounded-t transition-all duration-500 hover:from-[#c5a059]/60"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${day}: ${count} msgs`}
                      ></div>
                    </div>
                    <span className="text-[7px] text-white/20 -rotate-45 origin-top-left whitespace-nowrap">
                      {day.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Atividade Recente */}
        <div className="bg-black/40 border border-[#c5a059]/20 rounded-lg p-6 backdrop-blur-md">
          <h2 className="text-sm uppercase tracking-widest text-[#c5a059] font-bold mb-6">
            Atividade Recente
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-[#c5a059]/60 border-b border-[#c5a059]/10">
                  <th className="text-left p-2">Usuário</th>
                  <th className="text-left p-2">Persona</th>
                  <th className="text-center p-2">Msgs</th>
                  <th className="text-right p-2">Última Atividade</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentActivity.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-[#c5a059]/5 hover:bg-[#c5a059]/5 transition-colors"
                  >
                    <td className="p-2 text-white/70 text-xs">
                      {a.user.name || a.user.email || "—"}
                    </td>
                    <td className="p-2 text-[#c5a059]/80 text-xs capitalize font-serif">
                      {a.personaId}
                    </td>
                    <td className="p-2 text-center text-[#c5a059]/60 text-xs">
                      {a._count.messages}
                    </td>
                    <td className="p-2 text-right text-white/30 text-[10px]">
                      {new Date(a.updatedAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
                {metrics.recentActivity.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center text-white/30 text-sm italic p-6"
                    >
                      Nenhuma atividade registrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="bg-black/40 border border-[#c5a059]/20 rounded-lg p-6 backdrop-blur-md flex items-center gap-4 hover:border-[#c5a059]/40 transition-colors">
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="text-3xl font-serif text-[#c5a059] font-bold">{value}</p>
        <p className="text-[10px] uppercase tracking-widest text-white/40">
          {label}
        </p>
      </div>
    </div>
  );
}
