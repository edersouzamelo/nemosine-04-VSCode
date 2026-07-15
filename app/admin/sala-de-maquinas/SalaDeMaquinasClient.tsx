"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import {
  buildRunNarrative,
  coherenceTooltip,
  contextualBadges,
  creatorFlowSteps,
  deliveryLabel,
  describeFindingCode,
  doubleVigilanceMessage,
  emptyStateCopy,
  executionProfileLabel,
  formatCoherence,
  formatDuration,
  formatPercent,
  formatScore,
  formatThreshold,
  insufficientDoubleVigilanceTelemetry,
  isLegacyShadowObservation,
  legacyShadowWarning,
  metricExplanations,
  promotionLabel,
  rowDetailUrl,
  runtimeModeLabel,
  sideEffectLabel,
  statusClass,
  tableColumnGuide,
  thresholdTooltip,
  transitionLabel,
} from "@/app/lib/admin/cognitiveRunsUi";

type MetricProvenance = {
  field: string;
  calculation: string;
  denominator: number | string | null;
  validRecords: number;
  limitations: string[];
};

type Summary = {
  hasData: boolean;
  totalRuns: number;
  governedDecisionDenominator: number;
  shadowOnlyCount: number;
  promotionRate: number | null;
  rejectionRate: number | null;
  failedSafeRate: number | null;
  recoveryRate: number | null;
  averageCoherence: number | null;
  averageCoherenceValidCount: number;
  medianCoherence: number | null;
  averageIterations: number | null;
  cognitiveExecutionCount: number;
  retryRate: number | null;
  averageLatencyMs: number | null;
  latency?: {
    averageTotalMs: number | null;
    averageRuntimeMs: number | null;
    averageLegacyRouteMs: number | null;
    stageAveragesMs: Record<string, number | null>;
  };
  executionProfileDistribution: Record<string, number>;
  runtimeModeDistribution: Record<string, number>;
  deliveryPersistenceFailureCount: number;
  auditPersistenceFailureCount: number;
  optionalEffectBlockedCount: number;
  optionalEffectRollbackCount: number;
  privateRunCount: number;
  aggregation?: {
    jsonSampleLimit: number;
    note: string;
  };
  provenance?: Record<string, MetricProvenance>;
};

type RunRow = {
  runId: string;
  createdAt: string;
  completedAt: string;
  personaId: string;
  placeId: string | null;
  runtimeMode: string;
  executionProfile: string;
  coherence: number | null;
  coherenceThreshold: number | null;
  iterationCount: number;
  promotionDecision: string;
  deliveryStatus: string;
  sideEffectStatus: string;
  privateRun: boolean;
  metadataOnly: boolean;
  latencyMs: number | null;
  latency?: {
    totalMs: number | null;
    runtimeMs: number | null;
    legacyRouteMs: number | null;
    stageLatencyMs: Record<string, number>;
  };
  retryRequested: boolean;
  findingCodes: string[];
  recoveryDelivered?: boolean;
  dominantCause?: string | null;
  infrastructureDegraded?: boolean;
  blockingCategory?: string | null;
};

type ListResponse = {
  summary: Summary;
  rows: RunRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  activeFilters: Record<string, string | number | boolean>;
};

type RuntimeConfig = {
  runtimeMode: string;
  defaultProfile: string;
  coherenceThreshold: number;
  maxRetries: number;
  maxTotalCandidates: number;
  doubleVigilance: boolean;
  auditEnabled: boolean;
  generationModel: string;
  generationTemperature: number;
  structuredEvaluatorTemperature: number;
  coherenceWeights: Record<string, number>;
  runtimeVersion: string;
  deployVersion: string | null;
  sources: Record<string, string>;
  limitations: string[];
};

type CognitiveFoundationAdminResponse = {
  config: {
    userGraphMode: string;
    memoryExtractorMode: string;
    depthGateMode: string;
    personaProjectionMode: string;
    onboardingV2Mode: string;
    webEnrichmentMode: string;
    sources: Record<string, string>;
  };
  summary: {
    migrationReady: boolean;
    rows: Array<{
      feature: string;
      eventType: string;
      status: string;
      count: number;
    }>;
  };
  privacy: {
    rawPromptsReturned: boolean;
    rawMessagesReturned: boolean;
    confessorContentReturned: boolean;
    metadataOnly: boolean;
  };
};

type PdfDownloadState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  code?: string;
};

const initialPdfDownloadState: PdfDownloadState = { status: "idle", message: "" };

function filenameFromDisposition(disposition: string | null, fallback: string) {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
}

async function downloadPdfFromApi(url: string, fallbackFilename: string) {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.toLowerCase().includes("application/pdf")) {
    let body: any = null;
    if (contentType.toLowerCase().includes("application/json")) {
      body = await response.json().catch(() => null);
    }
    const error = new Error(body?.error || "Nao foi possivel gerar o PDF. A falha foi registrada e nenhum arquivo corrompido foi baixado.") as Error & { code?: string };
    error.code = body?.code || `HTTP_${response.status}`;
    throw error;
  }
  const blob = await response.blob();
  if (blob.size <= 0) {
    const error = new Error("Nao foi possivel gerar o PDF. A falha foi registrada e nenhum arquivo corrompido foi baixado.") as Error & { code?: string };
    error.code = "PDF_EMPTY_BLOB";
    throw error;
  }
  const filename = filenameFromDisposition(response.headers.get("content-disposition"), fallbackFilename);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return { filename, size: blob.size };
}

const modeOptions = ["", "shadow", "enforce"];
const profileOptions = ["", "light", "standard", "full"];
const decisionOptions = ["", "promoted", "rejected", "failed_safe", "recovery_delivered", "shadow_only"];
const deliveryOptions = ["", "not_attempted", "persisted", "failed", "shadow_external"];
const sideEffectOptions = ["", "none", "skipped", "blocked", "committed", "failed_rolled_back"];
const privateOptions = ["", "true", "false"];

function dateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function compactNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "sem dados";
  return value.toFixed(value >= 10 ? 0 : 1);
}

function formatBoolean(value: boolean | null | undefined) {
  if (value === true) return "ativada";
  if (value === false) return "desativada";
  return "nao informado";
}

function destinyStatusLabel(value: unknown) {
  if (value === "NOT_TRIGGERED") return "Nao acionado";
  if (value === "OK") return "OK";
  if (value === "EMPTY") return "Sem eventos";
  if (value === "ERROR") return "Erro";
  return "nao registrado";
}

function DistributionBars({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values);
  const max = Math.max(...entries.map(([, count]) => count), 1);
  const labelFor = (label: string) => {
    if (/Runtime/i.test(title)) return runtimeModeLabel(label);
    if (/Perfil|Execucao/i.test(title)) return executionProfileLabel(label);
    return label;
  };
  return (
    <section className="rounded-lg border border-[#c5a059]/20 bg-black/45 p-5 backdrop-blur-md" aria-label={title}>
      <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c5a059]">{title}</h2>
      <div className="space-y-3">
        {entries.length === 0 && <p className="text-xs text-white/35">Sem dados para este recorte.</p>}
        {entries.map(([label, count]) => (
          <div key={label} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3">
            <span className="truncate text-[10px] uppercase tracking-wider text-white/65" title={label}>{labelFor(label)}</span>
            <div className="h-3 overflow-hidden rounded-full border border-[#c5a059]/10 bg-black/45" aria-hidden="true">
              <div className="h-full rounded-full bg-[#c5a059]/75" style={{ width: `${Math.max(4, (count / max) * 100)}%` }} />
            </div>
            <span className="text-right font-mono text-[10px] text-[#fde68a]">{count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusPill({ value, label, title }: { value: string; label: string; title?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(value)}`}
      title={title}
    >
      <span className="material-icons text-xs" aria-hidden="true">
        {statusClass(value).includes("emerald") ? "check_circle" : statusClass(value).includes("red") ? "error" : statusClass(value).includes("amber") ? "warning" : "radio_button_checked"}
      </span>
      {label}
    </span>
  );
}

function ContextBadges({ run }: { run: RunRow | any }) {
  const badges = contextualBadges(run);
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <StatusPill key={badge.label} value={badge.value} label={badge.label} title={badge.explanation} />
      ))}
    </div>
  );
}

function CognitiveFoundationPanel({ data, loading }: { data: CognitiveFoundationAdminResponse | null; loading: boolean }) {
  const flags = data ? [
    ["User Graph", data.config.userGraphMode],
    ["Extrator", data.config.memoryExtractorMode],
    ["Depth Gate", data.config.depthGateMode],
    ["Projecao", data.config.personaProjectionMode],
    ["Onboarding V2", data.config.onboardingV2Mode],
    ["Web Enrichment", data.config.webEnrichmentMode],
  ] : [];
  const totalEvents = data?.summary.rows.reduce((sum, row) => sum + row.count, 0) ?? 0;
  const attentionEvents = data?.summary.rows
    .filter((row) => row.status !== "ok")
    .reduce((sum, row) => sum + row.count, 0) ?? 0;

  return (
    <section className="mb-6 rounded-lg border border-[#c5a059]/20 bg-black/45 p-5 backdrop-blur-md" aria-label="Fundacao cognitiva">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c5a059]/70">Fundacao cognitiva</p>
          <h2 className="mt-1 font-serif text-xl text-[#fde68a]">User Graph, projecoes e Depth Gate</h2>
        </div>
        <StatusPill
          value={data?.summary.migrationReady ? "persisted" : "warning"}
          label={loading ? "carregando" : data?.summary.migrationReady ? "migration pronta" : "migration pendente"}
        />
      </div>

      {loading && <p className="text-xs uppercase tracking-[0.2em] text-[#c5a059]/70">Carregando fundacao...</p>}
      {!loading && !data && <WarningBanner>Fundacao cognitiva indisponivel para este usuario ou ambiente.</WarningBanner>}
      {!loading && data && (
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {flags.map(([label, value]) => (
              <div key={label} className="rounded border border-[#c5a059]/10 bg-black/35 p-3">
                <dt className="text-[10px] uppercase tracking-widest text-white/35">{label}</dt>
                <dd className="mt-1 font-mono text-sm text-[#fde68a]">{value}</dd>
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded border border-[#c5a059]/10 bg-black/35 p-3">
              <dt className="text-[10px] uppercase tracking-widest text-white/35">Eventos</dt>
              <dd className="mt-1 font-mono text-sm text-[#fde68a]">{totalEvents}</dd>
            </div>
            <div className="rounded border border-[#c5a059]/10 bg-black/35 p-3">
              <dt className="text-[10px] uppercase tracking-widest text-white/35">Atencao</dt>
              <dd className="mt-1 font-mono text-sm text-amber-100">{attentionEvents}</dd>
            </div>
            <div className="rounded border border-[#c5a059]/10 bg-black/35 p-3">
              <dt className="text-[10px] uppercase tracking-widest text-white/35">Privacidade</dt>
              <dd className="mt-1 font-mono text-sm text-emerald-100">{data.privacy.metadataOnly ? "metadata-only" : "revisar"}</dd>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function WarningBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-400/35 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
      {children}
    </div>
  );
}

function EmptyState({ kind }: { kind: "no-audits" | "no-results" | "diagnostic" }) {
  const copy = emptyStateCopy(kind);
  return (
    <div className="rounded-lg border border-[#c5a059]/20 bg-black/55 p-10 text-center backdrop-blur-md" role="status">
      <span className="material-icons mb-3 text-4xl text-[#c5a059]/70" aria-hidden="true">
        precision_manufacturing
      </span>
      <h2 className="font-serif text-2xl text-[#fde68a]">{copy.title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-white/55">{copy.body}</p>
    </div>
  );
}

function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const optionLabel = (option: string) => {
    if (!option) return "todos";
    if (label === "Modo") return runtimeModeLabel(option);
    if (label === "Perfil") return executionProfileLabel(option);
    if (label === "Decisao") return promotionLabel(option);
    if (label === "Entrega") return deliveryLabel(option);
    if (label === "Efeitos") return sideEffectLabel(option);
    if (label === "Privacidade") return option === "true" ? "privadas" : "publicas";
    return option;
  };
  return (
    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-widest text-[#c5a059]/70">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border border-[#c5a059]/25 bg-black/70 px-3 py-2 text-xs text-white outline-none focus:border-[#c5a059]"
      >
        {options.map((option) => (
          <option key={option || "all"} value={option}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextFilter({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-widest text-[#c5a059]/70">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border border-[#c5a059]/25 bg-black/70 px-3 py-2 text-xs text-white outline-none focus:border-[#c5a059]"
      />
    </label>
  );
}

export default function SalaDeMaquinasClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [data, setData] = useState<ListResponse | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);
  const [foundationData, setFoundationData] = useState<CognitiveFoundationAdminResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [foundationLoading, setFoundationLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTab, setGuideTab] = useState<"creator" | "technical">("creator");
  const [pagePdfState, setPagePdfState] = useState<PdfDownloadState>(initialPdfDownloadState);
  const [allPdfState, setAllPdfState] = useState<PdfDownloadState>(initialPdfDownloadState);
  const topTableScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const syncingScrollRef = useRef(false);

  const filters = useMemo(() => {
    return {
      dateFrom: searchParams.get("dateFrom") || "",
      dateTo: searchParams.get("dateTo") || "",
      personaId: searchParams.get("personaId") || "",
      placeId: searchParams.get("placeId") || "",
      runtimeMode: searchParams.get("runtimeMode") || "",
      executionProfile: searchParams.get("executionProfile") || "",
      promotionDecision: searchParams.get("promotionDecision") || "",
      deliveryStatus: searchParams.get("deliveryStatus") || "",
      sideEffectStatus: searchParams.get("sideEffectStatus") || "",
      privateRun: searchParams.get("privateRun") || "",
      minCoherence: searchParams.get("minCoherence") || "",
      maxCoherence: searchParams.get("maxCoherence") || "",
      findingCode: searchParams.get("findingCode") || "",
      page: searchParams.get("page") || "1",
      runId: searchParams.get("runId") || "",
    };
  }, [searchParams]);

  function updateQuery(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if (!("page" in next)) params.set("page", "1");
    router.push(`/admin/sala-de-maquinas?${params.toString()}`);
  }

  function exportUrl(scope: "page" | "all") {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("runId");
    params.set("scope", scope);
    return `/api/admin/cognitive-runs/export?${params.toString()}`;
  }

  async function handlePdfExport(scope: "page" | "all") {
    const setState = scope === "page" ? setPagePdfState : setAllPdfState;
    setState({ status: "loading", message: "Gerando PDF..." });
    try {
      const result = await downloadPdfFromApi(exportUrl(scope), `casa-de-maquinas-${scope}.pdf`);
      setState({ status: "success", message: `PDF gerado (${Math.max(1, Math.round(result.size / 1024))} KB).` });
    } catch (caught) {
      const error = caught as Error & { code?: string };
      setState({
        status: "error",
        message: "Nao foi possivel gerar o PDF. A falha foi registrada e nenhum arquivo corrompido foi baixado.",
        code: error.code || error.message,
      });
    }
  }

  function syncTableScroll(source: "top" | "body") {
    const from = source === "top" ? topTableScrollRef.current : tableScrollRef.current;
    const to = source === "top" ? tableScrollRef.current : topTableScrollRef.current;
    if (!from || !to || syncingScrollRef.current) return;
    syncingScrollRef.current = true;
    to.scrollLeft = from.scrollLeft;
    window.requestAnimationFrame(() => {
      syncingScrollRef.current = false;
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    setConfigLoading(true);
    fetch("/api/admin/cognitive-runtime/config", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || "Falha ao carregar configuracao do runtime.");
        return body;
      })
      .then(setRuntimeConfig)
      .catch((caught) => {
        if (caught.name !== "AbortError") setRuntimeConfig(null);
      })
      .finally(() => setConfigLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setFoundationLoading(true);
    fetch("/api/admin/cognitive-foundation", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || "Falha ao carregar fundacao cognitiva.");
        return body;
      })
      .then(setFoundationData)
      .catch((caught) => {
        if (caught.name !== "AbortError") setFoundationData(null);
      })
      .finally(() => setFoundationLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("runId");
    setLoading(true);
    setError("");
    fetch(`/api/admin/cognitive-runs?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.diagnostic?.message || body?.error || "Falha ao carregar auditorias.");
        return body;
      })
      .then(setData)
      .catch((caught) => {
        if (caught.name !== "AbortError") setError(caught.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [queryString, searchParams]);

  useEffect(() => {
    if (!filters.runId) {
      setDetail(null);
      setDetailError("");
      return;
    }
    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError("");
    fetch(`/api/admin/cognitive-runs/${encodeURIComponent(filters.runId)}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.diagnostic?.message || body?.error || "Falha ao carregar detalhe.");
        return body;
      })
      .then(setDetail)
      .catch((caught) => {
        if (caught.name !== "AbortError") setDetailError(caught.message);
      })
      .finally(() => setDetailLoading(false));
    return () => controller.abort();
  }, [filters.runId]);

  const summary = data?.summary;
  const rows = data?.rows || [];
  const hasAnyData = Boolean(summary?.hasData);

  return (
    <main className="nemosine-main-container relative min-h-screen text-[#e1e1e6]">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 z-10 bg-[#050507]/82 backdrop-blur-[2px]" />
        <div className="h-full w-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center" />
      </div>
      <Navbar />

      <section className="relative z-10 mx-auto max-w-[1500px] px-4 py-8 md:px-8 lg:px-12">
        <header className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c5a059]/65">
                <span className="material-icons text-sm" aria-hidden="true">precision_manufacturing</span>
                Observabilidade do Runtime Cognitivo
              </p>
              <h1 className="font-display text-4xl uppercase tracking-widest text-[#c5a059] md:text-5xl">
                Sala de Máquinas
              </h1>
            </div>
            <div className="flex max-w-xl flex-col gap-3">
              <p className="rounded-lg border border-[#c5a059]/20 bg-black/45 p-4 text-xs leading-relaxed text-white/60">
                C(m) e um indice operacional de coerencia para promocao, nao uma medida de consciencia, inteligencia ou probabilidade de verdade.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#c5a059]/40 bg-[#c5a059]/10 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#fde68a] hover:bg-[#c5a059]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c5a059]"
                >
                  <span className="material-icons text-sm" aria-hidden="true">menu_book</span>
                  Como ler este painel
                </button>
                <button
                  type="button"
                  onClick={() => handlePdfExport("page")}
                  disabled={pagePdfState.status === "loading"}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#c5a059]/40 bg-[#c5a059]/10 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-[#fde68a] hover:bg-[#c5a059]/15 disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c5a059]"
                >
                  <span className="material-icons text-sm" aria-hidden="true">picture_as_pdf</span>
                  {pagePdfState.status === "loading" ? "Gerando PDF..." : pagePdfState.status === "success" ? "PDF gerado" : "Exportar relatorio completo em PDF"}
                </button>
                <button
                  type="button"
                  onClick={() => handlePdfExport("all")}
                  disabled={allPdfState.status === "loading"}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#c5a059]/30 bg-black/35 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-[#fde68a] hover:bg-[#c5a059]/10 disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c5a059]"
                >
                  <span className="material-icons text-sm" aria-hidden="true">dataset</span>
                  {allPdfState.status === "loading" ? "Gerando PDF..." : allPdfState.status === "success" ? "PDF gerado" : "Exportar todas as execucoes"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/admin/observatorio-do-criador")}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-emerald-100 hover:bg-emerald-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                >
                  <span className="material-icons text-sm" aria-hidden="true">health_and_safety</span>
                  Observatorio do Criador
                </button>
              </div>
              {[pagePdfState, allPdfState].some((state) => state.status !== "idle") && (
                <div className="grid gap-2">
                  {([
                    ["page", pagePdfState],
                    ["all", allPdfState],
                  ] as Array<[string, PdfDownloadState]>).map(([key, state]) => state.status === "idle" ? null : (
                    <div
                      key={key}
                      className={`rounded-lg border px-3 py-2 text-xs ${state.status === "error" ? "border-red-400/35 bg-red-500/10 text-red-100" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"}`}
                    >
                      {state.message}
                      {state.code && <span className="ml-2 font-mono text-[10px] opacity-70">{state.code}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <CognitiveFoundationPanel data={foundationData} loading={foundationLoading} />

        {error && <EmptyState kind="diagnostic" />}

        {!error && loading && (
          <div className="rounded-lg border border-[#c5a059]/20 bg-black/45 p-8 text-center text-xs uppercase tracking-[0.24em] text-[#c5a059]" aria-live="polite">
            Carregando metadados do runtime...
          </div>
        )}

        {!error && !loading && data && !hasAnyData && <EmptyState kind="no-audits" />}

        {!error && !loading && data && hasAnyData && (
          <>
            <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7" aria-label="Resumo operacional">
              <MetricCard label={metricExplanations.runs.label} value={summary?.totalRuns ?? 0} icon="account_tree" copy={metricExplanations.runs} provenance={summary?.provenance?.totalRuns} />
              <MetricCard label={metricExplanations.rejectionRate.label} value={formatPercent(summary?.rejectionRate)} icon="block" copy={metricExplanations.rejectionRate} provenance={summary?.provenance?.rejectionRate} footnote={`denom.: ${summary?.governedDecisionDenominator ?? 0}`} />
              <MetricCard label={metricExplanations.promotionRate.label} value={formatPercent(summary?.promotionRate)} icon="check_circle" copy={metricExplanations.promotionRate} provenance={summary?.provenance?.promotionRate} footnote={`denom.: ${summary?.governedDecisionDenominator ?? 0}`} />
              <MetricCard label={metricExplanations.averageCoherence.label} value={formatCoherence(summary?.averageCoherence)} icon="monitor_heart" copy={metricExplanations.averageCoherence} provenance={summary?.provenance?.averageCoherence} footnote={`${summary?.averageCoherenceValidCount ?? 0} registros validos`} />
              <MetricCard label={metricExplanations.theta.label} value={runtimeConfig ? formatScore(runtimeConfig.coherenceThreshold) : "sem dados"} icon="tune" copy={metricExplanations.theta} footnote="configuracao vigente" />
              <MetricCard label={metricExplanations.averageIterations.label} value={compactNumber(summary?.averageIterations)} icon="repeat" copy={metricExplanations.averageIterations} provenance={summary?.provenance?.averageIterations} footnote={`${summary?.cognitiveExecutionCount ?? 0} execucoes reais`} />
              <MetricCard label={metricExplanations.retryRate.label} value={formatPercent(summary?.retryRate)} icon="restart_alt" copy={metricExplanations.retryRate} provenance={summary?.provenance?.retryRate} />
              <MetricCard label={metricExplanations.failedSafeRate.label} value={formatPercent(summary?.failedSafeRate)} icon="shield" copy={metricExplanations.failedSafeRate} provenance={summary?.provenance?.failedSafeRate} />
              <MetricCard label={metricExplanations.recoveryRate.label} value={formatPercent(summary?.recoveryRate)} icon="support_agent" copy={metricExplanations.recoveryRate} provenance={summary?.provenance?.recoveryRate} />
              <MetricCard label={metricExplanations.latency.label} value={formatDuration(summary?.averageLatencyMs)} icon="speed" copy={metricExplanations.latency} provenance={summary?.provenance?.latency} footnote={`runtime: ${formatDuration(summary?.latency?.averageRuntimeMs)}`} />
              <MetricCard label={metricExplanations.deliveryFailures.label} value={summary?.deliveryPersistenceFailureCount ?? 0} icon="outbox" copy={metricExplanations.deliveryFailures} />
              <MetricCard label={metricExplanations.auditFailures.label} value={summary?.auditPersistenceFailureCount ?? 0} icon="fact_check" copy={metricExplanations.auditFailures} />
              <MetricCard label={metricExplanations.blockedEffects.label} value={summary?.optionalEffectBlockedCount ?? 0} icon="lock" copy={metricExplanations.blockedEffects} />
              <MetricCard label={metricExplanations.rolledBackEffects.label} value={summary?.optionalEffectRollbackCount ?? 0} icon="undo" copy={metricExplanations.rolledBackEffects} />
              <MetricCard label={metricExplanations.privateRuns.label} value={summary?.privateRunCount ?? 0} icon="visibility_off" copy={metricExplanations.privateRuns} />
            </section>

            {summary?.shadowOnlyCount ? (
              <div className="mb-6">
                <WarningBanner>
                  {summary.shadowOnlyCount} registro(s) shadow_only foram excluidos dos denominadores de promocao e rejeicao. Observacao em sombra nao e promocao nem rejeicao governada.
                </WarningBanner>
              </div>
            ) : null}

            <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DistributionBars title="Modos de Runtime" values={summary?.runtimeModeDistribution || {}} />
              <DistributionBars title="Perfis de Execucao" values={summary?.executionProfileDistribution || {}} />
            </section>

            <section className="mb-6 rounded-lg border border-[#c5a059]/20 bg-black/45 p-5 backdrop-blur-md">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c5a059]">Filtros</h2>
                  {summary?.aggregation?.note && <p className="mt-2 text-xs text-white/40">{summary.aggregation.note}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/admin/sala-de-maquinas")}
                  className="rounded border border-[#c5a059]/35 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#fde68a] hover:bg-[#c5a059]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c5a059]"
                >
                  Limpar filtros
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                <TextFilter label="Data inicial" type="date" value={filters.dateFrom} onChange={(value) => updateQuery({ dateFrom: value })} />
                <TextFilter label="Data final" type="date" value={filters.dateTo} onChange={(value) => updateQuery({ dateTo: value })} />
                <TextFilter label="Persona" value={filters.personaId} onChange={(value) => updateQuery({ personaId: value })} />
                <TextFilter label="Place" value={filters.placeId} onChange={(value) => updateQuery({ placeId: value })} />
                <SelectFilter label="Modo" value={filters.runtimeMode} options={modeOptions} onChange={(value) => updateQuery({ runtimeMode: value })} />
                <SelectFilter label="Perfil" value={filters.executionProfile} options={profileOptions} onChange={(value) => updateQuery({ executionProfile: value })} />
                <SelectFilter label="Decisao" value={filters.promotionDecision} options={decisionOptions} onChange={(value) => updateQuery({ promotionDecision: value })} />
                <SelectFilter label="Entrega" value={filters.deliveryStatus} options={deliveryOptions} onChange={(value) => updateQuery({ deliveryStatus: value })} />
                <SelectFilter label="Efeitos" value={filters.sideEffectStatus} options={sideEffectOptions} onChange={(value) => updateQuery({ sideEffectStatus: value })} />
                <SelectFilter label="Privacidade" value={filters.privateRun} options={privateOptions} onChange={(value) => updateQuery({ privateRun: value })} />
                <TextFilter label="C(m) min" type="number" value={filters.minCoherence} onChange={(value) => updateQuery({ minCoherence: value })} />
                <TextFilter label="Finding code" value={filters.findingCode} onChange={(value) => updateQuery({ findingCode: value })} />
              </div>
            </section>

            <section className="mb-6 rounded-lg border border-[#c5a059]/20 bg-black/45 p-5 backdrop-blur-md" aria-label="Tabela de execucoes cognitivas">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c5a059]">Execucoes</h2>
                  <p className="mt-2 text-xs text-white/45">Finding codes sao sinais de auditoria; ausencia de codigo nao prova aprovacao completa.</p>
                </div>
                <p className="text-xs text-white/45">
                  {data.pagination.total} runs - pagina {data.pagination.page} de {data.pagination.pageCount}
                </p>
              </div>

              {rows.length === 0 ? (
                <EmptyState kind="no-results" />
              ) : (
                <>
                  <div className="hidden lg:block">
                    <div
                      ref={topTableScrollRef}
                      onScroll={() => syncTableScroll("top")}
                      className="mb-2 overflow-x-auto rounded border border-[#c5a059]/10 bg-black/35"
                      aria-hidden="true"
                    >
                      <div className="h-3 min-w-[1320px]" />
                    </div>
                    <div
                      ref={tableScrollRef}
                      onScroll={() => syncTableScroll("body")}
                      className="max-h-[70vh] overflow-auto rounded border border-[#c5a059]/10"
                    >
                    <table className="min-w-[1320px] table-fixed text-left">
                      <colgroup>
                        <col className="w-[108px]" />
                        <col className="w-[160px]" />
                        <col className="w-[80px]" />
                        <col className="w-[80px]" />
                        <col className="w-[70px]" />
                        <col className="w-[70px]" />
                        <col className="w-[66px]" />
                        <col className="w-[116px]" />
                        <col className="w-[112px]" />
                        <col className="w-[112px]" />
                        <col className="w-[68px]" />
                        <col className="w-[92px]" />
                        <col className="w-[180px]" />
                        <col className="w-[86px]" />
                      </colgroup>
                      <thead className="sticky top-0 z-20 bg-[#060608] shadow-[0_1px_0_rgba(197,160,89,0.2)]">
                        <tr className="border-b border-[#c5a059]/15 text-[8px] uppercase tracking-[0.16em] text-[#c5a059]/65">
                          <th className="p-2">Data</th>
                          <th className="p-2">Persona / Place</th>
                          <th className="p-2">Modo</th>
                          <th className="p-2">Perfil</th>
                          <th className="p-2">C(m)</th>
                          <th className="p-2">Theta</th>
                          <th className="p-2">Iter.</th>
                          <th className="p-2">Decisao</th>
                          <th className="p-2">Entrega</th>
                          <th className="p-2">Efeitos</th>
                          <th className="p-2">Priv.</th>
                          <th className="p-2">Latencia</th>
                          <th className="p-2">Findings</th>
                          <th className="sticky right-0 z-30 bg-[#060608] p-2 text-right">Abrir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#c5a059]/8">
                        {rows.map((row) => (
                          <Fragment key={row.runId}>
                            {isLegacyShadowObservation(row) && (
                              <tr>
                                <td colSpan={14} className="p-2">
                                  <WarningBanner>{legacyShadowWarning}</WarningBanner>
                                </td>
                              </tr>
                            )}
                            <tr className="align-top hover:bg-[#c5a059]/5">
                              <td className="p-2 font-mono text-[10px] text-white/60">{dateTime(row.createdAt)}</td>
                              <td className="p-2 text-xs text-white/75">
                                <div>{row.personaId}</div>
                                <div className="text-[10px] text-white/35">{row.placeId || "sem Place"}</div>
                                <div className="mt-2"><ContextBadges run={row} /></div>
                              </td>
                              <td className="p-2 text-[10px] uppercase text-white/65" title={row.runtimeMode}>{runtimeModeLabel(row.runtimeMode)}</td>
                              <td className="p-2 text-[10px] uppercase text-white/65" title={row.executionProfile}>{executionProfileLabel(row.executionProfile)}</td>
                              <td className="p-2 font-mono text-xs text-[#fde68a]" title={coherenceTooltip(row)}>{formatCoherence(row.coherence)}</td>
                              <td className="p-2 font-mono text-xs text-white/50" title={thresholdTooltip(row)}>{formatThreshold(row.coherenceThreshold, true)}</td>
                              <td className="p-2 font-mono text-xs text-white/65">{row.iterationCount}{row.retryRequested ? " + retry" : ""}</td>
                              <td className="p-2"><StatusPill value={row.promotionDecision} label={promotionLabel(row.promotionDecision)} /></td>
                              <td className="p-2"><StatusPill value={row.deliveryStatus} label={deliveryLabel(row.deliveryStatus)} /></td>
                              <td className="p-2"><StatusPill value={row.sideEffectStatus} label={sideEffectLabel(row.sideEffectStatus)} /></td>
                              <td className="p-2 text-xs text-white/65">{row.privateRun ? "privada" : "publica"}</td>
                              <td className="p-2 font-mono text-xs text-white/65" title={`total: ${formatDuration(row.latency?.totalMs ?? row.latencyMs)}; runtime: ${formatDuration(row.latency?.runtimeMs)}; persistencia: ${formatDuration(row.latency?.stageLatencyMs?.["FINAL_ANSWER_SELECTED->DELIVERY_PERSISTED"])}; legada: ${formatDuration(row.latency?.legacyRouteMs)}`}>{formatDuration(row.latency?.totalMs ?? row.latencyMs)}</td>
                              <td className="p-2 text-[10px] text-white/55">
                                <span
                                  className="block truncate"
                                  title={row.findingCodes.join(", ") || "Sem finding registrado"}
                                >
                                  {row.findingCodes.length > 0 ? `${row.findingCodes.slice(0, 3).join(", ")}${row.findingCodes.length > 3 ? ` +${row.findingCodes.length - 3}` : ""}` : "Sem finding registrado"}
                                </span>
                                {row.findingCodes.length > 0 && (
                                  <details className="mt-1 text-[9px] text-white/40">
                                    <summary className="cursor-pointer text-[#c5a059]/70">ver</summary>
                                    <p className="mt-1 break-words">{row.findingCodes.join(", ")}</p>
                                  </details>
                                )}
                              </td>
                              <td className="sticky right-0 bg-[#09090b] p-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => router.push(rowDetailUrl(row.runId))}
                                  className="rounded border border-[#c5a059]/35 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#fde68a] hover:bg-[#c5a059]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c5a059]"
                                >
                                  Abrir
                                </button>
                              </td>
                            </tr>
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:hidden">
                    {rows.map((row) => (
                      <article key={row.runId} className="rounded-lg border border-[#c5a059]/15 bg-black/35 p-4">
                        {isLegacyShadowObservation(row) && <div className="mb-3"><WarningBanner>{legacyShadowWarning}</WarningBanner></div>}
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-[#fde68a]">{row.personaId}</h3>
                            <p className="text-[10px] text-white/45">{dateTime(row.createdAt)}</p>
                          </div>
                          {row.privateRun && <StatusPill value="blocked" label="privada" />}
                        </div>
                        <div className="mb-3"><ContextBadges run={row} /></div>
                        <div className="mb-3 flex flex-wrap gap-2">
                          <StatusPill value={row.promotionDecision} label={promotionLabel(row.promotionDecision)} />
                          <StatusPill value={row.deliveryStatus} label={deliveryLabel(row.deliveryStatus)} />
                          <StatusPill value={row.sideEffectStatus} label={sideEffectLabel(row.sideEffectStatus)} />
                        </div>
                        <dl className="grid grid-cols-2 gap-2 text-xs text-white/60">
                          <div><dt className="text-white/35">C(m)</dt><dd className="font-mono text-[#fde68a]" title={coherenceTooltip(row)}>{formatCoherence(row.coherence)}</dd></div>
                          <div><dt className="text-white/35">Theta</dt><dd title={thresholdTooltip(row)}>{formatThreshold(row.coherenceThreshold, true)}</dd></div>
                          <div><dt className="text-white/35">Iteracoes</dt><dd>{row.iterationCount}</dd></div>
                          <div><dt className="text-white/35">Modo</dt><dd title={row.runtimeMode}>{runtimeModeLabel(row.runtimeMode)}</dd></div>
                          <div><dt className="text-white/35">Latencia</dt><dd>{formatDuration(row.latencyMs)}</dd></div>
                          <div><dt className="text-white/35">Findings</dt><dd>{row.findingCodes.join(", ") || "Sem finding registrado"}</dd></div>
                        </dl>
                        <button
                          type="button"
                          onClick={() => router.push(rowDetailUrl(row.runId))}
                          className="mt-4 w-full rounded border border-[#c5a059]/35 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#fde68a] hover:bg-[#c5a059]/10"
                        >
                          Abrir detalhe
                        </button>
                      </article>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={!data.pagination.hasPreviousPage}
                  onClick={() => updateQuery({ page: String(Math.max(1, data.pagination.page - 1)) })}
                  className="rounded border border-[#c5a059]/25 px-4 py-2 text-xs text-white/70 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={!data.pagination.hasNextPage}
                  onClick={() => updateQuery({ page: String(data.pagination.page + 1) })}
                  className="rounded border border-[#c5a059]/25 px-4 py-2 text-xs text-white/70 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Proxima
                </button>
              </div>
            </section>
          </>
        )}
      </section>

      {guideOpen && (
        <ReadingGuideDrawer
          tab={guideTab}
          setTab={setGuideTab}
          config={runtimeConfig}
          loading={configLoading}
          onClose={() => setGuideOpen(false)}
        />
      )}

      {filters.runId && (
        <RunDetailDrawer
          detail={detail}
          loading={detailLoading}
          error={detailError}
          onClose={() => updateQuery({ runId: "" })}
        />
      )}
    </main>
  );
}

function MetricCard({
  label,
  value,
  icon,
  copy,
  provenance,
  footnote,
}: {
  label: string;
  value: string | number;
  icon: string;
  copy: { tooltip: string; expanded: string };
  provenance?: MetricProvenance;
  footnote?: string;
}) {
  return (
    <section className="rounded-lg border border-[#c5a059]/20 bg-black/45 p-4 backdrop-blur-md" title={copy.tooltip}>
      <div className="flex items-start gap-3">
        <span className="material-icons text-2xl text-[#c5a059]" aria-hidden="true">{icon}</span>
        <div className="min-w-0">
          <p className="break-words font-mono text-2xl font-bold text-[#fde68a]">{value}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</p>
          {footnote && <p className="mt-1 text-[10px] text-white/35">{footnote}</p>}
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-white/45">{copy.expanded}</p>
      {provenance && (
        <details className="mt-3 text-[10px] text-white/45">
          <summary className="cursor-pointer text-[#c5a059]/80">proveniencia</summary>
          <p className="mt-2">Campo: <span className="font-mono">{provenance.field}</span></p>
          <p>Calculo: {provenance.calculation}</p>
          <p>Denominador: {String(provenance.denominator)}</p>
          <p>Registros validos: {provenance.validRecords}</p>
          {provenance.limitations.length > 0 && <p>Limites: {provenance.limitations.join("; ")}</p>}
        </details>
      )}
    </section>
  );
}

function ReadingGuideDrawer({
  tab,
  setTab,
  config,
  loading,
  onClose,
}: {
  tab: "creator" | "technical";
  setTab: (tab: "creator" | "technical") => void;
  config: RuntimeConfig | null;
  loading: boolean;
  onClose: () => void;
}) {
  const sampleFindingCodes = Object.keys({
    SCIENTIST_SIMULATED_ACCESS: true,
    PROMOTION_COHERENCE_FAILED: true,
    PHILOSOPHER_DEPENDENCY_RISK: true,
    SIDE_EFFECT_DESTINY_UNAUTHORIZED_DISCARDED: true,
    PRIVACY_CONTEXT_BLOCKED: true,
    GENERIC_INTERVIEW_MODE: true,
  });

  return (
    <aside className="fixed inset-y-0 right-0 z-[220] flex w-full max-w-4xl flex-col border-l border-[#c5a059]/25 bg-[#060608]/98 shadow-2xl backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Como ler este painel">
      <div className="flex items-center justify-between border-b border-[#c5a059]/15 p-4">
        <div>
          <h2 className="font-serif text-xl text-[#fde68a]">Como ler este painel</h2>
          <p className="text-[10px] uppercase tracking-widest text-white/35">Observabilidade honesta da Sala de Maquinas</p>
        </div>
        <button type="button" onClick={onClose} className="rounded border border-[#c5a059]/30 p-2 text-[#fde68a]" aria-label="Fechar guia">
          <span className="material-icons" aria-hidden="true">close</span>
        </button>
      </div>

      <div className="border-b border-[#c5a059]/15 p-4">
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#c5a059]/15 bg-black/35 p-1">
          <button
            type="button"
            onClick={() => setTab("creator")}
            className={`rounded px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${tab === "creator" ? "bg-[#c5a059]/20 text-[#fde68a]" : "text-white/55 hover:bg-white/5"}`}
          >
            Visao do Criador
          </button>
          <button
            type="button"
            onClick={() => setTab("technical")}
            className={`rounded px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${tab === "technical" ? "bg-[#c5a059]/20 text-[#fde68a]" : "text-white/55 hover:bg-white/5"}`}
          >
            Visao Tecnica
          </button>
        </div>
      </div>

      <div className="overflow-y-auto p-5">
        {tab === "creator" ? (
          <div className="space-y-5">
            <DetailSection title="Fluxo simples">
              <ol className="grid gap-2 md:grid-cols-2">
                {creatorFlowSteps.map((step, index) => (
                  <li key={step} className="rounded border border-[#c5a059]/10 bg-black/35 p-3 text-xs text-white/70">
                    <span className="mr-2 font-mono text-[#c5a059]">{String(index + 1).padStart(2, "0")}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </DetailSection>

            <DetailSection title="Papeis do runtime">
              <div className="grid gap-3 md:grid-cols-2">
                <GuideNote title="O-C-V" body="Ciclo de Orquestracao, Coerencia e Vigilancia." />
                <GuideNote title="Cientista" body="Verifica logica, sustentacao factual, contradicoes e incerteza honesta." />
                <GuideNote title="Vigia" body="Calcula o indice operacional C(m) e compara com theta quando theta existe no registro/configuracao." />
                <GuideNote title="Filosofo" body="Verifica conformidade etica, epistemologica e constitucional." />
                <GuideNote title="Promotion Gate" body="Decide se a resposta candidata pode ser promovida, rejeitada ou reparada." />
                <GuideNote title="Side Effects" body="Alteracoes em memoria, registros ou Linha do Destino; so ocorrem quando autorizadas." />
                <GuideNote title="Shadow" body="Observa sem governar a entrega. Shadow legado pode registrar observacao sem executar O-C-V." />
                <GuideNote title="Enforce" body="Submete a entrega as decisoes do runtime." />
              </div>
            </DetailSection>
          </div>
        ) : (
          <div className="space-y-5">
            <DetailSection title="Configuracao vigente">
              {loading && <p className="text-sm text-[#c5a059]">Carregando configuracao administrativa...</p>}
              {!loading && !config && (
                <WarningBanner>Configuracao administrativa indisponivel. O painel nao vai inventar valores ausentes.</WarningBanner>
              )}
              {config && (
                <div className="grid gap-3 md:grid-cols-2">
                  <ConfigValue label="Modo vigente" value={config.runtimeMode} source={config.sources.runtimeMode} />
                  <ConfigValue label="Perfil padrao" value={config.defaultProfile} source={config.sources.defaultProfile} />
                  <ConfigValue label="Theta configurado" value={formatScore(config.coherenceThreshold)} source={config.sources.coherenceThreshold} />
                  <ConfigValue label="Max retries" value={String(config.maxRetries)} source={config.sources.maxRetries} />
                  <ConfigValue label="Double Vigilance" value={formatBoolean(config.doubleVigilance)} source={config.sources.doubleVigilance} />
                  <ConfigValue label="Auditoria" value={formatBoolean(config.auditEnabled)} source={config.sources.auditEnabled} />
                  <ConfigValue label="Modelo de geracao" value={config.generationModel} source={config.sources.generationModel} />
                  <ConfigValue label="Temperatura de geracao" value={String(config.generationTemperature)} source={config.sources.generationTemperature} />
                  <ConfigValue label="Temperatura dos avaliadores" value={String(config.structuredEvaluatorTemperature)} source={config.sources.structuredEvaluatorTemperature} />
                  <ConfigValue label="Versao do runtime" value={config.runtimeVersion} source="constante publica do runtime" />
                  <ConfigValue label="Commit/deploy" value={config.deployVersion || "nao disponivel"} source={config.sources.deployVersion} />
                </div>
              )}
            </DetailSection>

            {config && (
              <DetailSection title="Pesos vigentes de C(m)">
                <div className="grid gap-2 md:grid-cols-2">
                  {Object.entries(config.coherenceWeights).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between rounded border border-[#c5a059]/10 bg-black/35 p-3 text-xs">
                      <span className="font-mono text-white/70">{key}</span>
                      <span className="font-mono text-[#fde68a]">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-white/45">{config.sources.coherenceWeights}</p>
              </DetailSection>
            )}

            <DetailSection title="Limites conhecidos">
              <ul className="space-y-2 text-sm text-white/65">
                {(config?.limitations || [
                  "O schema V1 nao preserva theta, pesos, temperaturas nem avaliacoes completas por iteracao.",
                  "A interface so mostra metadados seguros.",
                ]).map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </DetailSection>
          </div>
        )}

        <div className="mt-5 grid gap-5">
          <DetailSection title="Guia da tabela de execucoes">
            <div className="grid gap-2 md:grid-cols-2">
              {tableColumnGuide.map(([label, body]) => (
                <GuideNote key={label} title={label} body={body} />
              ))}
            </div>
          </DetailSection>

          <DetailSection title="Dicionario de Finding Codes">
            <div className="grid gap-3">
              {sampleFindingCodes.map((code) => {
                const entry = describeFindingCode(code);
                return <FindingEntry key={code} entry={entry} />;
              })}
            </div>
          </DetailSection>
        </div>
      </div>
    </aside>
  );
}

function RunDetailDrawer({ detail, loading, error, onClose }: { detail: any; loading: boolean; error: string; onClose: () => void }) {
  const [detailPdfState, setDetailPdfState] = useState<PdfDownloadState>(initialPdfDownloadState);
  const auditEvents = detail?.auditEvents || [];
  const continuityEvent = auditEvents.find((event: any) => event.code === "CONTINUITY_CONTEXT_ASSEMBLED");
  const initiativeEvent = auditEvents.filter((event: any) => event.code === "PERSONA_INITIATIVE_EVALUATED").slice(-1)[0];
  const continuity = continuityEvent?.detail || {};
  const initiative = initiativeEvent?.detail || {};
  const detailRun = detail ? {
    runtimeMode: detail.identity?.runtimeMode,
    promotionDecision: detail.identity?.promotionDecision,
    deliveryStatus: detail.persistence?.deliveryStatus,
    iterationCount: detail.iterations?.length || 0,
    coherence: detail.vigia?.finalCoherence ?? null,
    findingCodes: detail.findingCodes || [],
    recoveryDelivered: detail.recovery?.delivered,
    dominantCause: detail.recovery?.dominantCause,
    infrastructureDegraded: detail.recovery?.infrastructureDegraded,
  } : null;
  const narrative = detail?.narrative || (detail ? buildRunNarrative(detail) : "");
  async function handleDetailPdfExport() {
    if (!detail?.identity?.runId) return;
    setDetailPdfState({ status: "loading", message: "Gerando PDF..." });
    try {
      const runId = String(detail.identity.runId);
      const result = await downloadPdfFromApi(`/api/admin/cognitive-runs/${encodeURIComponent(runId)}/export`, `casa-de-maquinas-${runId}.pdf`);
      setDetailPdfState({ status: "success", message: `PDF gerado (${Math.max(1, Math.round(result.size / 1024))} KB).` });
    } catch (caught) {
      const exportError = caught as Error & { code?: string };
      setDetailPdfState({
        status: "error",
        message: "Nao foi possivel gerar o PDF. A falha foi registrada e nenhum arquivo corrompido foi baixado.",
        code: exportError.code || exportError.message,
      });
    }
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-[200] flex w-full max-w-3xl flex-col border-l border-[#c5a059]/25 bg-[#060608]/98 shadow-2xl backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Detalhe da execucao cognitiva">
      <div className="flex items-center justify-between border-b border-[#c5a059]/15 p-4">
        <div>
          <h2 className="font-serif text-xl text-[#fde68a]">Detalhe da Execucao</h2>
          <p className="text-[10px] uppercase tracking-widest text-white/35">Somente metadados tecnicos</p>
        </div>
        <div className="flex items-center gap-2">
          {detail?.identity?.runId && (
            <button
              type="button"
              onClick={handleDetailPdfExport}
              disabled={detailPdfState.status === "loading"}
              className="inline-flex items-center gap-2 rounded border border-[#c5a059]/30 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#fde68a] hover:bg-[#c5a059]/10 disabled:cursor-wait disabled:opacity-60"
            >
              <span className="material-icons text-sm" aria-hidden="true">picture_as_pdf</span>
              {detailPdfState.status === "loading" ? "Gerando PDF..." : detailPdfState.status === "success" ? "PDF gerado" : "Exportar esta execucao em PDF"}
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded border border-[#c5a059]/30 p-2 text-[#fde68a]" aria-label="Fechar detalhe">
            <span className="material-icons" aria-hidden="true">close</span>
          </button>
        </div>
      </div>

      <div className="overflow-y-auto p-5">
        {loading && <p className="text-sm text-[#c5a059]">Carregando detalhe...</p>}
        {error && <p className="rounded border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</p>}
        {detailPdfState.status !== "idle" && (
          <p className={`mb-4 rounded border p-3 text-xs ${detailPdfState.status === "error" ? "border-red-400/35 bg-red-500/10 text-red-100" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"}`}>
            {detailPdfState.message}
            {detailPdfState.code && <span className="ml-2 font-mono text-[10px] opacity-70">{detailPdfState.code}</span>}
          </p>
        )}
        {!loading && !error && detail && (
          <div className="space-y-5">
            {detailRun && isLegacyShadowObservation(detailRun) && <WarningBanner>{legacyShadowWarning}</WarningBanner>}
            {detail.identity?.privateRun && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                Execucao privada: somente metadados tecnicos sao exibidos.
              </div>
            )}

            <DetailSection title="Resumo narrativo">
              <p className="text-sm leading-relaxed text-white/70">{narrative}</p>
              {detailRun && <div className="mt-3"><ContextBadges run={detailRun} /></div>}
            </DetailSection>

            <DetailSection title="Classificacao operacional">
              <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <KeyValue label="Causa dominante" value={detail.recovery?.dominantCause || "nao registrada"} />
                <KeyValue label="Categoria de bloqueio" value={detail.recovery?.blockingCategory || "nao registrada"} />
                <KeyValue label="Degradacao de infraestrutura" value={detail.recovery?.infrastructureDegraded ? "sim" : "nao"} />
                <KeyValue label="Recuperacao entregue" value={detail.recovery?.delivered ? "sim" : "nao"} />
                <KeyValue label="Gate basal da recuperacao" value={typeof detail.recovery?.basalGatePromoted === "boolean" ? (detail.recovery.basalGatePromoted ? "promovido" : "bloqueado") : "nao registrado"} />
                <KeyValue label="Findings do recovery" value={detail.recovery?.basalGateFindingCodes || "nenhum"} />
              </dl>
            </DetailSection>

            <DetailSection title="Identidade e execucao">
              <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <KeyValue label="Run ID" value={detail.identity.runId} mono />
                <KeyValue label="Data" value={dateTime(detail.identity.createdAt)} />
                <KeyValue label="Persona" value={detail.identity.personaId} />
                <KeyValue label="Place" value={detail.identity.placeId || "sem Place"} />
                <KeyValue label="Modo" value={`${runtimeModeLabel(detail.identity.runtimeMode)} (${detail.identity.runtimeMode})`} />
                <KeyValue label="Perfil" value={`${executionProfileLabel(detail.identity.executionProfile)} (${detail.identity.executionProfile})`} />
                <KeyValue label="Modelos" value={(detail.identity.modelIdentifiers || []).join(", ") || "nao registrado"} />
                <KeyValue label="Privada" value={detail.identity.privateRun ? "sim" : "nao"} />
              </dl>
            </DetailSection>

            <DetailSection title="Continuidade e destino">
              <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <KeyValue label="Status Destiny" value={destinyStatusLabel(continuity.destinySourceStatus)} />
                <KeyValue label="Eventos encontrados" value={String(continuity.destinyEventsFound ?? "nao registrado")} />
                <KeyValue label="Eventos selecionados" value={String(continuity.destinyEventsSelected ?? "nao registrado")} />
                <KeyValue label="Erro Destiny" value={String(continuity.destinyErrorCode || "nenhum")} />
                <KeyValue label="User ID confere" value={continuity.destinyUserIdMatched === undefined ? "nao registrado" : continuity.destinyUserIdMatched ? "sim" : "nao"} />
                <KeyValue label="Modo de elicitacao" value={String(initiative.elicitationMode || "nao registrado")} />
                <KeyValue label="Pedido generico de detalhes" value={initiative.explicitDetailRequest === undefined ? "nao registrado" : initiative.explicitDetailRequest ? "sim" : "nao"} />
                <KeyValue label="Perguntas genericas" value={String(initiative.genericQuestionCount ?? "nao registrado")} />
                <KeyValue label="Inferencias ressonantes" value={String(initiative.resonantInferenceCount ?? "nao registrado")} />
                <KeyValue label="Conexoes contextuais" value={String(initiative.contextualConnectionsCount ?? "nao registrado")} />
              </dl>
            </DetailSection>

            <DetailSection title="Linha operacional">
              <ol className="space-y-2">
                {(detail.timeline || []).map((transition: any, index: number) => (
                  <li key={`${transition.from}-${transition.to}-${index}`} className="rounded border border-[#c5a059]/10 bg-black/35 p-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2 text-white/75">
                      <span className="font-mono" title={transition.from}>{transitionLabel(transition.from)}</span>
                      <span className="material-icons text-sm text-[#c5a059]" aria-hidden="true">arrow_forward</span>
                      <span className="font-mono" title={transition.to}>{transitionLabel(transition.to)}</span>
                      <StatusPill value={transition.allowed ? "persisted" : "failed"} label={transition.allowed ? "permitida" : "ilegal"} />
                    </div>
                    <p className="mt-1 text-white/35">{transition.at || "sem horario"} - {transition.note || "sem nota"}</p>
                  </li>
                ))}
                {(detail.timeline || []).length === 0 && <p className="text-sm text-white/45">Nenhuma transicao operacional foi preservada.</p>}
              </ol>
            </DetailSection>

            <DetailSection title="Iteracoes O-C-V">
              <div className="grid gap-3">
                {(detail.iterations || []).map((iteration: any) => (
                  <div key={iteration.index} className="rounded border border-[#c5a059]/10 bg-black/35 p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-[#fde68a]">Iteracao {iteration.index + 1}</span>
                      <span>{iteration.retryRequested ? "retry solicitado" : "sem retry registrado"}</span>
                    </div>
                    <p className="mt-2 text-white/50">C(m): <span title={iteration.coherenceUnavailableReason || coherenceTooltip(iteration)}>{formatCoherence(iteration.coherence)}</span> - modelo: {iteration.candidateModelIdentifier || "nao registrado"} - latencia: {formatDuration(iteration.stageLatencyMs)}</p>
                    {iteration.coherenceUnavailableReason && (
                      <p className="mt-1 text-[11px] text-white/35">{iteration.coherenceUnavailableReason}</p>
                    )}
                    <p className="mt-2 text-white/40">Findings: {(iteration.findingCodes || []).join(", ") || "Sem finding registrado"}</p>
                  </div>
                ))}
                {(detail.iterations || []).length === 0 && <WarningBanner>Nenhuma iteracao O-C-V foi preservada para esta execucao.</WarningBanner>}
              </div>
            </DetailSection>

            <DetailSection title="Vigia">
              <p className="mb-3 text-sm text-white/60">{detail.vigia.formula}</p>
              <div className="space-y-3">
                {(detail.vigia.dimensions || []).map((dimension: any) => (
                  <div key={dimension.name}>
                    <div className="mb-1 flex justify-between gap-3 text-xs text-white/60">
                      <span>{dimension.name}</span>
                      <span className="font-mono" title={dimension.reason || ""}>
                        {dimension.status === "NOT_APPLICABLE" ? "Nao aplicavel" : formatCoherence(dimension.score)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className={`h-2 rounded-full ${dimension.status === "NOT_APPLICABLE" ? "bg-white/25" : "bg-[#c5a059]"}`} style={{ width: `${dimension.status === "NOT_APPLICABLE" ? 100 : Math.max(0, Math.min(1, dimension.score || 0)) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {(detail.vigia.dimensions || []).length === 0 && <p className="text-sm text-white/45">Sem dimensoes de C(m) armazenadas.</p>}
              </div>
              <p className="mt-3 text-xs text-white/45">Theta: <span title={thresholdTooltip({ coherenceThreshold: detail.vigia.threshold })}>{formatThreshold(detail.vigia.threshold)}</span> - hard failures: {(detail.vigia.hardFailures || []).join(", ") || "nenhum registrado"}</p>
            </DetailSection>

            <DetailSection title="Double Vigilance">
              {(detail.doubleVigilance?.telemetryMessage || doubleVigilanceMessage({
                iterationCount: detail.iterations?.length,
                dimensionCount: detail.vigia?.dimensions?.length,
                scientistFindingCodes: detail.doubleVigilance?.scientist?.findingCodes,
                philosopherFindingCodes: detail.doubleVigilance?.philosopher?.findingCodes,
                modelIdentifiers: detail.identity?.modelIdentifiers,
              })) === insufficientDoubleVigilanceTelemetry && (
                <div className="mb-3"><WarningBanner>{insufficientDoubleVigilanceTelemetry}</WarningBanner></div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <AxisCard title="Scientist - eixo veritativo" axis={detail.doubleVigilance.scientist} />
                <AxisCard title="Philosopher - eixo etico-epistemologico" axis={detail.doubleVigilance.philosopher} />
              </div>
            </DetailSection>

            <DetailSection title="Latencia">
              <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <KeyValue label="Total" value={formatDuration(detail.latency?.totalMs)} />
                <KeyValue label="Runtime" value={formatDuration(detail.latency?.runtimeMs)} />
                <KeyValue label="Rota legada" value={formatDuration(detail.latency?.legacyRouteMs)} />
                <KeyValue label="Etapas registradas" value={Object.entries(detail.latency?.stageLatencyMs || {}).map(([stage, ms]) => `${stage}: ${formatDuration(ms as number)}`).join("; ") || "sem etapas preservadas"} />
              </dl>
            </DetailSection>

            <DetailSection title="Persistencia">
              <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <KeyValue label="Entrega" value={deliveryLabel(detail.persistence.deliveryStatus)} />
                <KeyValue label="Mensagem persistida" value={detail.persistence.assistantMessagePersisted ? "sim" : "nao"} />
                <KeyValue label="Auditoria persistida" value={detail.persistence.auditPersisted ? "sim" : "nao"} />
                <KeyValue label="Efeitos opcionais" value={sideEffectLabel(detail.persistence.sideEffectStatus)} />
                <KeyValue label="Memoria" value={String(detail.persistence.memoryEffectCount)} />
                <KeyValue label="Registry" value={String(detail.persistence.registryEffectCount)} />
                <KeyValue label="Destiny" value={String(detail.persistence.destinyEffectCount)} />
                <KeyValue label="Razao" value={detail.persistence.reason || "sem razao registrada"} />
              </dl>
            </DetailSection>

            <DetailSection title="Finding Codes">
              <div className="grid gap-3">
                {(detail.findingCodes || []).length === 0 && (
                  <p className="text-sm text-white/55">Sem finding registrado. Isto nao e sinonimo automatico de avaliado e aprovado.</p>
                )}
                {(detail.findingCodes || []).map((code: string) => (
                  <FindingEntry key={code} entry={describeFindingCode(code)} />
                ))}
              </div>
            </DetailSection>

            <DetailSection title="Privacidade">
              <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <KeyValue label="Execucao privada" value={detail.privacy.privateRun ? "sim" : "nao"} />
                <KeyValue label="Metadata-only" value={detail.privacy.metadataOnly ? "sim" : "nao"} />
                <KeyValue label="Contextos bloqueados" value={String(detail.privacy.blockedContextCount)} />
                <KeyValue label="Finding codes" value={(detail.privacy.privacyFindingCodes || []).join(", ") || "nenhum"} />
                <KeyValue label="Hashes presentes" value={Object.entries(detail.privacy.contentHashPresence || {}).filter(([, present]) => present).map(([key]) => key).join(", ") || "nenhum"} />
                <KeyValue label="Comprimentos" value={JSON.stringify(detail.privacy.contentLengths || {})} mono />
              </dl>
              <p className="mt-3 text-xs text-white/45">{detail.provenance?.redaction || "Texto bruto, prompts, memorias privadas e candidatas nao sao expostos."}</p>
            </DetailSection>
          </div>
        )}
      </div>
    </aside>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[#c5a059]/15 bg-black/35 p-4">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c5a059]">{title}</h3>
      {children}
    </section>
  );
}

function KeyValue({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-white/35">{label}</dt>
      <dd className={`mt-1 break-words text-white/75 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function ConfigValue({ label, value, source }: { label: string; value: string; source: string }) {
  return (
    <div className="rounded border border-[#c5a059]/10 bg-black/35 p-3">
      <dt className="text-[10px] uppercase tracking-widest text-white/35">{label}</dt>
      <dd className="mt-1 break-words font-mono text-sm text-[#fde68a]">{value}</dd>
      <p className="mt-2 text-[10px] text-white/35">fonte: {source}</p>
    </div>
  );
}

function GuideNote({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded border border-[#c5a059]/10 bg-black/35 p-3">
      <h4 className="text-xs font-bold uppercase tracking-widest text-[#fde68a]">{title}</h4>
      <p className="mt-2 text-xs leading-relaxed text-white/60">{body}</p>
    </article>
  );
}

function FindingEntry({ entry }: { entry: ReturnType<typeof describeFindingCode> }) {
  return (
    <article className="rounded border border-[#c5a059]/10 bg-black/35 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono font-bold text-[#fde68a]">{entry.code}</span>
        <span className="rounded border border-white/15 px-2 py-1 uppercase tracking-widest text-white/45">{entry.severity}</span>
      </div>
      <p className="mt-2 text-white/65">{entry.category}: {entry.explanation}</p>
      <p className="mt-2 text-white/45">Efeito: {entry.effect}</p>
      <p className="mt-1 text-white/35">Exige: {entry.requires}</p>
    </article>
  );
}

function AxisCard({ title, axis }: { title: string; axis: any }) {
  const hasFindings = (axis.findingCodes || []).length > 0;
  return (
    <article className="rounded border border-[#c5a059]/10 bg-black/35 p-3">
      <h4 className="text-sm font-bold text-[#fde68a]">{title}</h4>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-white/35">{axis.roleLabel}</p>
      <p className="mt-3 text-xs text-white/65">
        Status: {hasFindings ? "finding registrado" : "Sem finding registrado; aprovacao completa nao comprovada apenas por este campo."}
      </p>
      <p className="mt-2 text-xs text-white/45">Findings: {(axis.findingCodes || []).join(", ") || "Sem finding registrado"}</p>
    </article>
  );
}
