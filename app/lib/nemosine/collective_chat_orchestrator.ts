import { openai as vercelOpenai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createDestinyEvent } from "@/app/lib/sovereignStore";
import { createUserRegistry } from "@/app/lib/userFeatureStore";
import {
  DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
  DEFAULT_CHAT_MODEL,
  DEFAULT_CHAT_TEMPERATURE,
  buildSystemPromptAssembly,
} from "./llm_client";
import {
  getParticipantSnapshot,
  invitePersona,
  removePersona,
  selectSpeakingParticipantsForRound,
  setPersonaMuted,
} from "./conversation_participants";
import {
  addMessageToThread,
  addUserMemory,
  createPendingPersonaMessage,
  prisma,
  retainPersonaConversationEpisode,
  updatePersonaMessageGeneration,
} from "./session_store";
import { isPrivateMemorySpace } from "./privacy";
import {
  buildRuntimePersonaGuard,
  sanitizeConversationHistory,
  stripGenericAssistantClosing,
  writePromptDebugAudit,
} from "./payload_hygiene";
import { retainActiveTopicsFromUserMessage } from "./conversation_continuity";
import { observeCognitiveFoundationResponse } from "./cognitive-foundation";
import {
  evaluatePersonaInitiativeQuality,
  renderPersonaInitiativeRepairFeedback,
} from "./persona-initiative";
import type { PersonaInitiativeQualityEvaluation } from "./persona-initiative";
import type { PersonaBehaviorContract } from "./persona_behavior_contracts";
import type { ChatThreadMessage } from "./types";
import type { PersonaPresenceCommand } from "./persona_command_parser";

type ResponseLanguage = "pt-BR" | "es" | "en";

type CollectiveChatRoundInput = {
  userId: string;
  threadId: string;
  hostPersonaId: string;
  placeId?: string | null;
  language: ResponseLanguage;
  userText: string;
  displayUserText: string;
  priorHistory: ChatThreadMessage[];
  commands: PersonaPresenceCommand[];
};

type CollectiveStreamEvent = {
  type:
    | "round-start"
    | "persona-start"
    | "persona-delta"
    | "persona-finish"
    | "persona-error"
    | "round-notice"
    | "round-finish"
    | "participant-joined"
    | "participant-left"
    | "participant-muted"
    | "participant-unmuted";
  [key: string]: unknown;
};

const INDEPENDENCE_RULE = [
  "Esta e uma sessao colegiada: voce participa de uma conversa comum, nao de uma resposta isolada.",
  "Leia as falas anteriores identificadas por persona e as falas ja concluidas nesta rodada.",
  "Voce pode responder ao usuario e tambem se dirigir nominalmente a outras personas quando concordar, corrigir, tensionar ou complementar.",
  "Mantenha sua perspectiva exclusiva, mas deixe concordancias e dissonancias claras: use formulacoes como 'Concordo com Mentor...' ou 'Diverjo de Juiz...'.",
  "Nao presuma consenso, nao harmonize artificialmente e discorde quando sua analise divergir.",
  "Fale em primeira pessoa quando estiver se pronunciando; evite narrar a si mesmo em terceira pessoa.",
  "Nao fale por personas ausentes ou silenciadas.",
].join(" ");

type CompletedRoundMessage = {
  personaId: string;
  role: "HOST" | "GUEST";
  content: string;
};

function getConfiguredPrimaryChatModel() {
  const model = process.env.OPENAI_CHAT_MODEL?.trim()
    || process.env.CHAT_MODEL?.trim()
    || DEFAULT_CHAT_MODEL;

  return {
    id: "primary",
    model,
    modelInstance: vercelOpenai(model),
  };
}

function getMemoryScope(personaId: string, placeId?: string | null) {
  if (isPrivateMemorySpace(personaId)) return personaId;
  if (placeId && isPrivateMemorySpace(placeId)) return placeId;
  return personaId;
}

function readCollectiveVocationalRepairLimit() {
  const parsed = Number(
    process.env.NEMOSINE_COLLECTIVE_VOCATIONAL_MAX_REPAIRS
    || process.env.NEMOSINE_PERSONA_INITIATIVE_MAX_REPAIRS,
  );
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(0, Math.min(2, Math.floor(parsed)));
}

function hasExplicitDestinyAuthorization(text: string) {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return [
    "registre na linha do destino",
    "registrar na linha do destino",
    "inclua na linha do destino",
    "incluir na linha do destino",
    "grave na linha do destino",
    "gravar na linha do destino",
    "pode incluir",
    "pode registrar",
    "pode gravar",
    "sim, registre",
    "sim registre",
    "sim, grave",
    "sim grave",
  ].some((phrase) => normalized.includes(phrase));
}

function normalizeDestinyDate(value?: string) {
  const raw = value?.trim();
  if (!raw || raw.toLowerCase() === "sem data") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function normalizeDestinyIntensity(value?: string) {
  const raw = value?.trim();
  if (!raw) return null;
  const parsed = Number(raw.match(/\d+/)?.[0]);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

export function stripLegacyActionTags(text: string) {
  return text
    .replace(/\[MEMORY:\s*[^\]\r\n]{1,1000}\]/gi, "")
    .replace(/\[REGISTRY:\s*[^\]\r\n]+?\]/gi, "")
    .replace(/\[DESTINY:\s*[^\]\r\n]+?\]/gi, "")
    .trim();
}

async function commitPersonaLegacyEffects(input: {
  rawText: string;
  userId: string;
  activeThreadId: string;
  memoryScope: string;
  personaId: string;
  userText: string;
}) {
  let memoryWrites = 0;
  const memoryMatches = [...input.rawText.matchAll(/\[MEMORY:\s*([^\]\r\n]{1,1000})\]/gi)];

  for (const match of memoryMatches.slice(0, 3)) {
    await addUserMemory(input.userId, match[1], input.memoryScope);
    memoryWrites += 1;
  }

  const registryMatches = [...input.rawText.matchAll(/\[REGISTRY:\s*([^|\]\r\n]{1,500})(?:\|\s*([^|\]\r\n]{0,50}))?(?:\|\s*([^\]\r\n]{0,50}))?\]/gi)];
  for (const match of registryMatches) {
    const idea = match[1]?.trim();
    if (!idea) continue;

    let deadlineVal = match[2]?.trim() || null;
    if (deadlineVal && !/^\d{4}-\d{2}-\d{2}$/.test(deadlineVal)) {
      deadlineVal = null;
    }
    const statusVal = match[3]?.trim() || "Pendente";

    await createUserRegistry(input.userId, {
      id: crypto.randomUUID(),
      idea,
      chat_origin_id: input.activeThreadId,
      persona: input.personaId,
      status: statusVal,
      last_interaction: new Date().toISOString().split("T")[0],
      next_deadline: deadlineVal,
      external_links: "",
      custom_columns: "{}",
    }).catch((error) => {
      console.error("[CollectiveChat] Failed to auto-create registry.", {
        threadId: input.activeThreadId,
        personaId: input.personaId,
        errorCode: error instanceof Error ? error.name : "unknown",
      });
    });
  }

  const destinyMatches = [...input.rawText.matchAll(/\[DESTINY:\s*([^\]\r\n]{1,1200})\]/gi)];
  if (hasExplicitDestinyAuthorization(input.userText)) {
    for (const match of destinyMatches.slice(0, 2)) {
      const parts = match[1].split("|").map((part) => part.trim());
      const title = parts[0];
      const eventDate = normalizeDestinyDate(parts[1]);
      const eventDateLabel = eventDate ? null : (parts[1] || null);
      const category = parts[2] || "marco";
      const shortDescription = parts[3] || title;
      const symbolicIntensity = normalizeDestinyIntensity(parts[4]);
      const dominantEmotion = parts[5] || null;

      if (!title || !shortDescription) continue;

      await createDestinyEvent(input.userId, {
        title,
        eventDate,
        eventDateLabel,
        category,
        shortDescription,
        symbolicIntensity,
        dominantEmotion,
        associatedPersona: input.personaId,
        visibility: "private",
        source: `persona:${input.personaId};thread:${input.activeThreadId}`,
        tags: ["sugerido-por-persona", input.personaId],
      }).catch((error) => {
        console.error("[CollectiveChat] Failed to auto-create destiny event.", {
          threadId: input.activeThreadId,
          personaId: input.personaId,
          errorCode: error instanceof Error ? error.name : "unknown",
        });
      });
    }
  }

  return { memoryWrites };
}

function buildPersonaHistory(priorHistory: ChatThreadMessage[], personaId: string) {
  return priorHistory
    .filter((message) => message.content.trim())
    .filter((message) => message.role === "user" || message.role === "assistant" || message.role === "system")
    .map((message) => {
      if (message.role !== "assistant") {
        const prefix = message.role === "user" ? "Usuario" : "Evento do conselho";
        return {
          id: message.id,
          role: message.role,
          content: `[${prefix}]\n${message.content}`,
          timestamp: message.timestamp,
        };
      }
      const speaker = message.speakerPersonaId || personaId;
      const label = speaker === personaId ? `Sua fala anterior (${speaker})` : `Fala anterior de ${speaker}`;
      return {
        id: message.id,
        role: message.role,
        content: `[${label}]\n${message.content}`,
        timestamp: message.timestamp,
      };
    });
}

function buildCurrentRoundContext(completedMessages: CompletedRoundMessage[]) {
  if (completedMessages.length === 0) {
    return "Nenhuma outra persona falou ainda nesta rodada. Abra sua perspectiva sem fingir que ouviu alguem.";
  }

  return [
    "Falas ja concluidas nesta mesma rodada. Use isto para concordar, discordar, corrigir ou complementar nominalmente:",
    ...completedMessages.map((message) => [
      `${message.personaId} (${message.role === "HOST" ? "anfitriao" : "convidado"}):`,
      message.content.slice(0, 1800),
    ].join("\n")),
  ].join("\n\n");
}

function normalizePersonaKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractScoreGuesses(messages: CompletedRoundMessage[]) {
  const guesses = new Set<string>();

  for (const message of messages) {
    const normalized = message.content
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const matches = normalized.matchAll(/\b(\d{1,2})\s*(?:x|-|a)\s*(\d{1,2})\b/g);
    for (const match of matches) {
      guesses.add(`${match[1]} a ${match[2]}`);
    }
  }

  return [...guesses];
}

function buildCollectiveAntiHerdRule(participant: { personaId: string; role: "HOST" | "GUEST" }, completedMessages: CompletedRoundMessage[]) {
  const previousScoreGuesses = extractScoreGuesses(completedMessages);
  const lines = [
    "Regra anti-manada desta rodada:",
    "Nao repita tese, placar, justificativa ou fechamento ja entregue por outra persona.",
    "Evite formulas como 'historico e desempenho recente', 'jogo cheio de surpresas', 'futebol e imprevisivel' quando outra voz ja usou esse caminho.",
    "Se concordar com alguem, acrescente uma divergencia concreta, um risco que a outra voz ignorou ou uma decisao diferente.",
  ];

  if (previousScoreGuesses.length > 0) {
    lines.push(
      `Placares ja usados nesta rodada: ${previousScoreGuesses.join(", ")}.`,
      "Se o usuario pedir palpite, nao use placar ja usado. Escolha outra leitura coerente ou declare, pela sua vocacao, por que a falsa precisao e o flanco do pedido.",
    );
  }

  const normalizedPersona = normalizePersonaKey(participant.personaId);
  if (normalizedPersona.includes("inimigo")) {
    lines.push(
      "Regra especifica do Inimigo: nao seja prestativo, conciliador ou tranquilizador.",
      "Ataque a premissa fraca, exponha o autoengano, diga qual flanco um adversario exploraria e feche com defesa concreta.",
      "Em palpite esportivo, nao vire comentarista neutro: ataque o consenso facil e mostre onde a previsao pode estar se enganando.",
    );
  } else if (normalizedPersona.includes("astronomo")) {
    lines.push("Regra especifica do Astronomo: use padrao, ciclo, fase, tendencia e comparacao temporal; nao entregue analise esportiva generica.");
  } else if (normalizedPersona.includes("vidente")) {
    lines.push("Regra especifica do Vidente: ofereca cenario, pressagio e bifurcacao; nao copie o placar nem a justificativa racional das outras vozes.");
  } else if (normalizedPersona.includes("cigana")) {
    lines.push("Regra especifica da Cigana: responda por imagem, leitura simbolica e pressentimento situado; nao vire resumo estatistico.");
  }

  return lines.join("\n");
}

function buildCollectiveVocationalExecutionRule(personaId: string, contract: PersonaBehaviorContract) {
  const familyMove: Record<string, string> = {
    strategic: "estrategia significa hierarquia, risco, trade-off, corte e movimento; nao significa opiniao equilibrada.",
    symbolic: "simbolo significa imagem, contraste, cena, pressagio, humor ou virada de sentido; nao significa enfeitar uma resposta neutra.",
    emotional: "leitura emocional significa padrao afetivo, defesa, necessidade, limite ou gesto interno; nao significa acolhimento intercambiavel.",
    operational: "operacao significa fluxo, gargalo, teste, procedimento ou criterio verificavel; nao significa checklist decorativo.",
  };

  return [
    `Execucao vocacional obrigatoria para ${personaId}:`,
    `Missao operacional: ${contract.operationalMission}`,
    `Temperamento de voz: ${contract.positiveStyle}`,
    `Inferencia esperada: ${contract.expectedInference}`,
    `Forma de encerramento: ${contract.vocationalClosing}`,
    familyMove[contract.family],
    `A resposta precisa produzir estes efeitos sem enumera-los como checklist: ${contract.goodResponseCriteria.join(", ")}.`,
    `Desvios que indicam perda de vocacao: ${contract.genericResponseSignals.join(", ")}.`,
    "Antes de responder, escolha mentalmente UMA lente propria desta persona e use-a para transformar o pedido. Se a resposta ainda servir igualmente para outra persona, ela esta errada.",
    "Perguntas factuais, palpites ou assuntos cotidianos tambem devem passar pela vocacao. Nunca entregue comentario neutro com fantasia de persona por cima.",
  ].join("\n");
}

function safeErrorCode(error: unknown) {
  if (error instanceof Error) return error.message.split(":")[0].slice(0, 80);
  return "unknown_error";
}

function enqueueEvent(controller: ReadableStreamDefaultController<Uint8Array>, event: CollectiveStreamEvent) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`event: ${event.type}\n`));
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

async function executePresenceCommands(input: CollectiveChatRoundInput) {
  const events: CollectiveStreamEvent[] = [];

  for (const command of input.commands) {
    for (const personaId of command.personaIds) {
      if (command.action === "invite") {
        await invitePersona(input.userId, input.threadId, personaId);
        events.push({ type: "participant-joined", threadId: input.threadId, personaId });
      } else if (command.action === "remove") {
        await removePersona(input.userId, input.threadId, personaId);
        events.push({ type: "participant-left", threadId: input.threadId, personaId });
      } else {
        const muted = command.action === "mute";
        await setPersonaMuted(input.userId, input.threadId, personaId, muted);
        events.push({ type: muted ? "participant-muted" : "participant-unmuted", threadId: input.threadId, personaId });
      }
    }
  }

  return events;
}

async function runPersonaGeneration(input: {
  round: CollectiveChatRoundInput;
  participant: { personaId: string; role: "HOST" | "GUEST" };
  turnGroupId: string;
  messageId: string;
  completedRoundMessages: CompletedRoundMessage[];
  participantCount: number;
  controller: ReadableStreamDefaultController<Uint8Array>;
}): Promise<{ status: "COMPLETED" | "FAILED"; content: string }> {
  const startedAt = Date.now();
  const activeChatModel = getConfiguredPrimaryChatModel();
  const memoryScope = getMemoryScope(input.participant.personaId, input.round.placeId);
  let filteredHistoryCount = 0;
  let memoryWrites = 0;
  let status: "COMPLETED" | "FAILED" = "COMPLETED";
  let errorCode: string | null = null;

  try {
    const promptAssembly = await buildSystemPromptAssembly(
      input.round.userId,
      input.participant.personaId,
      input.round.language,
      input.round.placeId || undefined,
      input.round.userText,
      input.round.threadId,
    );
    const { sanitizedHistory, filteredHistory } = sanitizeConversationHistory(
      buildPersonaHistory(input.round.priorHistory, input.participant.personaId),
    );
    filteredHistoryCount = filteredHistory.length;
    const history = [
      ...sanitizedHistory,
      {
        id: "runtime-persona-guard",
        role: "system" as const,
        content: [
          buildRuntimePersonaGuard(input.participant.personaId, input.round.userText),
          INDEPENDENCE_RULE,
          buildCurrentRoundContext(input.completedRoundMessages),
          buildCollectiveAntiHerdRule(input.participant, input.completedRoundMessages),
          buildCollectiveVocationalExecutionRule(input.participant.personaId, promptAssembly.initiative.contract),
        ].join("\n\n"),
        timestamp: Date.now(),
      },
      {
        id: "current-user-message",
        role: "user" as const,
        content: input.round.userText,
        timestamp: Date.now(),
      },
    ];
    const modelMessages = history.map((message) => ({
      role: message.role as "user" | "assistant" | "system",
      content: message.content,
    }));

    await writePromptDebugAudit({
      personaId: input.participant.personaId,
      threadId: input.round.threadId,
      model: activeChatModel.model,
      temperature: DEFAULT_CHAT_TEMPERATURE,
      maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
      systemPrompt: [promptAssembly.systemPrompt, INDEPENDENCE_RULE].join("\n\n"),
      messages: modelMessages,
      filteredHistory,
      debug: promptAssembly.debug,
    });

    const recentAssistantTexts = [
      ...input.round.priorHistory
        .filter((message) => message.role === "assistant")
        .slice(-4)
        .map((message) => message.content),
      ...input.completedRoundMessages.map((message) => message.content),
    ];
    const generateCandidate = async (repairFeedback: string) => {
      const result = await generateText({
        model: activeChatModel.modelInstance,
        system: [promptAssembly.systemPrompt, INDEPENDENCE_RULE, repairFeedback].filter(Boolean).join("\n\n"),
        messages: modelMessages,
        temperature: DEFAULT_CHAT_TEMPERATURE,
        maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
        maxRetries: 1,
      });
      return result;
    };

    const maxAttempts = readCollectiveVocationalRepairLimit() + 1;
    let repairFeedback = "";
    let selectedRawText = "";
    let visibleText = "";
    let generationUsage: unknown;
    let bestRejected: {
      rawText: string;
      visibleText: string;
      evaluation: PersonaInitiativeQualityEvaluation;
      usage: unknown;
    } | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const result = await generateCandidate(repairFeedback);
      const rawCandidate = result.text || "";
      const visibleCandidate = stripGenericAssistantClosing(stripLegacyActionTags(rawCandidate));
      const initiativeEvaluation = evaluatePersonaInitiativeQuality({
        responseText: visibleCandidate,
        personaId: input.participant.personaId,
        userText: input.round.userText,
        richness: promptAssembly.initiative.richness,
        snapshot: promptAssembly.initiative.snapshot,
        contract: promptAssembly.initiative.contract,
        brief: promptAssembly.initiative.brief,
        privateRun: isPrivateMemorySpace(memoryScope),
        recentAssistantTexts,
      });

      if (initiativeEvaluation.finalPass) {
        selectedRawText = rawCandidate;
        visibleText = visibleCandidate;
        generationUsage = (result as any).usage;
        break;
      }

      if (!bestRejected || initiativeEvaluation.initiativeScore > bestRejected.evaluation.initiativeScore) {
        bestRejected = {
          rawText: rawCandidate,
          visibleText: visibleCandidate,
          evaluation: initiativeEvaluation,
          usage: (result as any).usage,
        };
      }

      repairFeedback = renderPersonaInitiativeRepairFeedback(initiativeEvaluation);
      console.warn("[CollectiveChat] Persona candidate rejected before delivery.", {
        personaId: input.participant.personaId,
        threadId: input.round.threadId,
        attempt,
        findingCodes: initiativeEvaluation.findings.map((finding) => finding.code),
        initiativeScore: Number(initiativeEvaluation.initiativeScore.toFixed(3)),
      });
    }

    if (!visibleText) {
      selectedRawText = bestRejected?.rawText || "";
      visibleText = bestRejected?.visibleText || "Nao consegui sustentar a voz desta persona nesta rodada.";
      generationUsage = bestRejected?.usage;
    }

    const effects = await commitPersonaLegacyEffects({
      rawText: selectedRawText,
      userId: input.round.userId,
      activeThreadId: input.round.threadId,
      memoryScope,
      personaId: input.participant.personaId,
      userText: input.round.userText,
    });
    memoryWrites = effects.memoryWrites;

    await updatePersonaMessageGeneration(input.round.userId, input.messageId, visibleText, "COMPLETED");
    await retainPersonaConversationEpisode({
      userId: input.round.userId,
      personaId: input.participant.personaId,
      threadId: input.round.threadId,
      turnGroupId: input.turnGroupId,
      visibilityPolicy: isPrivateMemorySpace(memoryScope) ? "CONFESSOR_SEALED" : "SHARED",
      content: [
        `Participantes da rodada: snapshot congelado em ${input.turnGroupId}.`,
        `Usuario: ${input.round.displayUserText.slice(0, 900)}`,
        input.completedRoundMessages.length > 0
          ? `Falas anteriores na rodada:\n${input.completedRoundMessages.map((message) => `${message.personaId}: ${message.content.slice(0, 600)}`).join("\n")}`
          : "Primeira fala da rodada.",
        `Fala de ${input.participant.personaId}: ${visibleText.slice(0, 1200)}`,
      ].join("\n"),
    });
    await retainActiveTopicsFromUserMessage({
      userId: input.round.userId,
      threadId: input.round.threadId,
      personaId: input.participant.personaId,
      memoryScope,
      userText: input.round.userText,
    }).catch((error) => {
      console.warn("[CollectiveChat] Active topic retention skipped.", {
        threadId: input.round.threadId,
        personaId: input.participant.personaId,
        errorCode: safeErrorCode(error),
      });
    });
    await observeCognitiveFoundationResponse({
      userId: input.round.userId,
      threadId: input.round.threadId,
      personaId: input.participant.personaId,
      placeId: input.round.placeId || null,
      memoryScope,
      userText: input.round.userText,
      responseText: visibleText,
      participantCount: input.participantCount,
      privateRun: isPrivateMemorySpace(memoryScope),
    }).catch((error) => {
      console.warn("[CollectiveChat] Cognitive foundation observation skipped.", {
        threadId: input.round.threadId,
        personaId: input.participant.personaId,
        errorCode: safeErrorCode(error),
      });
    });

    enqueueEvent(input.controller, {
      type: "persona-delta",
      personaId: input.participant.personaId,
      turnGroupId: input.turnGroupId,
      messageId: input.messageId,
      delta: visibleText,
      status: "STREAMING",
    });
    enqueueEvent(input.controller, {
      type: "persona-finish",
      personaId: input.participant.personaId,
      turnGroupId: input.turnGroupId,
      messageId: input.messageId,
      content: visibleText,
      status: "COMPLETED",
    });

    await prisma.collectiveGenerationAudit.create({
      data: {
        userId: input.round.userId,
        threadId: input.round.threadId,
        turnGroupId: input.turnGroupId,
        personaId: input.participant.personaId,
        participantRole: input.participant.role,
        generationStatus: "COMPLETED",
        latencyMs: Date.now() - startedAt,
        model: activeChatModel.model,
        tokens: generationUsage || undefined,
        memoryWrites,
        filteredHistoryCount,
      },
    });
    return { status: "COMPLETED", content: visibleText };
  } catch (error) {
    status = "FAILED";
    errorCode = safeErrorCode(error);
    const failureMessage = "O sistema esta instavel. Esta persona nao conseguiu concluir a resposta agora.";
    await updatePersonaMessageGeneration(input.round.userId, input.messageId, failureMessage, "FAILED").catch(() => null);
    enqueueEvent(input.controller, {
      type: "persona-error",
      personaId: input.participant.personaId,
      turnGroupId: input.turnGroupId,
      messageId: input.messageId,
      content: failureMessage,
      status: "FAILED",
      errorCode,
    });
    await prisma.collectiveGenerationAudit.create({
      data: {
        userId: input.round.userId,
        threadId: input.round.threadId,
        turnGroupId: input.turnGroupId,
        personaId: input.participant.personaId,
        participantRole: input.participant.role,
        generationStatus: "FAILED",
        latencyMs: Date.now() - startedAt,
        model: activeChatModel.model,
        memoryWrites,
        filteredHistoryCount,
        errorCode,
      },
    }).catch(() => null);
    return { status: "FAILED", content: failureMessage };
  } finally {
    console.log("[CollectiveChat] persona_generation", {
      threadId: input.round.threadId,
      turnGroupId: input.turnGroupId,
      participantCount: undefined,
      personaId: input.participant.personaId,
      role: input.participant.role,
      generationStatus: status,
      latencyMs: Date.now() - startedAt,
      model: activeChatModel.model,
      memoryWrites,
      filteredHistoryCount,
      errorCode,
    });
  }
}

export function createCollectiveChatStream(input: CollectiveChatRoundInput) {
  const headers = new Headers({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "x-thread-id": input.threadId,
    "x-multi-persona": "true",
  });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      (async () => {
        const turnGroupId = crypto.randomUUID();
        try {
          const presenceEvents = await executePresenceCommands(input);
          for (const event of presenceEvents) enqueueEvent(controller, event);

          await addMessageToThread(input.userId, input.threadId, "user", input.displayUserText, {
            turnGroupId,
            messageKind: "USER",
          });

          const snapshot = await getParticipantSnapshot(input.userId, input.threadId);
          const speakingParticipants = selectSpeakingParticipantsForRound(snapshot.participants, input.displayUserText || input.userText);
          const mutedCount = snapshot.participants.filter((participant) => participant.muted).length;
          const addressedCount = speakingParticipants.length < snapshot.participants.filter((participant) => !participant.muted).length
            ? speakingParticipants.length
            : 0;
          enqueueEvent(controller, {
            type: "round-start",
            threadId: input.threadId,
            turnGroupId,
            participantCount: snapshot.participants.length,
            speakingParticipantCount: speakingParticipants.length,
            mutedCount,
            addressedCount,
          });

          if (speakingParticipants.length === 0) {
            const content = "Nenhuma persona esta com voz ativa nesta rodada.";
            await addMessageToThread(input.userId, input.threadId, "system", content, {
              turnGroupId,
              messageKind: "SYSTEM_EVENT",
            });
            enqueueEvent(controller, {
              type: "round-notice",
              threadId: input.threadId,
              turnGroupId,
              content,
            });
            enqueueEvent(controller, {
              type: "round-finish",
              threadId: input.threadId,
              turnGroupId,
              status: "COMPLETED",
              mutedCount,
              speakingParticipantCount: 0,
            });
            return;
          }

          const completedRoundMessages: CompletedRoundMessage[] = [];
          for (const participant of speakingParticipants) {
            const message = await createPendingPersonaMessage(
              input.userId,
              input.threadId,
              participant.personaId,
              turnGroupId,
            );
            enqueueEvent(controller, {
              type: "persona-start",
              personaId: participant.personaId,
              role: participant.role,
              turnGroupId,
              messageId: message.id,
              status: "PENDING",
            });
            const result = await runPersonaGeneration({
              round: input,
              participant: { personaId: participant.personaId, role: participant.role },
              turnGroupId,
              messageId: message.id,
              completedRoundMessages,
              participantCount: speakingParticipants.length,
              controller,
            });
            if (result.status === "COMPLETED" && result.content.trim()) {
              completedRoundMessages.push({
                personaId: participant.personaId,
                role: participant.role,
                content: result.content,
              });
            }
          }

          enqueueEvent(controller, {
            type: "round-finish",
            threadId: input.threadId,
            turnGroupId,
            status: "COMPLETED",
          });
        } catch (error) {
          enqueueEvent(controller, {
            type: "round-finish",
            threadId: input.threadId,
            turnGroupId,
            status: "FAILED",
            errorCode: safeErrorCode(error),
          });
        } finally {
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, { headers });
}
