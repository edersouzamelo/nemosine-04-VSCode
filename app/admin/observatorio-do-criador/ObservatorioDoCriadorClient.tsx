"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/app/components/Navbar";
import { isAdminEmail } from "@/app/lib/accessControl";

type DiagnosticStatus = "healthy" | "warning" | "critical" | "unknown";

type DiagnosticCheck = {
  id: string;
  label: string;
  status: DiagnosticStatus;
  summary: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
  remediation?: string;
};

type DiagnosticSection = {
  id: string;
  title: string;
  status: DiagnosticStatus;
  summary: string;
  checks: DiagnosticCheck[];
};

type CreatorObservatoryReport = {
  reportId: string;
  generatedAt: string;
  generatedBy: string | null;
  overallStatus: DiagnosticStatus;
  app: {
    name: string;
    version: string;
    nodeEnv: string;
    vercelEnv: string | null;
    commitSha: string | null;
  };
  sections: DiagnosticSection[];
  preventiveActions: string[];
  correctiveActions: string[];
  incidentTaxonomy: Array<{
    code: string;
    label: string;
    firstResponse: string;
  }>;
};

const statusCopy: Record<DiagnosticStatus, string> = {
  healthy: "saudável",
  warning: "atenção",
  critical: "crítico",
  unknown: "indeterminado",
};

const statusIcon: Record<DiagnosticStatus, string> = {
  healthy: "check_circle",
  warning: "warning",
  critical: "error",
  unknown: "help",
};

function statusClass(status: DiagnosticStatus) {
  if (status === "healthy") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  if (status === "warning") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  if (status === "critical") return "border-red-400/30 bg-red-500/10 text-red-100";
  return "border-white/20 bg-white/5 text-white/65";
}

function compactDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function StatusBadge({ status }: { status: DiagnosticStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(status)}`}>
      <span className="material-icons text-xs" aria-hidden="true">{statusIcon[status]}</span>
      {statusCopy[status]}
    </span>
  );
}

function DetailPreview({ details }: { details?: Record<string, unknown> }) {
  const preview = useMemo(() => {
    if (!details) return "";
    return JSON.stringify(details, null, 2);
  }, [details]);

  if (!preview) return null;

  return (
    <details className="mt-3 rounded border border-white/10 bg-black/35 p-3">
      <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-white/45">
        Ver detalhes técnicos
      </summary>
      <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed text-white/50">
        {preview}
      </pre>
    </details>
  );
}

function SectionPanel({ section }: { section: DiagnosticSection }) {
  return (
    <section className="rounded-lg border border-[#c5a059]/18 bg-black/45 p-5 backdrop-blur-md">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-xl text-[#fde68a]">{section.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/50">{section.summary}</p>
        </div>
        <StatusBadge status={section.status} />
      </div>

      <div className="space-y-3">
        {section.checks.map((check) => (
          <article key={check.id} className="rounded-lg border border-white/10 bg-black/30 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-white/85">{check.label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/55">{check.summary}</p>
              </div>
              <StatusBadge status={check.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-white/35">
              {typeof check.latencyMs === "number" && <span>{check.latencyMs}ms</span>}
              <span>{check.id}</span>
            </div>
            {check.remediation && (
              <p className="mt-3 rounded border border-[#c5a059]/15 bg-[#c5a059]/8 p-3 text-xs leading-relaxed text-[#fde68a]/75">
                {check.remediation}
              </p>
            )}
            <DetailPreview details={check.details} />
          </article>
        ))}
      </div>
    </section>
  );
}

function ActionList({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-[#c5a059]/18 bg-black/45 p-5 backdrop-blur-md">
      <h2 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c5a059]">
        <span className="material-icons text-sm" aria-hidden="true">{icon}</span>
        {title}
      </h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="rounded border border-white/10 bg-black/25 p-3 text-xs leading-relaxed text-white/65">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ObservatorioDoCriadorClient() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [report, setReport] = useState<CreatorObservatoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/admin/creator-observatory", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.diagnostic || body?.error || "Falha ao gerar diagnóstico.");
        return body as CreatorObservatoryReport;
      })
      .then(setReport)
      .catch((caught) => setError(caught.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/access?callbackUrl=/admin/observatorio-do-criador");
      return;
    }
    if (status === "authenticated" && !isAdminEmail(session?.user?.email)) {
      router.push("/space");
      return;
    }
    if (status === "authenticated") fetchReport();
  }, [fetchReport, router, session?.user?.email, status]);

  const statusCounts = useMemo(() => {
    const counts: Record<DiagnosticStatus, number> = {
      healthy: 0,
      warning: 0,
      critical: 0,
      unknown: 0,
    };
    report?.sections.forEach((section) => {
      section.checks.forEach((check) => {
        counts[check.status] += 1;
      });
    });
    return counts;
  }, [report]);

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-[#050507] text-[#e1e1e6]">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center text-[10px] font-bold uppercase tracking-[0.28em] text-[#c5a059]">
          Gerando diagnóstico sanitário...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#050507] text-[#e1e1e6]">
        <Navbar />
        <section className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
          <span className="material-icons text-5xl text-red-300" aria-hidden="true">error</span>
          <h1 className="font-serif text-3xl text-red-100">Falha no Observatório</h1>
          <p className="text-sm text-white/55">{error}</p>
          <button
            type="button"
            onClick={fetchReport}
            className="rounded-lg border border-[#c5a059]/35 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#fde68a] hover:bg-[#c5a059]/10"
          >
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }

  if (!report) return null;

  return (
    <main className="nemosine-main-container relative min-h-screen text-[#e1e1e6]">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 z-10 bg-[#050507]/84 backdrop-blur-[2px]" />
        <div className="h-full w-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center" />
      </div>
      <Navbar />

      <section className="relative z-10 mx-auto max-w-[1500px] px-4 py-8 md:px-8 lg:px-12">
        <header className="mb-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c5a059]/65">
                <span className="material-icons text-sm" aria-hidden="true">health_and_safety</span>
                Diagnóstico Sanitário Geral
              </p>
              <h1 className="font-display text-4xl uppercase tracking-widest text-[#c5a059] md:text-5xl">
                Observatório do Criador
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/55">
                Relatório operacional de banco, domínio, APIs, Vercel e continuidade do persona.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/admin/sala-de-maquinas")}
                className="inline-flex items-center gap-2 rounded-lg border border-[#4169e1]/35 bg-[#4169e1]/10 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-blue-100 hover:bg-[#4169e1]/15"
              >
                <span className="material-icons text-sm" aria-hidden="true">precision_manufacturing</span>
                Sala de Máquinas
              </button>
              <button
                type="button"
                onClick={fetchReport}
                className="inline-flex items-center gap-2 rounded-lg border border-[#c5a059]/35 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#fde68a] hover:bg-[#c5a059]/10"
              >
                <span className="material-icons text-sm" aria-hidden="true">refresh</span>
                Atualizar
              </button>
              <a
                href="/api/admin/creator-observatory?format=json&download=1"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-emerald-100 hover:bg-emerald-500/15"
              >
                <span className="material-icons text-sm" aria-hidden="true">data_object</span>
                Baixar JSON
              </a>
              <a
                href="/api/admin/creator-observatory?format=markdown"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-emerald-100 hover:bg-emerald-500/15"
              >
                <span className="material-icons text-sm" aria-hidden="true">download</span>
                Baixar Markdown
              </a>
            </div>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className={`rounded-lg border p-5 backdrop-blur-md xl:col-span-2 ${statusClass(report.overallStatus)}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] opacity-70">Status geral</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="material-icons text-3xl" aria-hidden="true">{statusIcon[report.overallStatus]}</span>
              <p className="font-serif text-3xl capitalize">{statusCopy[report.overallStatus]}</p>
            </div>
          </div>
          <MetricCard label="Saudáveis" value={statusCounts.healthy} icon="check_circle" />
          <MetricCard label="Atenção" value={statusCounts.warning} icon="warning" />
          <MetricCard label="Críticos" value={statusCounts.critical} icon="error" />
          <MetricCard label="Indeterminados" value={statusCounts.unknown} icon="help" />
        </section>

        <section className="mb-6 rounded-lg border border-[#c5a059]/18 bg-black/45 p-5 backdrop-blur-md">
          <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
            <KeyValue label="Relatório" value={report.reportId} mono />
            <KeyValue label="Gerado em" value={compactDate(report.generatedAt)} />
            <KeyValue label="Aplicação" value={`${report.app.name} ${report.app.version}`} />
            <KeyValue label="Ambiente" value={`${report.app.nodeEnv}${report.app.vercelEnv ? ` / ${report.app.vercelEnv}` : ""}`} />
          </dl>
        </section>

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ActionList title="Medidas Preventivas" icon="shield" items={report.preventiveActions} />
          <ActionList title="Medidas Corretivas" icon="build" items={report.correctiveActions} />
        </div>

        <section className="mb-6 rounded-lg border border-[#c5a059]/18 bg-black/45 p-5 backdrop-blur-md">
          <h2 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c5a059]">
            <span className="material-icons text-sm" aria-hidden="true">report</span>
            Taxonomia de Incidentes
          </h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {report.incidentTaxonomy.map((item) => (
              <article key={item.code} className="rounded-lg border border-white/10 bg-black/25 p-4">
                <h3 className="font-mono text-xs font-bold text-[#fde68a]">{item.code}</h3>
                <p className="mt-2 text-xs text-white/65">{item.label}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-white/40">{item.firstResponse}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {report.sections.map((section) => (
            <SectionPanel key={section.id} section={section} />
          ))}
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <section className="rounded-lg border border-[#c5a059]/18 bg-black/45 p-5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <span className="material-icons text-2xl text-[#c5a059]" aria-hidden="true">{icon}</span>
        <div>
          <p className="font-mono text-3xl font-bold text-[#fde68a]">{value}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">{label}</p>
        </div>
      </div>
    </section>
  );
}

function KeyValue({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">{label}</dt>
      <dd className={`mt-1 break-words text-white/75 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
