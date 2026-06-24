export function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "sem dados";
  return `${Math.round(value * 100)}%`;
}

export function formatScore(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "n/a";
  return value.toFixed(2);
}

export function formatDuration(ms: number | null | undefined) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "n/a";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function promotionLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    promoted: "Promovida",
    rejected: "Rejeitada",
    failed_safe: "Falhou em modo seguro",
    shadow_only: "Observada em sombra",
  };
  return labels[value || ""] || "Desconhecida";
}

export function deliveryLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    not_attempted: "Nao tentada",
    persisted: "Persistida",
    failed: "Falha de entrega",
    shadow_external: "Entrega legada observada",
  };
  return labels[value || ""] || "Desconhecida";
}

export function sideEffectLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    none: "Nenhum efeito",
    skipped: "Ignorados",
    blocked: "Bloqueados",
    committed: "Confirmados",
    failed_rolled_back: "Revertidos",
  };
  return labels[value || ""] || "Desconhecidos";
}

export function statusTone(value: string | null | undefined) {
  if (value === "promoted" || value === "persisted" || value === "committed") {
    return "success";
  }
  if (value === "rejected" || value === "skipped" || value === "shadow_only" || value === "shadow_external" || value === "none") {
    return "neutral";
  }
  if (value === "blocked" || value === "failed_rolled_back") {
    return "warning";
  }
  if (value === "failed_safe" || value === "failed") {
    return "danger";
  }
  return "unknown";
}

export function statusClass(value: string | null | undefined) {
  const tone = statusTone(value);
  const classes: Record<string, string> = {
    success: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    neutral: "border-white/20 bg-white/5 text-white/70",
    warning: "border-amber-400/45 bg-amber-500/10 text-amber-100",
    danger: "border-red-400/45 bg-red-500/10 text-red-100",
    unknown: "border-slate-400/30 bg-slate-500/10 text-slate-100",
  };
  return classes[tone];
}

export function emptyStateCopy(kind: "no-audits" | "no-results" | "diagnostic") {
  if (kind === "diagnostic") {
    return {
      title: "Auditoria cognitiva indisponivel",
      body: "A tabela de auditoria pode estar ausente ou a migracao ainda nao foi aplicada.",
    };
  }
  if (kind === "no-results") {
    return {
      title: "Nenhuma execucao encontrada",
      body: "Os filtros atuais nao retornaram auditorias cognitivas.",
    };
  }
  return {
    title: "Sala silenciosa",
    body: "Ainda nao ha auditorias cognitivas para observar. Quando o runtime operar, os metadados aparecerao aqui.",
  };
}

export function rowDetailUrl(runId: string) {
  return `/admin/sala-de-maquinas?runId=${encodeURIComponent(runId)}`;
}
