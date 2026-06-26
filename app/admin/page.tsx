"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { isAdminEmail } from "../lib/accessControl";

interface AdminMetrics {
  totalUsers: number;
  totalThreads: number;
  totalMessages: number;
  avgMessagesPerThread: number;
  engagedUsers: number;
  loyalUsers: number;
  peakHour: string;
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

interface MultiScopedMetrics {
  globalMetrics: AdminMetrics;
  organicMetrics: AdminMetrics;
  creatorMetrics: AdminMetrics;
  termsAcceptances: Array<{
    id: string;
    termsVersion: string;
    acceptedAt: string;
    ipApprox: string | null;
    sessionRecord: string | null;
    userAgent: string | null;
    user: { name: string | null; email: string | null };
  }>;
}

type MetricScope = "organic" | "global" | "creator";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<MultiScopedMetrics | null>(null);
  const [activeScope, setActiveScope] = useState<MetricScope>("organic");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/access?callbackUrl=/admin");
      return;
    }
    if (status === "authenticated" && !isAdminEmail(session?.user?.email)) {
      router.push("/space");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/admin/metrics")
        .then((res) => {
          if (!res.ok) throw new Error("Acesso negado");
          return res.json();
        })
        .then(setData)
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

  if (!data) return null;

  // Seleciona a métrica ativa com base na aba escolhida
  const metricKeys: Record<MetricScope, "organicMetrics" | "globalMetrics" | "creatorMetrics"> = {
    organic: "organicMetrics",
    global: "globalMetrics",
    creator: "creatorMetrics",
  };
  const metrics = data[metricKeys[activeScope]];

  const maxPersonaCount = Math.max(
    ...metrics.personaUsage.map((p) => p._count.id),
    1
  );
  const activityEntries = Object.entries(metrics.activityByDay).sort(
    (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
  );
  const maxActivityCount = Math.max(...activityEntries.map(([, count]) => count), 1);

  return (
    <main className="nemosine-main-container relative min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[2px]"></div>
        <div className="nemosine-mental-castle-bg w-full h-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center"></div>
      </div>

      <Navbar />

      <section className="relative z-10 p-4 md:p-8 lg:p-12 max-w-[1400px] mx-auto">
        <header className="mb-10 text-center relative flex flex-col items-center justify-center">
          <h1 className="font-display text-4xl uppercase tracking-widest text-[#c5a059] mb-2 drop-shadow-[0_2px_10px_rgba(197,160,89,0.2)]">
            Painel do Criador
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/40 mb-6 font-bold">
            Monitoramento do Sistema Nemosine Nous
          </p>

          <button
            onClick={() => router.push("/developer/messages")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#c5a059]/25 to-[#c5a059]/10 hover:from-[#c5a059]/35 hover:to-[#c5a059]/20 border border-[#c5a059]/30 hover:border-[#c5a059]/60 rounded-xl text-[10px] text-[#fde68a] hover:text-white font-bold tracking-widest uppercase transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.4)] group cursor-pointer active:scale-95"
          >
            <span className="text-sm group-hover:scale-120 transition-transform duration-300">📬</span>
            Mensagens ao Desenvolvedor
          </button>
        </header>

        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => router.push("/admin/sala-de-maquinas")}
            className="w-full rounded-lg border border-[#4169e1]/35 bg-[#4169e1]/10 p-5 text-left shadow-lg transition-all hover:border-[#4169e1]/70 hover:bg-[#4169e1]/15"
          >
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#4169e1]/25 bg-black/25 text-blue-200">
              <span className="material-icons text-xl" aria-hidden="true">precision_manufacturing</span>
            </span>
            <span className="block font-display text-xl uppercase tracking-widest text-blue-200">
              Sala de Máquinas
            </span>
            <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
              Observabilidade do Runtime Cognitivo
            </span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin/observatorio-do-criador")}
            className="w-full rounded-lg border border-emerald-400/35 bg-emerald-500/10 p-5 text-left shadow-lg transition-all hover:border-emerald-300/70 hover:bg-emerald-500/15"
          >
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-400/25 bg-black/25 text-emerald-100">
              <span className="material-icons text-xl" aria-hidden="true">health_and_safety</span>
            </span>
            <span className="block font-display text-xl uppercase tracking-widest text-emerald-100">
              Observatório do Criador
            </span>
            <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
              Diagnóstico sanitário do sistema
            </span>
          </button>
        </div>

        {/* Tab Controls for Scoped Analytics */}
        <div className="flex border-b border-[#c5a059]/20 mb-10 max-w-3xl mx-auto justify-center gap-2 sm:gap-6 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveScope("organic")}
            className={`pb-3 text-[10px] uppercase tracking-widest font-bold transition-all px-4 cursor-pointer border-b-2 ${
              activeScope === "organic"
                ? "border-[#c5a059] text-[#c5a059] drop-shadow-[0_0_8px_rgba(197,160,89,0.3)]"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            👥 Métricas Orgânicas
          </button>
          <button
            type="button"
            onClick={() => setActiveScope("global")}
            className={`pb-3 text-[10px] uppercase tracking-widest font-bold transition-all px-4 cursor-pointer border-b-2 ${
              activeScope === "global"
                ? "border-[#c5a059] text-[#c5a059]"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            🌍 Métricas Globais
          </button>
          <button
            type="button"
            onClick={() => setActiveScope("creator")}
            className={`pb-3 text-[10px] uppercase tracking-widest font-bold transition-all px-4 cursor-pointer border-b-2 ${
              activeScope === "creator"
                ? "border-[#c5a059] text-[#c5a059]"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            🧪 Minhas Métricas (Testes)
          </button>
        </div>

        {/* Info Note about current filter scope */}
        <div className="max-w-md mx-auto text-center mb-8 px-4 py-2 rounded-lg bg-black/40 border border-[#c5a059]/15 backdrop-blur-sm">
          <p className="text-[10px] text-white/50 tracking-wider font-body">
            {activeScope === "organic" && "Exibindo comportamento dos usuários reais (exclui seu e-mail de testes edersouzamelo@gmail.com)"}
            {activeScope === "global" && "Exibindo dados gerais consolidados do sistema, incluindo suas sessões de teste e homologação"}
            {activeScope === "creator" && "Exibindo unicamente os dados de homologação da sua conta administradora (edersouzamelo@gmail.com)"}
          </p>
        </div>

        {/* Primary Row: Core Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <StatCard
            label="Usuários Registrados"
            value={metrics.totalUsers}
            icon="👤"
            subtitle="Total de contas únicas"
          />
          <StatCard
            label="Conversas Abertas"
            value={metrics.totalThreads}
            icon="💬"
            subtitle="Canais de chat ativos"
          />
          <StatCard
            label="Mensagens Totais"
            value={metrics.totalMessages}
            icon="📜"
            subtitle="Trocadas com personas"
          />
        </div>

        {/* Secondary Row: Advanced Engagement & Suggestions */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="Membros Engajados"
            value={metrics.engagedUsers}
            icon="🔥"
            subtitle="Retornaram >1 vez ou >5 msgs"
          />
          <StatCard
            label="Membros Fidelizados"
            value={metrics.loyalUsers}
            icon="💎"
            subtitle="Atividade superior a 7 dias"
          />
          <StatCard
            label="Profundidade Médica"
            value={metrics.avgMessagesPerThread}
            icon="📊"
            subtitle="Média de msgs por chat"
          />
          <StatCard
            label="Horário de Pico"
            value={metrics.peakHour}
            icon="⏰"
            subtitle="Maior volume de interações"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Personas Mais Usadas */}
          <div className="bg-black/40 border border-[#c5a059]/20 rounded-lg p-6 backdrop-blur-md">
            <h2 className="text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-6 flex items-center gap-2">
              <span>🔮</span> Personas Mais Consultadas
            </h2>
            <div className="space-y-3">
              {metrics.personaUsage.map((p) => (
                <div key={p.personaId} className="flex items-center gap-3">
                  <span className="text-xs text-white/70 w-36 truncate capitalize font-serif">
                    {p.personaId}
                  </span>
                  <div className="flex-1 h-4 bg-black/40 rounded-full overflow-hidden border border-[#c5a059]/10">
                    <div
                      className="h-full bg-gradient-to-r from-[#c5a059]/50 to-[#c5a059] rounded-full transition-all duration-700"
                      style={{
                        width: `${(p._count.id / maxPersonaCount) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-xs text-[#c5a059] font-bold w-8 text-right font-mono">
                    {p._count.id}
                  </span>
                </div>
              ))}
              {metrics.personaUsage.length === 0 && (
                <p className="text-white/30 text-xs italic py-4">
                  Nenhuma persona foi consultada ainda.
                </p>
              )}
            </div>
          </div>

          {/* Usuários Registrados */}
          <div className="bg-black/40 border border-[#c5a059]/20 rounded-lg p-6 backdrop-blur-md">
            <h2 className="text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-6 flex items-center gap-2">
              <span>👤</span> Relatório de Usuários
            </h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#c5a059]/25 pr-1">
              {metrics.users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-black/35 rounded border border-[#c5a059]/10 hover:border-[#c5a059]/25 transition-all duration-200"
                >
                  <div>
                    <p className="text-xs text-white/90 font-serif flex items-center gap-1.5">
                      {u.name || "Sem nome"}
                      {u.email === "edersouzamelo@gmail.com" && (
                        <span className="text-[7px] uppercase tracking-widest bg-[#c5a059]/20 text-[#c5a059] px-1 rounded border border-[#c5a059]/30 font-bold">
                          Você
                        </span>
                      )}
                    </p>
                    <p className="text-[9px] text-white/40 font-mono">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-[#c5a059]/75 font-mono">
                      {u._count.threads} convs · {u._count.memories} mems
                    </p>
                    <p className="text-[9px] text-white/30 mt-0.5">
                      Cadastrado em {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
              {metrics.users.length === 0 && (
                <p className="text-white/30 text-xs italic py-4 text-center">
                  Nenhum usuário correspondente neste escopo.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Atividade por Dia */}
        {activityEntries.length > 0 && (
          <div className="bg-black/40 border border-[#c5a059]/20 rounded-lg p-6 backdrop-blur-md mb-10">
            <h2 className="text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-6 flex items-center gap-2">
              <span>📈</span> Volume de Mensagens nos Últimos 30 Dias
            </h2>
            <div className="flex items-end gap-1.5 h-36 pt-4">
              {activityEntries.map(([day, count]) => {
                const height = (count / maxActivityCount) * 100;
                return (
                  <div
                    key={day}
                    className="flex-1 h-full flex flex-col items-center justify-end gap-1 group relative"
                  >
                    {/* Tooltip on Hover */}
                    <span className="absolute bottom-full mb-1 scale-0 group-hover:scale-100 bg-[#16161a] border border-[#c5a059]/30 text-[#fde68a] text-[8px] font-mono rounded px-1.5 py-0.5 whitespace-nowrap z-20 shadow-md transition-all duration-200">
                      {count} msgs ({new Date(day + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })})
                    </span>
                    <div className="w-full h-24 flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-[#c5a059]/30 to-[#c5a059] rounded-t transition-all duration-500 hover:brightness-110 hover:shadow-[0_0_8px_rgba(197,160,89,0.3)] cursor-pointer"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      ></div>
                    </div>
                    <span className="text-[7px] text-white/30 -rotate-45 origin-top-left whitespace-nowrap mt-1 select-none font-mono">
                      {day.slice(8)}/{day.slice(5, 7)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Registros de Consentimento */}
        <div className="bg-black/40 border border-[#c5a059]/20 rounded-lg p-6 backdrop-blur-md mb-10">
          <h2 className="text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-6 flex items-center gap-2">
            <span>Termos</span> Registros de Consentimento
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] uppercase tracking-widest text-[#c5a059]/60 border-b border-[#c5a059]/15">
                  <th className="p-2">Usuário</th>
                  <th className="p-2">Versão</th>
                  <th className="p-2">IP aproximado</th>
                  <th className="p-2">Sessão</th>
                  <th className="p-2 text-right">Aceite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5a059]/5">
                {data.termsAcceptances.map((acceptance) => (
                  <tr key={acceptance.id} className="hover:bg-[#c5a059]/5 transition-colors duration-150">
                    <td className="p-2.5 text-white/70 text-xs font-body">
                      <div className="flex flex-col">
                        <span className="font-medium text-white/95">{acceptance.user.name || "Sem nome"}</span>
                        <span className="text-[9px] text-white/40 font-mono">{acceptance.user.email || "sem email"}</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-[#c5a059]/80 text-xs font-mono">
                      {acceptance.termsVersion}
                    </td>
                    <td className="p-2.5 text-white/50 text-[10px] font-mono">
                      {acceptance.ipApprox || "nao informado"}
                    </td>
                    <td className="p-2.5 text-white/40 text-[10px] font-mono max-w-[220px] truncate" title={acceptance.sessionRecord || acceptance.userAgent || ""}>
                      {acceptance.sessionRecord || acceptance.userAgent || "nao informado"}
                    </td>
                    <td className="p-2.5 text-right text-white/45 text-[10px] font-mono">
                      {new Date(acceptance.acceptedAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
                {data.termsAcceptances.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-white/30 text-xs italic p-8">
                      Nenhum aceite de termos registrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Atividade Recente */}
        <div className="bg-black/40 border border-[#c5a059]/20 rounded-lg p-6 backdrop-blur-md">
          <h2 className="text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-6 flex items-center gap-2">
            <span>⌛</span> Registro de Atividade Recente
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] uppercase tracking-widest text-[#c5a059]/60 border-b border-[#c5a059]/15">
                  <th className="p-2">Usuário</th>
                  <th className="p-2">Persona</th>
                  <th className="p-2 text-center">Mensagens</th>
                  <th className="p-2 text-right">Última Atividade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5a059]/5">
                {metrics.recentActivity.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-[#c5a059]/5 transition-colors duration-150"
                  >
                    <td className="p-2.5 text-white/70 text-xs font-body">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-white/95">
                          {a.user.name || "Sem nome"}
                        </span>
                        <span className="text-[9px] text-white/40 font-mono">({a.user.email})</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-[#c5a059]/80 text-xs capitalize font-serif">
                      {a.personaId}
                    </td>
                    <td className="p-2.5 text-center text-[#c5a059]/75 text-xs font-mono">
                      {a._count.messages}
                    </td>
                    <td className="p-2.5 text-right text-white/40 text-[9px] font-mono">
                      {new Date(a.updatedAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
                {metrics.recentActivity.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center text-white/30 text-xs italic p-8"
                    >
                      Nenhuma atividade recente registrada neste escopo.
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

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  subtitle?: string;
}

function StatCard({ label, value, icon, subtitle }: StatCardProps) {
  return (
    <div className="bg-black/40 border border-[#c5a059]/20 rounded-xl p-5 backdrop-blur-md flex items-center gap-4 hover:border-[#c5a059]/50 transition-all duration-300 hover:translate-y-[-2px] shadow-lg group">
      <span className="text-3xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-300 select-none">
        {icon}
      </span>
      <div>
        <p className="text-2xl font-serif text-[#c5a059] font-extrabold tracking-wide drop-shadow-[0_0_8px_rgba(197,160,89,0.15)] font-mono">
          {value}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-white/80 font-bold mt-0.5">
          {label}
        </p>
        {subtitle && (
          <p className="text-[8px] uppercase tracking-wider text-white/30 mt-0.5 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
