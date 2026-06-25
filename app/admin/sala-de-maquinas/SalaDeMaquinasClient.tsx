"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import {
  deliveryLabel,
  emptyStateCopy,
  formatDuration,
  formatPercent,
  formatScore,
  promotionLabel,
  rowDetailUrl,
  sideEffectLabel,
  statusClass,
} from "@/app/lib/admin/cognitiveRunsUi";

type Summary = {
  hasData: boolean;
  totalRuns: number;
  promotionRate: number | null;
  rejectionRate: number | null;
  failedSafeRate: number | null;
  averageCoherence: number | null;
  medianCoherence: number | null;
  averageIterations: number | null;
  retryRate: number | null;
  averageLatencyMs: number | null;
  executionProfileDistribution: Record<string, number>;
  runtimeModeDistribution: Record<string, number>;
  deliveryPersistenceFailureCount: number;
  auditPersistenceFailureCount: number;
  optionalEffectBlockedCount: number;
  optionalEffectRollbackCount: number;
  privateRunCount: number;
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
  retryRequested: boolean;
  findingCodes: string[];
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

const modeOptions = ["", "shadow", "enforce"];
const profileOptions = ["", "light", "standard", "full"];
const decisionOptions = ["", "promoted", "rejected", "failed_safe", "shadow_only"];
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

function DistributionBars({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values);
  const max = Math.max(...entries.map(([, count]) => count), 1);
  return (
    <section className="rounded-lg border border-[#c5a059]/20 bg-black/45 p-5 backdrop-blur-md" aria-label={title}>
      <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c5a059]">{title}</h2>
      <div className="space-y-3">
        {entries.length === 0 && <p className="text-xs text-white/35">Sem dados para este recorte.</p>}
        {entries.map(([label, count]) => (
          <div key={label} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3">
            <span className="truncate text-[10px] uppercase tracking-wider text-white/65">{label}</span>
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

function StatusPill({ value, label }: { value: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(value)}`}>
      <span className="material-icons text-xs" aria-hidden="true">
        {statusClass(value).includes("emerald") ? "check_circle" : statusClass(value).includes("red") ? "error" : statusClass(value).includes("amber") ? "warning" : "radio_button_checked"}
      </span>
      {label}
    </span>
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
            {option || "todos"}
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
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");

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
            <p className="max-w-xl rounded-lg border border-[#c5a059]/20 bg-black/45 p-4 text-xs leading-relaxed text-white/60">
              C(m) is an operational promotion-coherence index, not a measurement of consciousness, intelligence or truth probability.
            </p>
          </div>
        </header>

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
              <MetricCard label="Runs" value={summary?.totalRuns ?? 0} icon="account_tree" />
              <MetricCard label="Rejeição" value={formatPercent(summary?.rejectionRate)} icon="block" />
              <MetricCard label="Promoção" value={formatPercent(summary?.promotionRate)} icon="check_circle" />
              <MetricCard label="C(m) médio" value={formatScore(summary?.averageCoherence)} icon="monitor_heart" />
              <MetricCard label="Iterações médias" value={compactNumber(summary?.averageIterations)} icon="repeat" />
              <MetricCard label="Retries" value={formatPercent(summary?.retryRate)} icon="restart_alt" />
              <MetricCard label="Failed-safe" value={formatPercent(summary?.failedSafeRate)} icon="shield" />
              <MetricCard label="Latência média" value={formatDuration(summary?.averageLatencyMs)} icon="speed" />
              <MetricCard label="Falhas de entrega" value={summary?.deliveryPersistenceFailureCount ?? 0} icon="outbox" />
              <MetricCard label="Falhas de auditoria" value={summary?.auditPersistenceFailureCount ?? 0} icon="fact_check" />
              <MetricCard label="Efeitos bloqueados" value={summary?.optionalEffectBlockedCount ?? 0} icon="lock" />
              <MetricCard label="Efeitos revertidos" value={summary?.optionalEffectRollbackCount ?? 0} icon="undo" />
              <MetricCard label="Execuções privadas" value={summary?.privateRunCount ?? 0} icon="visibility_off" />
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DistributionBars title="Modos de Runtime" values={summary?.runtimeModeDistribution || {}} />
              <DistributionBars title="Perfis de Execução" values={summary?.executionProfileDistribution || {}} />
            </section>

            <section className="mb-6 rounded-lg border border-[#c5a059]/20 bg-black/45 p-5 backdrop-blur-md">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c5a059]">Filtros</h2>
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
                <SelectFilter label="Decisão" value={filters.promotionDecision} options={decisionOptions} onChange={(value) => updateQuery({ promotionDecision: value })} />
                <SelectFilter label="Entrega" value={filters.deliveryStatus} options={deliveryOptions} onChange={(value) => updateQuery({ deliveryStatus: value })} />
                <SelectFilter label="Efeitos" value={filters.sideEffectStatus} options={sideEffectOptions} onChange={(value) => updateQuery({ sideEffectStatus: value })} />
                <SelectFilter label="Privacidade" value={filters.privateRun} options={privateOptions} onChange={(value) => updateQuery({ privateRun: value })} />
                <TextFilter label="C(m) min" type="number" value={filters.minCoherence} onChange={(value) => updateQuery({ minCoherence: value })} />
                <TextFilter label="Finding code" value={filters.findingCode} onChange={(value) => updateQuery({ findingCode: value })} />
              </div>
            </section>

            <section className="mb-6 rounded-lg border border-[#c5a059]/20 bg-black/45 p-5 backdrop-blur-md" aria-label="Tabela de execuções cognitivas">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c5a059]">Execuções</h2>
                <p className="text-xs text-white/45">
                  {data.pagination.total} runs · página {data.pagination.page} de {data.pagination.pageCount}
                </p>
              </div>

              {rows.length === 0 ? (
                <EmptyState kind="no-results" />
              ) : (
                <>
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#c5a059]/15 text-[9px] uppercase tracking-widest text-[#c5a059]/65">
                          <th className="p-2">Data</th>
                          <th className="p-2">Persona / Place</th>
                          <th className="p-2">Modo</th>
                          <th className="p-2">Perfil</th>
                          <th className="p-2">C(m)</th>
                          <th className="p-2">Theta</th>
                          <th className="p-2">Iter.</th>
                          <th className="p-2">Decisão</th>
                          <th className="p-2">Entrega</th>
                          <th className="p-2">Efeitos</th>
                          <th className="p-2">Priv.</th>
                          <th className="p-2">Latência</th>
                          <th className="p-2 text-right">Detalhe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#c5a059]/8">
                        {rows.map((row) => (
                          <tr key={row.runId} className="align-top hover:bg-[#c5a059]/5">
                            <td className="p-2 font-mono text-[10px] text-white/60">{dateTime(row.createdAt)}</td>
                            <td className="p-2 text-xs text-white/75">
                              <div>{row.personaId}</div>
                              <div className="text-[10px] text-white/35">{row.placeId || "sem Place"}</div>
                            </td>
                            <td className="p-2 text-[10px] uppercase text-white/65">{row.runtimeMode}</td>
                            <td className="p-2 text-[10px] uppercase text-white/65">{row.executionProfile}</td>
                            <td className="p-2 font-mono text-xs text-[#fde68a]">{formatScore(row.coherence)}</td>
                            <td className="p-2 font-mono text-xs text-white/35">{formatScore(row.coherenceThreshold)}</td>
                            <td className="p-2 font-mono text-xs text-white/65">{row.iterationCount}{row.retryRequested ? " + retry" : ""}</td>
                            <td className="p-2"><StatusPill value={row.promotionDecision} label={promotionLabel(row.promotionDecision)} /></td>
                            <td className="p-2"><StatusPill value={row.deliveryStatus} label={deliveryLabel(row.deliveryStatus)} /></td>
                            <td className="p-2"><StatusPill value={row.sideEffectStatus} label={sideEffectLabel(row.sideEffectStatus)} /></td>
                            <td className="p-2 text-xs text-white/65">{row.privateRun ? "privada" : "publica"}</td>
                            <td className="p-2 font-mono text-xs text-white/65">{formatDuration(row.latencyMs)}</td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                onClick={() => router.push(rowDetailUrl(row.runId))}
                                className="rounded border border-[#c5a059]/35 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#fde68a] hover:bg-[#c5a059]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c5a059]"
                              >
                                Abrir
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:hidden">
                    {rows.map((row) => (
                      <article key={row.runId} className="rounded-lg border border-[#c5a059]/15 bg-black/35 p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-[#fde68a]">{row.personaId}</h3>
                            <p className="text-[10px] text-white/45">{dateTime(row.createdAt)}</p>
                          </div>
                          {row.privateRun && <StatusPill value="blocked" label="privada" />}
                        </div>
                        <div className="mb-3 flex flex-wrap gap-2">
                          <StatusPill value={row.promotionDecision} label={promotionLabel(row.promotionDecision)} />
                          <StatusPill value={row.deliveryStatus} label={deliveryLabel(row.deliveryStatus)} />
                          <StatusPill value={row.sideEffectStatus} label={sideEffectLabel(row.sideEffectStatus)} />
                        </div>
                        <dl className="grid grid-cols-2 gap-2 text-xs text-white/60">
                          <div><dt className="text-white/35">C(m)</dt><dd className="font-mono text-[#fde68a]">{formatScore(row.coherence)}</dd></div>
                          <div><dt className="text-white/35">Iterações</dt><dd>{row.iterationCount}</dd></div>
                          <div><dt className="text-white/35">Modo</dt><dd>{row.runtimeMode}</dd></div>
                          <div><dt className="text-white/35">Latência</dt><dd>{formatDuration(row.latencyMs)}</dd></div>
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
                  Próxima
                </button>
              </div>
            </section>
          </>
        )}
      </section>

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

function MetricCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <section className="rounded-lg border border-[#c5a059]/20 bg-black/45 p-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <span className="material-icons text-2xl text-[#c5a059]" aria-hidden="true">{icon}</span>
        <div>
          <p className="font-mono text-2xl font-bold text-[#fde68a]">{value}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</p>
        </div>
      </div>
    </section>
  );
}

function RunDetailDrawer({ detail, loading, error, onClose }: { detail: any; loading: boolean; error: string; onClose: () => void }) {
  return (
    <aside className="fixed inset-y-0 right-0 z-[200] flex w-full max-w-3xl flex-col border-l border-[#c5a059]/25 bg-[#060608]/98 shadow-2xl backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Detalhe da execução cognitiva">
      <div className="flex items-center justify-between border-b border-[#c5a059]/15 p-4">
        <div>
          <h2 className="font-serif text-xl text-[#fde68a]">Detalhe da Execução</h2>
          <p className="text-[10px] uppercase tracking-widest text-white/35">Somente metadados técnicos</p>
        </div>
        <button type="button" onClick={onClose} className="rounded border border-[#c5a059]/30 p-2 text-[#fde68a]" aria-label="Fechar detalhe">
          <span className="material-icons" aria-hidden="true">close</span>
        </button>
      </div>

      <div className="overflow-y-auto p-5">
        {loading && <p className="text-sm text-[#c5a059]">Carregando detalhe...</p>}
        {error && <p className="rounded border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</p>}
        {!loading && !error && detail && (
          <div className="space-y-5">
            {detail.identity?.privateRun && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                Execução privada: somente metadados técnicos são exibidos.
              </div>
            )}

            <DetailSection title="Identidade e execução">
              <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <KeyValue label="Run ID" value={detail.identity.runId} mono />
                <KeyValue label="Data" value={dateTime(detail.identity.createdAt)} />
                <KeyValue label="Persona" value={detail.identity.personaId} />
                <KeyValue label="Place" value={detail.identity.placeId || "sem Place"} />
                <KeyValue label="Modo" value={detail.identity.runtimeMode} />
                <KeyValue label="Perfil" value={detail.identity.executionProfile} />
                <KeyValue label="Modelos" value={(detail.identity.modelIdentifiers || []).join(", ") || "nao registrado"} />
                <KeyValue label="Privada" value={detail.identity.privateRun ? "sim" : "nao"} />
              </dl>
            </DetailSection>

            <DetailSection title="Linha operacional">
              <ol className="space-y-2">
                {(detail.timeline || []).map((transition: any, index: number) => (
                  <li key={`${transition.from}-${transition.to}-${index}`} className="rounded border border-[#c5a059]/10 bg-black/35 p-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2 text-white/75">
                      <span className="font-mono">{transition.from}</span>
                      <span className="material-icons text-sm text-[#c5a059]" aria-hidden="true">arrow_forward</span>
                      <span className="font-mono">{transition.to}</span>
                      <StatusPill value={transition.allowed ? "persisted" : "failed"} label={transition.allowed ? "permitida" : "ilegal"} />
                    </div>
                    <p className="mt-1 text-white/35">{transition.at || "sem horario"} · {transition.note || "sem nota"}</p>
                  </li>
                ))}
              </ol>
            </DetailSection>

            <DetailSection title="Iterações O-C-V">
              <div className="grid gap-3">
                {(detail.iterations || []).map((iteration: any) => (
                  <div key={iteration.index} className="rounded border border-[#c5a059]/10 bg-black/35 p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-[#fde68a]">Iteração {iteration.index + 1}</span>
                      <span>{iteration.retryRequested ? "retry solicitado" : "sem retry registrado"}</span>
                    </div>
                    <p className="mt-2 text-white/50">C(m): {formatScore(iteration.coherence)} · modelo: {iteration.candidateModelIdentifier || "nao registrado"} · latência: {formatDuration(iteration.stageLatencyMs)}</p>
                    <p className="mt-2 text-white/40">Findings: {(iteration.findingCodes || []).join(", ") || "nenhum código registrado"}</p>
                  </div>
                ))}
              </div>
            </DetailSection>

            <DetailSection title="Vigia">
              <p className="mb-3 text-sm text-white/60">{detail.vigia.formula}</p>
              <div className="space-y-3">
                {(detail.vigia.dimensions || []).map((dimension: any) => (
                  <div key={dimension.name}>
                    <div className="mb-1 flex justify-between text-xs text-white/60">
                      <span>{dimension.name}</span>
                      <span className="font-mono">{formatScore(dimension.score)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-[#c5a059]" style={{ width: `${Math.max(0, Math.min(1, dimension.score || 0)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-white/45">Theta: {formatScore(detail.vigia.threshold)} · hard failures: {(detail.vigia.hardFailures || []).join(", ") || "nenhum registrado"}</p>
            </DetailSection>

            <DetailSection title="Double Vigilance">
              <div className="grid gap-3 md:grid-cols-2">
                <AxisCard title="Scientist - eixo veritativo" axis={detail.doubleVigilance.scientist} />
                <AxisCard title="Philosopher - eixo ético-epistemológico" axis={detail.doubleVigilance.philosopher} />
              </div>
            </DetailSection>

            <DetailSection title="Persistência">
              <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <KeyValue label="Entrega" value={deliveryLabel(detail.persistence.deliveryStatus)} />
                <KeyValue label="Mensagem persistida" value={detail.persistence.assistantMessagePersisted ? "sim" : "nao"} />
                <KeyValue label="Auditoria persistida" value={detail.persistence.auditPersisted ? "sim" : "nao"} />
                <KeyValue label="Efeitos opcionais" value={sideEffectLabel(detail.persistence.sideEffectStatus)} />
                <KeyValue label="Memória" value={String(detail.persistence.memoryEffectCount)} />
                <KeyValue label="Registry" value={String(detail.persistence.registryEffectCount)} />
                <KeyValue label="Destiny" value={String(detail.persistence.destinyEffectCount)} />
                <KeyValue label="Razão" value={detail.persistence.reason || "sem razão registrada"} />
              </dl>
            </DetailSection>

            <DetailSection title="Privacidade">
              <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <KeyValue label="Execução privada" value={detail.privacy.privateRun ? "sim" : "nao"} />
                <KeyValue label="Metadata-only" value={detail.privacy.metadataOnly ? "sim" : "nao"} />
                <KeyValue label="Contextos bloqueados" value={String(detail.privacy.blockedContextCount)} />
                <KeyValue label="Finding codes" value={(detail.privacy.privacyFindingCodes || []).join(", ") || "nenhum"} />
                <KeyValue label="Hashes presentes" value={Object.entries(detail.privacy.contentHashPresence || {}).filter(([, present]) => present).map(([key]) => key).join(", ") || "nenhum"} />
                <KeyValue label="Comprimentos" value={JSON.stringify(detail.privacy.contentLengths || {})} mono />
              </dl>
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

function AxisCard({ title, axis }: { title: string; axis: any }) {
  return (
    <article className="rounded border border-[#c5a059]/10 bg-black/35 p-3">
      <h4 className="text-sm font-bold text-[#fde68a]">{title}</h4>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-white/35">{axis.roleLabel}</p>
      <p className="mt-3 text-xs text-white/65">Status: {axis.approved ? "sem rejeição registrada" : "finding registrado"}</p>
      <p className="mt-2 text-xs text-white/45">Findings: {(axis.findingCodes || []).join(", ") || "nenhum código registrado"}</p>
    </article>
  );
}
