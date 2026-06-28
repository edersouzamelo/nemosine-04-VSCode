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
import { buildRuntimePersonaGuard, sanitizeConversationHistory, writePromptDebugAudit } from "./payload_hygiene";
import { retainActiveTopicsFromUserMessage } from "./conversation_continuity";
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
    | "round-finish"
    | "participant-joined"
    | "participant-left";
  [key: string]: unknown;
};

const INDEPENDENCE_RULE = [
  "Produza seu raciocinio segundo sua propria vocacao.",
  "Nao presuma consenso, nao harmonize artificialmente e discorde quando sua analise divergir.",
  "Voce nao tem acesso aos rascunhos das demais personas desta rodada.",
].join(" ");

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
        return {
          id: message.id,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
        };
      }
      const speaker = message.speakerPersonaId || personaId;
      const label = speaker === personaId ? `Sua fala anterior (${speaker})` : `Fala concluida de ${speaker}`;
      return {
        id: message.id,
        role: message.role,
        content: `[${label}]\n${message.content}`,
        timestamp: message.timestamp,
      };
    });
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
      } else {
        await removePersona(input.userId, input.threadId, personaId);
        events.push({ type: "participant-left", threadId: input.threadId, personaId });
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
  controller: ReadableStreamDefaultController<Uint8Array>;
}) {
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

    const result = await generateText({
      model: activeChatModel.modelInstance,
      system: [promptAssembly.systemPrompt, INDEPENDENCE_RULE].join("\n\n"),
      messages: modelMessages,
      temperature: DEFAULT_CHAT_TEMPERATURE,
      maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
      maxRetries: 1,
    });
    const rawText = result.text || "";
    const visibleText = stripLegacyActionTags(rawText);
    const effects = await commitPersonaLegacyEffects({
      rawText,
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
        tokens: (result as any).usage || undefined,
        memoryWrites,
        filteredHistoryCount,
      },
    });
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
          enqueueEvent(controller, {
            type: "round-start",
            threadId: input.threadId,
            turnGroupId,
            participantCount: snapshot.participants.length,
          });

          const pendingMessages = await Promise.all(snapshot.participants.map(async (participant) => {
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
            return { participant, messageId: message.id };
          }));

          await Promise.allSettled(pendingMessages.map(({ participant, messageId }) =>
            runPersonaGeneration({
              round: input,
              participant: { personaId: participant.personaId, role: participant.role },
              turnGroupId,
              messageId,
              controller,
            })
          ));

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
