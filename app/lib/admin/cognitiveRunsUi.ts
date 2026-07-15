type RunLike = {
  runtimeMode?: string | null;
  promotionDecision?: string | null;
  deliveryStatus?: string | null;
  sideEffectStatus?: string | null;
  iterationCount?: number | null;
  coherence?: number | null;
  coherenceThreshold?: number | null;
  retryRequested?: boolean | null;
  findingCodes?: string[] | null;
  privateRun?: boolean | null;
};

type DetailLike = {
  identity?: {
    runtimeMode?: string | null;
    promotionDecision?: string | null;
    deliveryStatus?: string | null;
    executionProfile?: string | null;
  };
  iterations?: Array<{
    coherence?: number | null;
    retryRequested?: boolean | null;
    findingCodes?: string[] | null;
  }>;
  persistence?: {
    deliveryStatus?: string | null;
    sideEffectStatus?: string | null;
  };
  vigia?: {
    threshold?: number | null;
    finalCoherence?: number | null;
  };
  findingCodes?: string[] | null;
};

export type FindingDictionaryEntry = {
  code: string;
  category: string;
  explanation: string;
  severity: "info" | "warning" | "error" | "critical" | "unknown";
  effect: string;
  requires: string;
};

export const legacyShadowWarning =
  "ROTA LEGADA OBSERVADA - Esta resposta nao passou pelo ciclo O-C-V. C(m), theta, retries e Double Vigilance nao foram calculados. O registro comprova observacao, nao governanca cognitiva.";

export const insufficientDoubleVigilanceTelemetry =
  "Sem telemetria suficiente para comprovar a avaliacao completa.";

export const metricExplanations = {
  runs: {
    label: "RUNS",
    tooltip: "Numero de execucoes registradas no recorte atual.",
    expanded: "Conta registros da tabela cognitive_run_audits depois dos filtros ativos.",
  },
  rejectionRate: {
    label: "REJEICAO",
    tooltip: "Percentual de execucoes governadas em que o runtime examinou uma resposta e decidiu nao promove-la.",
    expanded: "Usa promotionDecision = rejected. Registros shadow_only ficam fora do numerador e do denominador.",
  },
  promotionRate: {
    label: "PROMOCAO",
    tooltip: "Percentual de execucoes efetivamente promovidas pelo runtime.",
    expanded: "Usa promotionDecision = promoted. Registros shadow_only nao contam como promocao.",
  },
  averageCoherence: {
    label: "C(M) MEDIO",
    tooltip: "Media do indice operacional de coerencia somente nas execucoes em que C(m) foi calculado.",
    expanded: "Ignora coherence nulo e informa quantos registros validos sustentam a media.",
  },
  theta: {
    label: "THETA",
    tooltip: "Limite minimo necessario para aprovacao pelo Vigia quando esse limite foi armazenado.",
    expanded: "Runs OCV novos persistem theta por execucao; quando ausente, exibimos Nao armazenado.",
  },
  averageIterations: {
    label: "ITERACOES MEDIAS",
    tooltip: "Numero medio de respostas candidatas examinadas por execucao cognitiva real.",
    expanded: "Execucoes observacionais sem ciclo O-C-V nao devem ser lidas como zero trabalho cognitivo.",
  },
  retryRate: {
    label: "RETRIES",
    tooltip: "Percentual de execucoes com rejeicao provisoria e nova candidata gerada.",
    expanded: "Derivado da transicao OCV_RETRY_REQUESTED quando preservada no registro.",
  },
  failedSafeRate: {
    label: "FAILED-SAFE",
    tooltip: "Execucoes encerradas de forma segura, sem entrega de candidata nao validada.",
    expanded: "Usa promotionDecision = failed_safe.",
  },
  latency: {
    label: "LATENCIA",
    tooltip: "Tempo entre inicio e encerramento da execucao registrada.",
    expanded: "A API diferencia total, runtime, rota legada e etapas quando latencyPerStageMs existe.",
  },
  deliveryFailures: {
    label: "FALHAS DE ENTREGA",
    tooltip: "Resposta aprovada, mas nao persistida ou entregue corretamente.",
    expanded: "Usa deliveryStatus = failed.",
  },
  auditFailures: {
    label: "FALHAS DE AUDITORIA",
    tooltip: "Execucao cujo registro tecnico nao pode ser preservado.",
    expanded: "Derivado de eventos AUDIT_PERSISTENCE_FAILURE quando preservados.",
  },
  blockedEffects: {
    label: "EFEITOS BLOQUEADOS",
    tooltip: "Memoria, Registry ou Destiny propostos, mas nao autorizados.",
    expanded: "Usa sideEffectStatus = blocked e findings de autorizacao quando disponiveis.",
  },
  rolledBackEffects: {
    label: "EFEITOS REVERTIDOS",
    tooltip: "Efeitos cuja transacao falhou e foi desfeita.",
    expanded: "Usa sideEffectStatus = failed_rolled_back.",
  },
  privateRuns: {
    label: "EXECUCOES PRIVADAS",
    tooltip: "Execucoes submetidas a politicas especiais de privacidade e minimizacao de dados.",
    expanded: "Usa privateRun = true e nunca expoe texto bruto.",
  },
} as const;

export const tableColumnGuide = [
  ["Persona / Place", "Quem respondeu e em qual lugar simbolico ou operacional a execucao ocorreu."],
  ["Modo", "off, shadow ou enforce. Shadow observa; enforce submete a entrega as decisoes do runtime."],
  ["Perfil", "Intensidade configurada do runtime: light, standard ou full."],
  ["C(m)", "Indice operacional de coerencia calculado pelo Vigia. Nao calculado nao equivale a zero."],
  ["Theta", "Limite de aprovacao do Vigia. Nao armazenado nao deve ser lido como 0,80."],
  ["Iteracoes", "Quantidade de candidatas examinadas pelo ciclo O-C-V."],
  ["Decisao", "Resultado do Promotion Gate: promovida, rejeitada, failed-safe ou apenas observada."],
  ["Entrega", "Se a resposta foi persistida, falhou, nao foi tentada ou veio da rota legada observada."],
  ["Efeitos", "Estado de memoria, Registry ou Linha do Destino propostos pelo runtime."],
  ["Privacidade", "Indica execucao com minimizacao especial de dados."],
  ["Latencia", "Tempo total registrado e, no detalhe, tempos por etapa quando presentes."],
  ["Finding Codes", "Codigos tecnicos produzidos por validadores, politicas e gates."],
] as const;

export const creatorFlowSteps = [
  "Entrada do usuario",
  "Geracao de resposta candidata",
  "Extracao de afirmacoes e acoes",
  "Avaliacao do Cientista",
  "Calculo do Vigia",
  "Eventual correcao e nova tentativa",
  "Avaliacao do Filosofo",
  "Promocao ou rejeicao",
  "Entrega",
  "Execucao autorizada de efeitos",
] as const;

export const findingDictionary: Record<string, FindingDictionaryEntry> = {
  SCIENTIST_SIMULATED_ACCESS: {
    code: "SCIENTIST_SIMULATED_ACCESS",
    category: "Cientista",
    explanation: "A candidata aparentou declarar acesso, auditoria ou verificacao que nao estava no contexto autorizado.",
    severity: "critical",
    effect: "Bloqueia promocao ate a alegacao ser removida ou reparada.",
    requires: "retry ou rejeicao",
  },
  SCIENTIST_UNSUPPORTED_BIOGRAPHY: {
    code: "SCIENTIST_UNSUPPORTED_BIOGRAPHY",
    category: "Cientista",
    explanation: "A candidata fez alegacao biografica sem sustentacao no contexto autorizado.",
    severity: "critical",
    effect: "Impede promocao da candidata.",
    requires: "retry ou rejeicao",
  },
  SCIENTIST_CANDIDATE_ONLY_CLAIM: {
    code: "SCIENTIST_CANDIDATE_ONLY_CLAIM",
    category: "Cientista",
    explanation: "Uma afirmacao se apoiava apenas no texto da propria candidata.",
    severity: "warning",
    effect: "Pode exigir reparo, especialmente em perfil full.",
    requires: "retry possivel",
  },
  SCIENTIST_CONTRADICTED_BY_AVAILABLE_EVIDENCE: {
    code: "SCIENTIST_CONTRADICTED_BY_AVAILABLE_EVIDENCE",
    category: "Cientista",
    explanation: "Uma afirmacao contradisse a mensagem atual ou o contexto autorizado.",
    severity: "error",
    effect: "Bloqueia promocao enquanto a contradicao existir.",
    requires: "retry ou rejeicao",
  },
  PHILOSOPHER_IDOLATRY_RISK: {
    code: "PHILOSOPHER_IDOLATRY_RISK",
    category: "Filosofo",
    explanation: "A candidata usou linguagem de autoridade absoluta, culto ou idolatria.",
    severity: "critical",
    effect: "Impede entrega governada.",
    requires: "retry ou rejeicao",
  },
  PHILOSOPHER_DEPENDENCY_RISK: {
    code: "PHILOSOPHER_DEPENDENCY_RISK",
    category: "Filosofo",
    explanation: "A candidata incentivou dependencia do sistema ou reduziu soberania do usuario.",
    severity: "error",
    effect: "Impede promocao ate reparo.",
    requires: "retry ou rejeicao",
  },
  PROMOTION_COHERENCE_FAILED: {
    code: "PROMOTION_COHERENCE_FAILED",
    category: "Promotion Gate",
    explanation: "O indice C(m) nao passou de theta ou houve hard failure.",
    severity: "error",
    effect: "A candidata nao pode ser promovida.",
    requires: "retry ou rejeicao",
  },
  PROMOTION_SCIENTIST_NOT_APPROVED: {
    code: "PROMOTION_SCIENTIST_NOT_APPROVED",
    category: "Promotion Gate",
    explanation: "O Cientista nao aprovou a candidata.",
    severity: "error",
    effect: "Bloqueia promocao.",
    requires: "retry ou rejeicao",
  },
  PROMOTION_PHILOSOPHER_REJECTED: {
    code: "PROMOTION_PHILOSOPHER_REJECTED",
    category: "Promotion Gate",
    explanation: "O Filosofo rejeitou a candidata.",
    severity: "error",
    effect: "Bloqueia promocao.",
    requires: "retry ou rejeicao",
  },
  PROMOTION_PRIVACY_FAILED: {
    code: "PROMOTION_PRIVACY_FAILED",
    category: "Privacidade",
    explanation: "A avaliacao de privacidade nao teve hard-pass.",
    severity: "error",
    effect: "Impede entrega da candidata.",
    requires: "retry, rejeicao ou failed-safe",
  },
  PROMOTION_VOCATION_FAILED: {
    code: "PROMOTION_VOCATION_FAILED",
    category: "Vocacao",
    explanation: "A tarefa ficou fora da vocacao permitida para o persona ativo.",
    severity: "error",
    effect: "Impede promocao sem reparo ou recusa adequada.",
    requires: "retry ou rejeicao",
  },
  PROMOTION_SIDE_EFFECT_AUTH_FAILED: {
    code: "PROMOTION_SIDE_EFFECT_AUTH_FAILED",
    category: "Efeitos",
    explanation: "A autorizacao de efeitos opcionais falhou.",
    severity: "error",
    effect: "Bloqueia ou descarta efeitos nao autorizados.",
    requires: "bloqueio de efeitos",
  },
  SIDE_EFFECTS_BLOCKED: {
    code: "SIDE_EFFECTS_BLOCKED",
    category: "Efeitos",
    explanation: "Um ou mais efeitos opcionais foram bloqueados pela politica de autorizacao.",
    severity: "warning",
    effect: "Nada e gravado em memoria, Registry ou Linha do Destino sem autorizacao.",
    requires: "bloqueio de efeitos",
  },
  SIDE_EFFECT_MEMORY_UNAUTHORIZED_DISCARDED: {
    code: "SIDE_EFFECT_MEMORY_UNAUTHORIZED_DISCARDED",
    category: "Efeitos",
    explanation: "Uma acao de memoria longa foi descartada por falta de autorizacao explicita.",
    severity: "warning",
    effect: "Memoria nao alterada.",
    requires: "bloqueio de efeitos",
  },
  SIDE_EFFECT_REGISTRY_UNAUTHORIZED_DISCARDED: {
    code: "SIDE_EFFECT_REGISTRY_UNAUTHORIZED_DISCARDED",
    category: "Efeitos",
    explanation: "Uma acao de Registry foi descartada por falta de autorizacao explicita.",
    severity: "warning",
    effect: "Registro nao criado.",
    requires: "bloqueio de efeitos",
  },
  SIDE_EFFECT_DESTINY_UNAUTHORIZED_DISCARDED: {
    code: "SIDE_EFFECT_DESTINY_UNAUTHORIZED_DISCARDED",
    category: "Efeitos",
    explanation: "Uma acao da Linha do Destino foi descartada por falta de autorizacao explicita.",
    severity: "warning",
    effect: "Linha do Destino nao alterada.",
    requires: "bloqueio de efeitos",
  },
  PRIVACY_CONTEXT_BLOCKED: {
    code: "PRIVACY_CONTEXT_BLOCKED",
    category: "Privacidade",
    explanation: "Itens privados de contexto foram bloqueados pela politica centralizada.",
    severity: "info",
    effect: "O runtime prossegue apenas com contexto autorizado.",
    requires: "sem retry obrigatorio",
  },
  PRIVACY_EXTRACTOR_CONCERN: {
    code: "PRIVACY_EXTRACTOR_CONCERN",
    category: "Privacidade",
    explanation: "O extrator identificou possivel material sensivel ou privado.",
    severity: "error",
    effect: "Pode impedir promocao ate remocao ou generalizacao.",
    requires: "retry ou rejeicao",
  },
  VOCATION_FORBIDDEN_TASK_FAMILY: {
    code: "VOCATION_FORBIDDEN_TASK_FAMILY",
    category: "Vocacao",
    explanation: "A familia de tarefa nao pertence a vocacao permitida para o persona.",
    severity: "error",
    effect: "Exige recusa, handoff ou reparo vocacional.",
    requires: "retry ou rejeicao",
  },
  GENERIC_ASSISTANT_MODE: {
    code: "GENERIC_ASSISTANT_MODE",
    category: "Iniciativa do persona",
    explanation: "A resposta caiu em modo assistente generico, apagando a vocacao do persona.",
    severity: "warning",
    effect: "Pode solicitar reparo para restaurar voz e funcao.",
    requires: "retry possivel",
  },
  GENERIC_INTERVIEW_MODE: {
    code: "GENERIC_INTERVIEW_MODE",
    category: "Iniciativa do persona",
    explanation: "A resposta apenas entrevistou o usuario em vez de agir a partir do contexto disponivel.",
    severity: "warning",
    effect: "Pode solicitar nova candidata com mais iniciativa.",
    requires: "retry possivel",
  },
  FALSE_CONTEXT_DENIAL: {
    code: "FALSE_CONTEXT_DENIAL",
    category: "Iniciativa do persona",
    explanation: "A resposta negou contexto que estava autorizado ou disponivel.",
    severity: "warning",
    effect: "Pode solicitar reparo contextual.",
    requires: "retry possivel",
  },
  PASSIVE_CONTEXT_WITHHOLDING: {
    code: "PASSIVE_CONTEXT_WITHHOLDING",
    category: "Iniciativa do persona",
    explanation: "A resposta reteve contexto util que poderia orientar a acao.",
    severity: "warning",
    effect: "Pode solicitar resposta mais situada.",
    requires: "retry possivel",
  },
  GENERIC_CLOSING: {
    code: "GENERIC_CLOSING",
    category: "Iniciativa do persona",
    explanation: "A resposta encerrou com formula generica de atendimento.",
    severity: "info",
    effect: "Sinaliza perda leve de estilo/vocacao.",
    requires: "sem retry obrigatorio",
  },
};

export function describeFindingCode(code: string): FindingDictionaryEntry {
  return findingDictionary[code] || {
    code,
    category: inferFindingCategory(code),
    explanation: "Codigo registrado pela auditoria, mas sem verbete especifico neste dicionario.",
    severity: "unknown",
    effect: "Verificar eventos e contexto tecnico do detalhe.",
    requires: "indeterminado",
  };
}

export function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "sem dados";
  return `${Math.round(value * 100)}%`;
}

export function formatScore(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "n/a";
  return value.toFixed(2);
}

export function formatCoherence(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Não calculado";
  return value.toFixed(2);
}

export function formatThreshold(value: number | null | undefined, short = false) {
  if (typeof value !== "number" || !Number.isFinite(value)) return short ? "Não armazenado" : "Não armazenado nesta auditoria";
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
  if (value === "promoted" || value === "persisted" || value === "committed" || value === "runtime_governed") {
    return "success";
  }
  if (value === "rejected" || value === "candidate_rejected" || value === "failed_safe") {
    return "danger";
  }
  if (value === "blocked" || value === "failed_rolled_back" || value === "legacy_shadow" || value === "shadow_only" || value === "shadow_external") {
    return "warning";
  }
  if (value === "skipped" || value === "none" || value === "not_attempted") {
    return "neutral";
  }
  if (value === "failed") {
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
    title: "Nenhuma execucao cognitiva auditada foi registrada neste ambiente.",
    body: "O runtime pode estar em modo off, a migracao pode nao ter sido aplicada ou ainda nao houve uma execucao em shadow/enforce.",
  };
}

export function rowDetailUrl(runId: string) {
  return `/admin/sala-de-maquinas?runId=${encodeURIComponent(runId)}`;
}

export function isLegacyShadowObservation(run: RunLike) {
  return run.runtimeMode === "shadow"
    && run.promotionDecision === "shadow_only"
    && run.deliveryStatus === "shadow_external"
    && Number(run.iterationCount || 0) === 0
    && run.coherence == null;
}

export function contextualBadges(run: RunLike) {
  const badges: Array<{ value: string; label: string; explanation: string }> = [];
  if (isLegacyShadowObservation(run)) {
    badges.push({
      value: "legacy_shadow",
      label: "ROTA LEGADA OBSERVADA",
      explanation: legacyShadowWarning,
    });
  }
  if (run.runtimeMode === "enforce" && run.promotionDecision === "promoted" && run.deliveryStatus === "persisted") {
    badges.push({
      value: "runtime_governed",
      label: "RUNTIME GOVERNOU A RESPOSTA",
      explanation: "A execucao estava em enforce, foi promovida e a entrega foi persistida.",
    });
  }
  if (run.promotionDecision === "rejected") {
    badges.push({
      value: "candidate_rejected",
      label: "CANDIDATA REJEITADA PELO RUNTIME",
      explanation: "O runtime examinou a candidata e decidiu nao promove-la.",
    });
  }
  if (run.promotionDecision === "failed_safe") {
    badges.push({
      value: "failed_safe",
      label: "EXECUCAO ENCERRADA SEM ENTREGA DE CANDIDATA NAO VALIDADA",
      explanation: "A execucao terminou de forma segura, sem entregar uma candidata nao validada.",
    });
  }
  return badges;
}

export function coherenceTooltip(run: RunLike) {
  if (run.coherence == null) {
    return isLegacyShadowObservation(run)
      ? "Nao calculado porque esta auditoria observa a rota legada sem executar iteracoes O-C-V."
      : "Nao calculado ou nao preservado nesta auditoria.";
  }
  return "C(m) calculado pelo Vigia para esta execucao.";
}

export function thresholdTooltip(run: RunLike) {
  if (run.coherenceThreshold == null) {
    return "Theta nao foi preservado nesta auditoria; nao presumir 0,80.";
  }
  return "Theta armazenado para esta execucao.";
}

export function doubleVigilanceMessage(input: {
  iterationCount?: number | null;
  dimensionCount?: number | null;
  scientistFindingCodes?: string[] | null;
  philosopherFindingCodes?: string[] | null;
  modelIdentifiers?: string[] | null;
}) {
  const hasIterations = Number(input.iterationCount || 0) > 0;
  const hasDimensions = Number(input.dimensionCount || 0) > 0;
  const models = (input.modelIdentifiers || []).join(" ").toLowerCase();
  const hasScientistTrace = (input.scientistFindingCodes || []).length > 0 || models.includes("scientist");
  const hasPhilosopherTrace = (input.philosopherFindingCodes || []).length > 0 || models.includes("philosopher");

  if (!hasIterations || !hasDimensions || !hasScientistTrace || !hasPhilosopherTrace) {
    return insufficientDoubleVigilanceTelemetry;
  }

  return "Ha telemetria tecnica parcial para Cientista, Vigia e Filosofo; confira os codigos e scores abaixo.";
}

export function buildRunNarrative(detail: DetailLike) {
  const identity = detail.identity || {};
  const persistence = detail.persistence || {};
  const iterations = detail.iterations || [];
  const run: RunLike = {
    runtimeMode: identity.runtimeMode,
    promotionDecision: identity.promotionDecision,
    deliveryStatus: persistence.deliveryStatus || identity.deliveryStatus,
    iterationCount: iterations.length,
    coherence: detail.vigia?.finalCoherence ?? iterations.at(-1)?.coherence ?? null,
  };

  if (isLegacyShadowObservation(run)) {
    return "Esta foi uma observacao em shadow da rota legada. Nenhuma iteracao O-C-V foi executada e nenhum indice de coerencia foi calculado.";
  }

  if (identity.promotionDecision === "promoted") {
    const finalCoherence = formatCoherence(run.coherence);
    const theta = formatThreshold(detail.vigia?.threshold, true);
    const retryText = iterations.some((iteration) => iteration.retryRequested)
      ? " houve retry antes da candidata final,"
      : "";
    return `Esta execucao produziu ${iterations.length} candidata${iterations.length === 1 ? "" : "s"}.${retryText} a candidata final obteve C(m) ${finalCoherence}, theta ${theta}, e foi promovida pelo runtime.`;
  }

  if (identity.promotionDecision === "rejected") {
    return `Esta execucao examinou ${iterations.length} candidata${iterations.length === 1 ? "" : "s"} e terminou com rejeicao do runtime.`;
  }

  if (identity.promotionDecision === "failed_safe") {
    return "Esta execucao terminou em failed-safe: nenhuma candidata nao validada foi entregue.";
  }

  if (identity.promotionDecision === "shadow_only") {
    return "Esta execucao foi observada em shadow. O registro demonstra observacao, nao necessariamente governanca da entrega.";
  }

  return "Esta execucao possui metadados tecnicos parciais; use os campos abaixo para auditar o que foi realmente registrado.";
}

function inferFindingCategory(code: string) {
  if (code.startsWith("SCIENTIST_")) return "Cientista";
  if (code.startsWith("PHILOSOPHER_")) return "Filosofo";
  if (code.startsWith("PROMOTION_")) return "Promotion Gate";
  if (code.startsWith("PRIVACY_")) return "Privacidade";
  if (code.startsWith("VOCATION_")) return "Vocacao";
  if (code.startsWith("SIDE_EFFECT")) return "Efeitos";
  if (code.startsWith("GENERIC_") || code.startsWith("FALSE_") || code.startsWith("PASSIVE_")) return "Iniciativa do persona";
  return "Indeterminado";
}
