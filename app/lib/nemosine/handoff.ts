import { ENTITIES } from "@/app/data/entities";
import { getPersonaBehaviorContract } from "@/app/lib/nemosine/persona_behavior_contracts";

export type PersonaHandoffOffer = {
  sourcePersona: string;
  targetPersona: string;
  targetSlug: string;
  title: string;
  reason: string;
  summary: string;
  draft: string;
  requiresConfirmation: boolean;
  state?: HandoffState;
  eventMessageId?: string | null;
  originMessageId?: string | null;
  offeredAt?: string | null;
  updatedAt?: string | null;
};

const HANDOFF_MARKER_PATTERN = /\[\[NEMOSINE_HANDOFF:([^\]]+)\]\]/g;

export type HandoffState = "offered" | "opened" | "invited" | "declined" | "unavailable";
export type CurrentPersonaFit = "primary" | "valid" | "partial" | "incompatible";

export type VocationalTargetResolution = {
  currentPersonaCanContinue: boolean;
  currentPersonaFit: CurrentPersonaFit;
  primaryTargetPersonaId: string | null;
  alternativeTargetPersonaIds: string[];
  rationaleByPersona: Record<string, string>;
  confidence: number;
  routingReason: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function personaSlug(personaName: string) {
  const entity = Object.entries(ENTITIES).find(([, item]) => item.type === "persona" && item.name === personaName);
  return entity?.[0] || normalize(personaName).replace(/\s+/g, "-");
}

function personaExists(personaName: string) {
  return Object.values(ENTITIES).some((item) => item.type === "persona" && item.name === personaName);
}

export function sanitizeHandoffSummary(text: string, maxLength = 180) {
  const cleaned = text
    .replace(/\[\[NEMOSINE_[^\]]+\]\]/g, " ")
    .replace(/\[NEMOSINE_FILE:[^\]]+\]/g, "arquivo anexado")
    .replace(/\[NEMOSINE_AUDIO\]/g, "audio anexado")
    .replace(/\[CONTEUDO DO ARQUIVO ANEXADO[\s\S]*$/i, "arquivo anexado")
    .replace(/\[TRANSCRICAO DE AUDIO ANEXADO[\s\S]*$/i, "audio anexado")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "um tema encaminhado pela conversa anterior";
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 3).trim()}...` : cleaned;
}

function mentionedPersona(text: string) {
  const normalized = normalize(text);
  return Object.values(ENTITIES)
    .filter((item) => item.type === "persona")
    .find((item) => {
      const personaName = normalize(item.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|\\s)${personaName}(?=\\s|$)`).test(normalized);
    })?.name || null;
}

function allPersonaNames() {
  return Object.values(ENTITIES)
    .filter((item) => item.type === "persona")
    .map((item) => item.name);
}

function tokenHits(text: string, terms: string[]) {
  const normalized = normalize(text);
  return terms.filter((term) => normalized.includes(normalize(term))).length;
}

function evaluateCurrentPersonaFit(input: {
  currentPersona: string;
  text: string;
  signals: string[];
}): CurrentPersonaFit {
  const contract = getPersonaBehaviorContract(input.currentPersona);
  const normalizedPersona = normalize(input.currentPersona);
  const missionHits = tokenHits(input.text, [contract.operationalMission, contract.expectedInference, ...contract.lexicalHints]);
  const contextHits = tokenHits(input.text, contract.contextToSeek);
  const prohibitionHits = tokenHits(input.text, contract.prohibitions);

  if (contract.family === "emotional" && input.signals.some((signal) => ["emotional", "human-posture", "professional-conflict"].includes(signal))) {
    return missionHits + contextHits >= 1 ? "primary" : "valid";
  }
  if (/\bpsic|terapeut/.test(normalizedPersona) && input.signals.some((signal) => ["emotional", "human-posture", "professional-conflict"].includes(signal))) {
    return "primary";
  }
  if (input.signals.includes("emotional") && input.signals.includes("professional-conflict")) {
    return "valid";
  }
  if (contract.family === "strategic" && input.signals.some((signal) => ["professional-conflict", "strategy", "authority"].includes(signal))) {
    return missionHits + contextHits >= 1 ? "primary" : "valid";
  }
  if (contract.family === "operational" && input.signals.some((signal) => ["work-organization", "technical", "evidence"].includes(signal))) {
    return missionHits + contextHits >= 1 ? "primary" : "valid";
  }
  if (contract.family === "symbolic" && input.signals.some((signal) => ["symbolic", "narrative"].includes(signal))) {
    return missionHits + contextHits >= 1 ? "primary" : "valid";
  }
  if (missionHits + contextHits >= 2) return "primary";
  if (missionHits + contextHits === 1) return "valid";
  if (prohibitionHits > 0) return "partial";
  return "partial";
}

function classifyVocationalNeed(text: string) {
  const normalized = normalize(text);
  const signals: string[] = [];
  if (/\b(chefe|superior|lider|lideranca|autoridade|reuniao|demanda|solicitacoes|pedido|prioridade|prazo|trabalho|profissional|equipe)\b/.test(normalized)) {
    signals.push("professional-conflict");
  }
  if (/\b(plano|estrategia|prioridade|opcoes|contingencia|decidir|abordagem)\b/.test(normalized)) signals.push("strategy");
  if (/\b(comando|autoridade|superior|lideranca|comunicacao|cadeia|cobranca)\b/.test(normalized)) signals.push("authority");
  if (/\b(registro|organizar|acompanhar|fluxo|demandas|dados|reuniao|entregas|documentar)\b/.test(normalized)) signals.push("work-organization");
  if (/\b(postura|discernimento|equilibrio|relacao|humana|conversa|conduzir)\b/.test(normalized)) signals.push("human-posture");
  if (/\b(fato|evidencia|hipotese|padrao|criterio|observavel|testar|experimento|dados)\b/.test(normalized)) signals.push("evidence");
  if (/\b(narrativa|historia|autor|texto|escrever|forma|cena|relato)\b/.test(normalized)) signals.push("narrative");
  if (/\b(simbolo|imagem|metafora|sentido|rito)\b/.test(normalized)) signals.push("symbolic");
  if (/\b(contrato|juridico|lei|processo)\b/.test(normalized)) signals.push("legal");
  if (/\b(codigo|bug|deploy|api|banco|sistema)\b/.test(normalized)) signals.push("technical");
  if (/\b(ansiedade|sentimento|medo|terapia|dor|relacao|estresse|stress|estressado|sono|dormir|dormindo|inseguranca|corporal)\b/.test(normalized)) signals.push("emotional");
  return signals.length ? Array.from(new Set(signals)) : ["general"];
}

function rationaleForPersona(persona: string, signals: string[]) {
  const key = normalize(persona);
  if (key === "estrategista") return "Para organizar opcoes, prioridades, riscos e um plano de abordagem.";
  if (key === "comandante") return "Para tratar autoridade, lideranca e comunicacao com o superior.";
  if (key === "adjunto") return "Para estruturar registro de demandas, entregas e acompanhamento.";
  if (key === "mentor") return "Para calibrar postura, discernimento e conducao humana da relacao profissional.";
  if (key === "cientista") return "Para separar fatos, hipoteses, padroes e criterios observaveis.";
  if (key === "engenheiro") return "Para transformar o problema em fluxo, causa provavel e teste operacional.";
  if (key === "advogado") return "Para organizar risco juridico, argumento e documentos.";
  const contract = getPersonaBehaviorContract(persona);
  const mission = contract.operationalMission
    .replace(/Aplicar essa missao[\s\S]*$/i, "")
    .replace(/preservando diferenca de voz e funcao/ig, "")
    .replace(/\.$/, "")
    .trim();
  return `${mission}${signals.includes("general") ? "" : "."}`;
}

export function resolveVocationalTargets(input: {
  currentPersona: string;
  userText: string;
  contextText?: string | null;
  maxTargets?: number;
}): VocationalTargetResolution {
  const combined = [input.userText, input.contextText || ""].join("\n");
  const directMention = mentionedPersona(combined);
  if (directMention && directMention !== input.currentPersona) {
    return {
      currentPersonaCanContinue: false,
      currentPersonaFit: "partial",
      primaryTargetPersonaId: directMention,
      alternativeTargetPersonaIds: [],
      rationaleByPersona: { [directMention]: rationaleForPersona(directMention, classifyVocationalNeed(combined)) },
      confidence: 0.95,
      routingReason: "persona mencionada diretamente pelo usuario",
    };
  }

  const signals = classifyVocationalNeed(combined);
  const currentPersonaFit = evaluateCurrentPersonaFit({
    currentPersona: input.currentPersona,
    text: combined,
    signals,
  });
  const scored = allPersonaNames()
    .filter((persona) => persona !== input.currentPersona)
    .map((persona) => {
      const contract = getPersonaBehaviorContract(persona);
      let score = tokenHits(combined, [...contract.lexicalHints, contract.operationalMission, contract.expectedInference]) * 2;
      const key = normalize(persona);
      if (signals.includes("professional-conflict")) {
        if (key === "estrategista") score += 22;
        if (key === "comandante") score += 8;
        if (key === "adjunto") score += 7;
        if (key === "mentor") score += 5;
        if (key === "cientista") score += 4;
      }
      if (signals.includes("strategy") && key === "estrategista") score += 7;
      if (signals.includes("authority") && key === "comandante") score += 7;
      if (signals.includes("work-organization") && key === "adjunto") score += 7;
      if (signals.includes("human-posture") && key === "mentor") score += 6;
      if (signals.includes("evidence") && key === "cientista") score += 5;
      if (signals.includes("technical") && key === "engenheiro") score += 8;
      if (signals.includes("legal") && key === "advogado") score += 8;
      if (signals.includes("emotional") && /psicologo|terapeuta|confessor/.test(key)) score += 6;
      if (contract.family === "strategic" && signals.some((signal) => ["professional-conflict", "strategy", "authority"].includes(signal))) score += 2;
      if (contract.family === "operational" && signals.includes("work-organization")) score += 2;
      if (contract.family === "emotional" && signals.includes("human-posture")) score += 1;
      return { persona, score, rationale: rationaleForPersona(persona, signals) };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  const selected = scored.slice(0, Math.max(1, input.maxTargets || 3));
  const top = selected[0];
  const currentPersonaCanContinue = currentPersonaFit === "primary" || currentPersonaFit === "valid" || currentPersonaFit === "partial";
  if (!top || top.score < 4) {
    return {
      currentPersonaCanContinue: true,
      currentPersonaFit,
      primaryTargetPersonaId: null,
      alternativeTargetPersonaIds: [],
      rationaleByPersona: {},
      confidence: 0.25,
      routingReason: "nenhuma persona concreta atingiu confianca minima",
    };
  }
  return {
    currentPersonaCanContinue,
    currentPersonaFit,
    primaryTargetPersonaId: top.persona,
    alternativeTargetPersonaIds: selected.slice(1).map((item) => item.persona),
    rationaleByPersona: Object.fromEntries(selected.map((item) => [item.persona, item.rationale])),
    confidence: Math.min(0.98, 0.5 + top.score / 30),
    routingReason: signals.join(", "),
  };
}

export function isHandoffSelectionRequest(text: string) {
  const normalized = normalize(text);
  return /\b(encaminha|encaminhar|encaminhe|abre|abrir|quero falar|falar com|como voce encaminharia|como encaminharia)\b/.test(normalized);
}

export function inferHandoffTarget(input: {
  sourcePersona: string;
  userText: string;
  priorAssistantText?: string | null;
}) {
  const directMention = mentionedPersona(input.userText) || mentionedPersona(input.priorAssistantText || "");
  if (directMention && personaExists(directMention) && directMention !== input.sourcePersona) return directMention;

  const normalized = normalize(input.userText);
  const source = normalize(input.sourcePersona);
  if (source === "vidente" && /\b(reconstru|acontec|sequencia|o que aconteceu|relato|historia|narrar|narrativa)\b/.test(normalized)) {
    return "Narrador";
  }
  if (/\b(diagnostico|remedio|dose|sintoma|dor no peito|exame)\b/.test(normalized)) return "Medico";
  if (/\b(contrato|processo|lei|juridico|advogado|defesa)\b/.test(normalized)) return "Advogado";
  if (/\b(bug|codigo|build|deploy|api|banco|erro tecnico)\b/.test(normalized)) return "Engenheiro";
  if (/\b(estrategia|plano|prioridade|risco|decisao)\b/.test(normalized)) return "Estrategista";
  if (/\b(historia|narrativa|relato|cena|acontecimentos)\b/.test(normalized)) return "Narrador";
  return resolveVocationalTargets({
    currentPersona: input.sourcePersona,
    userText: input.userText,
    contextText: input.priorAssistantText,
    maxTargets: 1,
  }).primaryTargetPersonaId;
}

export function buildHostStyledHandoffAnswer(input: {
  sourcePersona: string;
  targetPersona: string;
  reason: string;
  alternatives?: PersonaHandoffOffer[];
  reused?: boolean;
}) {
  const targetReason = input.reason.replace(/\.$/, "").toLowerCase();
  const alternatives = (input.alternatives || [])
    .filter((offer) => offer.targetPersona !== input.targetPersona)
    .slice(0, 2);
  const alternativeLine = alternatives.length
    ? ` Tambem ha ${alternatives.map((offer) => `${offer.targetPersona}, ${offer.reason.replace(/\.$/, "").toLowerCase()}`).join("; ")}.`
    : "";
  const reusedLine = input.reused
    ? "Eu ja deixei esse caminho registrado no cartao de encaminhamento; escolha ali se quer abrir outra sala ou trazer essa voz para ca."
    : "Deixei o cartao de encaminhamento pronto para voce abrir a conversa ou convidar essa voz para ca.";

  const key = normalize(input.sourcePersona);
  if (key === "inimigo") {
    return [
      `Posso continuar mordendo o flanco fraco do seu relato; isso ainda e meu terreno.`,
      `${input.targetPersona}, porem, entra melhor agora porque ${targetReason}.${alternativeLine} Nao e uma fuga elegante: e escolher a faca certa para o corte certo.`,
      reusedLine,
    ].join("\n\n");
  }
  if (key === "mentor") {
    return [
      "Eu posso sustentar o eixo e o sentido do caminho, sem pressa de empurrar voce para outra porta.",
      `${input.targetPersona} parece a companhia mais justa para este trecho porque ${targetReason}.${alternativeLine}`,
      reusedLine,
    ].join("\n\n");
  }
  if (key === "cientista") {
    return [
      "Consigo separar fatos, hipoteses, padroes e criterios observaveis antes de qualquer decisao.",
      `${input.targetPersona} e a rota mais precisa para continuar porque ${targetReason}.${alternativeLine}`,
      reusedLine,
    ].join("\n\n");
  }

  return [
    `Eu consigo responder daqui sem vestir outra voz, mas este ponto tambem pode ganhar outra lente.`,
    `${input.targetPersona} pode acrescentar algo porque ${targetReason}.${alternativeLine}`,
    reusedLine,
  ].join("\n\n");
}

export function buildPersonaHandoffOffer(input: {
  sourcePersona: string;
  targetPersona: string;
  userText: string;
  privateRun?: boolean;
  reasonOverride?: string;
}) {
  const targetContract = getPersonaBehaviorContract(input.targetPersona);
  const sensitive = Boolean(input.privateRun || /confessor|porao|porão|privad|segred|anexo|arquivo|historico|histórico/i.test(input.userText));
  const summary = sensitive
    ? "um tema sensivel que deve ser revisado antes de qualquer compartilhamento"
    : sanitizeHandoffSummary(input.userText);
  const reason = input.reasonOverride || targetContract.operationalMission.replace(/\.$/, "");
  const draft = sensitive
    ? `Vim encaminhado pelo ${input.sourcePersona}. Quero decidir com cuidado o que compartilhar sobre este tema.`
    : `Vim encaminhado pelo ${input.sourcePersona} para conversar sobre: ${summary}`;

  return {
    sourcePersona: input.sourcePersona,
    targetPersona: input.targetPersona,
    targetSlug: personaSlug(input.targetPersona),
    title: `Continuar com ${input.targetPersona}`,
    reason,
    summary,
    draft,
    requiresConfirmation: sensitive,
    answer: buildHostStyledHandoffAnswer({
      sourcePersona: input.sourcePersona,
      targetPersona: input.targetPersona,
      reason: input.reasonOverride || reason,
    }),
  };
}

export function buildHandoffUrl(offer: PersonaHandoffOffer) {
  const params = new URLSearchParams();
  params.set("handoffFrom", offer.sourcePersona);
  params.set("handoffDraft", offer.draft);
  params.set("handoffSummary", offer.summary);
  return `/agents/${encodeURIComponent(personaSlug(offer.targetPersona) || offer.targetSlug)}?${params.toString()}`;
}

export function encodeHandoffMarker(offer: PersonaHandoffOffer) {
  return `[[NEMOSINE_HANDOFF:${encodeURIComponent(JSON.stringify(offer))}]]`;
}

export function stripHandoffMarkers(text: string) {
  return text.replace(HANDOFF_MARKER_PATTERN, "").trim();
}

export function extractHandoffOffers(text: string): PersonaHandoffOffer[] {
  const offers: PersonaHandoffOffer[] = [];
  for (const match of text.matchAll(HANDOFF_MARKER_PATTERN)) {
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1])) as PersonaHandoffOffer;
      if (parsed?.targetPersona && (parsed?.targetSlug || personaSlug(parsed.targetPersona))) {
        offers.push({
          ...parsed,
          targetSlug: parsed.targetSlug || personaSlug(parsed.targetPersona),
        });
      }
    } catch {
      // Ignore malformed client-only metadata.
    }
  }
  return offers;
}
