import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { auth } from "@/auth";
import { ENTITIES } from "@/app/data/entities";
import { isAdminEmail } from "@/app/lib/accessControl";
import { createCollectiveChatStream } from "@/app/lib/nemosine/collective_chat_orchestrator";
import {
  createCollectiveThreadWithHost,
  getCollectiveSchemaStatus,
  getParticipantSnapshot,
  getThreadHostAndPlace,
  isMultiPersonaEnabled,
} from "@/app/lib/nemosine/conversation_participants";
import { getThread, prisma } from "@/app/lib/nemosine/session_store";
import { parsePersonaPresenceCommands } from "@/app/lib/nemosine/persona_command_parser";
import { normalizePresenceMode } from "@/app/lib/nemosine/presence_adjustment";
import {
  buildDeterministicThreadTitle,
  classifyTitlePayloadKind,
  shouldRepairThreadTitle,
} from "@/app/lib/nemosine/thread_title";
import type { ConversationPresenceContract } from "@/app/lib/nemosine/presence_adjustment";
import type { ChatThreadMessage } from "@/app/lib/nemosine/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_EXTRACTED_PDF_TEXT_LENGTH = 100_000;
const MAX_TEXT_FILE_SIZE_BYTES = 1 * 1024 * 1024;
const MAX_MESSAGE_TEXT_LENGTH = 120_000;
const ORPHANED_PERSONA_MESSAGE = "Esta voz não conseguiu concluir a resposta nesta rodada.";

type CollectiveFilePart = {
  filename?: string;
  mediaType?: string;
  url?: string;
};

type CollectiveStreamEvent = {
  type?: string;
  messageId?: string;
};

async function getAuthenticatedUserId() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return { id, email: session.user?.email };
}

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function resolveEntity(name: string, type: "persona" | "place") {
  return Object.values(ENTITIES).find((entity) => entity.name === name && entity.type === type);
}

function getLastMessageText(messages: any[]) {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return "";
  if (lastMessage.parts) {
    return lastMessage.parts
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("\n");
  }
  return lastMessage.content || lastMessage.text || "";
}

async function extractFileText(filePart: CollectiveFilePart) {
  if (!filePart.url?.includes("base64,")) return "";
  const base64Data = filePart.url.split(",")[1];
  const buffer = Buffer.from(base64Data, "base64");
  const filename = filePart.filename || "documento";
  const loweredFilename = filename.toLowerCase();
  const isPdf = filePart.mediaType === "application/pdf" || loweredFilename.endsWith(".pdf");
  const isTextFile = filePart.mediaType === "text/plain"
    || filePart.mediaType === "text/markdown"
    || loweredFilename.endsWith(".txt")
    || loweredFilename.endsWith(".md");

  if (isPdf) {
    if (buffer.length > MAX_PDF_SIZE_BYTES) {
      throw new Error("PDF_TOO_LARGE");
    }
    const parsed = await pdfParse(buffer);
    return `\n\n[CONTEUDO DO ARQUIVO ANEXADO (${filename})]\n${(parsed.text || "").slice(0, MAX_EXTRACTED_PDF_TEXT_LENGTH)}`;
  }

  if (isTextFile) {
    if (buffer.length > MAX_TEXT_FILE_SIZE_BYTES) {
      throw new Error("TEXT_FILE_TOO_LARGE");
    }
    return `\n\n[CONTEUDO DO ARQUIVO ANEXADO (${filename})]\n${buffer.toString("utf8").slice(0, MAX_EXTRACTED_PDF_TEXT_LENGTH)}`;
  }

  throw new Error("UNSUPPORTED_ATTACHMENT_TYPE");
}

function threadMatchesRequest(thread: { personaId: string; placeId?: string | null }, personaId: string, placeId?: string | null) {
  const requestedLegacyScope = placeId ? `${personaId} @ ${placeId}` : personaId;
  if (thread.personaId === requestedLegacyScope) return true;
  const threadContext = getThreadHostAndPlace(thread);
  return threadContext.hostPersonaId === personaId && (threadContext.placeId || null) === (placeId || null);
}

function normalizeAddressingText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s@,;:.?!-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}

function detectDirectPersonaAddress(text: string) {
  const normalizedText = normalizeAddressingText(text);
  if (!normalizedText) return null;

  const personas = Object.values(ENTITIES)
    .filter((entity) => entity.type === "persona")
    .map((entity) => entity.name)
    .sort((left, right) => right.length - left.length);

  for (const persona of personas) {
    const normalizedName = normalizeAddressingText(persona);
    const namePattern = escapeRegExp(normalizedName);
    const patterns = [
      `^(?:bom\\s+dia|boa\\s+tarde|boa\\s+noite|oi|ola|salve)\\s+(?:o\\s+|a\\s+)?${namePattern}(?=$|[\\s,;:.?!])`,
      `^@?${namePattern}(?=$|[\\s,;:.?!])`,
      `(?:^|[.!?;]\\s+)@?${namePattern}\\s*(?:,|:|;)`,
      `\\b(?:fala|fale|responde|responda|quero\\s+ouvir|pergunta\\s+pro|pergunta\\s+para|pergunta\\s+ao)\\s+(?:o\\s+|a\\s+)?${namePattern}\\b`,
    ];
    if (patterns.some((pattern) => new RegExp(pattern, "u").test(normalizedText))) {
      return persona;
    }
  }

  return null;
}

function isPronounInviteRequest(text: string) {
  const normalized = normalizeAddressingText(text);
  return /\b(?:consegue|pode|da para|tem como)\s+(?:me\s+)?(?:chamar|trazer|convidar)\s+(?:ele|ela)\b/.test(normalized)
    || /\b(?:chame|chama|traga|traz|convide)\s+(?:ele|ela)\b/.test(normalized);
}

function resolveRecentHandoffTarget(history: ChatThreadMessage[], hostPersonaId: string) {
  const personaNames = Object.values(ENTITIES)
    .filter((entity) => entity.type === "persona")
    .map((entity) => entity.name);

  for (const message of [...history].reverse()) {
    const metadata = message.metadata as { eventType?: string; targetPersona?: string } | null | undefined;
    if (metadata?.eventType === "HANDOFF_OFFERED" && metadata.targetPersona && metadata.targetPersona !== hostPersonaId) {
      return metadata.targetPersona;
    }
    if (message.role !== "assistant") continue;
    const normalized = normalizeAddressingText(message.content || "");
    const referenced = personaNames
      .filter((persona) => persona !== hostPersonaId)
      .map((persona) => ({ persona, index: normalized.lastIndexOf(normalizeAddressingText(persona)) }))
      .filter((item) => item.index >= 0)
      .sort((left, right) => right.index - left.index)[0]?.persona;
    if (referenced) return referenced;
  }
  return null;
}

function buildInvitedPersonaPrompt(targetPersona: string, semanticText: string) {
  const normalizedSemantic = normalizeAddressingText(semanticText);
  const stillLooksLikeCommand = /\b(chama|chame|chamar|traz|traga|convida|convide|convidar)\b/.test(normalizedSemantic);
  const effectivePrompt = semanticText.trim() && !stillLooksLikeCommand
    ? semanticText.trim()
    : "entre na conversa e ofereca sua leitura sobre o tema em curso, usando o contexto ja registrado nesta sessao.";
  return `${targetPersona}, ${effectivePrompt}`;
}

async function closeOrphanedPersonaMessages(threadId: string, messageIds: Set<string>) {
  if (messageIds.size === 0) return;
  const result = await prisma.message.updateMany({
    where: {
      id: { in: [...messageIds] },
      threadId,
      role: "assistant",
      generationStatus: "PENDING",
    },
    data: {
      content: ORPHANED_PERSONA_MESSAGE,
      generationStatus: "FAILED",
    },
  });
  if (result.count > 0) {
    console.warn("[API/Collective Chat] Orphaned pending persona messages closed.", {
      threadId,
      count: result.count,
    });
  }
}

function wrapCollectiveStreamWithPendingCleanup(response: Response, threadId: string) {
  if (!response.body) return response;

  const pendingMessageIds = new Set<string>();
  const decoder = new TextDecoder();
  let eventBuffer = "";

  const inspectChunk = (chunk: Uint8Array, final = false) => {
    eventBuffer += decoder.decode(chunk, { stream: !final });
    let eventEnd = eventBuffer.indexOf("\n\n");
    while (eventEnd >= 0) {
      const rawEvent = eventBuffer.slice(0, eventEnd);
      eventBuffer = eventBuffer.slice(eventEnd + 2);
      const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data: "));
      if (dataLine) {
        try {
          const event = JSON.parse(dataLine.slice(6)) as CollectiveStreamEvent;
          if (event.type === "persona-start" && event.messageId) {
            pendingMessageIds.add(event.messageId);
          }
        } catch {
          // The client still receives the original bytes; malformed telemetry is ignored here.
        }
      }
      eventEnd = eventBuffer.indexOf("\n\n");
    }
  };

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      inspectChunk(chunk);
      controller.enqueue(chunk);
    },
    async flush() {
      inspectChunk(new Uint8Array(), true);
      await closeOrphanedPersonaMessages(threadId, pendingMessageIds).catch((error) => {
        console.error("[API/Collective Chat] Pending cleanup failed.", {
          threadId,
          errorCode: error instanceof Error ? error.name : "unknown",
        });
      });
    },
  });

  return new Response(response.body.pipeThrough(transform), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUserId();
    if (!user) return unauthorizedResponse();
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "DEV_ONLY" }, { status: 403 });
    }
    const userId = user.id;
    if (!isMultiPersonaEnabled()) {
      return NextResponse.json({ error: "Multi-persona disabled" }, { status: 403 });
    }
    const schemaStatus = await getCollectiveSchemaStatus();
    if (!schemaStatus.ready) {
      return NextResponse.json({
        error: "MIGRATION_REQUIRED",
        message: "A migracao multi-persona ainda nao foi aplicada no banco.",
        missing: schemaStatus.missing,
      }, { status: 409 });
    }

    const body = await req.json();
    const { messages, personaId, placeId, threadId, language, voiceTranscript } = body;
    const presenceRuntimeMode = normalizePresenceMode(process.env.PRESENCE_ADJUSTMENT_MODE);
    const submittedPresenceContract = body.presenceContract && typeof body.presenceContract === "object"
      ? body.presenceContract as ConversationPresenceContract
      : null;
    const presenceContractConfirmed = body.presenceContractConfirmed === true;
    const activePresenceContract = submittedPresenceContract?.userId === userId
      && presenceContractConfirmed
      && (presenceRuntimeMode === "internal" || presenceRuntimeMode === "enforce" || presenceRuntimeMode === "shadow")
      ? submittedPresenceContract
      : null;

    if (!Array.isArray(messages) || messages.length === 0 || typeof personaId !== "string" || !personaId.trim()) {
      return NextResponse.json({ error: "Invalid request format or missing personaId" }, { status: 400 });
    }
    const activePersona = resolveEntity(personaId, "persona");
    const activePlace = typeof placeId === "string" && placeId.trim()
      ? resolveEntity(placeId, "place")
      : undefined;
    if (!activePersona || (placeId && !activePlace)) {
      return NextResponse.json({ error: "Invalid persona or place context" }, { status: 400 });
    }

    let userText = getLastMessageText(messages);
    if (typeof userText !== "string") {
      return NextResponse.json({ error: "Invalid message content" }, { status: 400 });
    }
    const displayUserText = userText;

    const fileParts = [
      ...(Array.isArray(body.fileParts) ? body.fileParts : []),
      ...((messages[messages.length - 1]?.parts || []).filter((part: any) => part.type === "file")),
    ] as CollectiveFilePart[];
    for (const filePart of fileParts) {
      try {
        userText += await extractFileText(filePart);
      } catch (error) {
        if (error instanceof Error && error.message === "PDF_TOO_LARGE") {
          return NextResponse.json({ error: "PDF exceeds the 5 MB limit" }, { status: 413 });
        }
        if (error instanceof Error && error.message === "TEXT_FILE_TOO_LARGE") {
          return NextResponse.json({ error: "Text attachment exceeds the 1 MB limit" }, { status: 413 });
        }
        if (error instanceof Error && error.message === "UNSUPPORTED_ATTACHMENT_TYPE") {
          return NextResponse.json({ error: "Unsupported attachment type" }, { status: 415 });
        }
        console.error("[API/Collective Chat] Attachment parsing failed:", error);
        userText += "\n\n[Falha ao extrair texto do arquivo anexado.]";
      }
    }

    if (typeof voiceTranscript === "string" && voiceTranscript.trim()) {
      userText += `\n\n[TRANSCRICAO DE AUDIO ANEXADO]\n${voiceTranscript.trim()}`;
    }
    if (userText.length > MAX_MESSAGE_TEXT_LENGTH) {
      return NextResponse.json({ error: "Message content exceeds the allowed limit" }, { status: 413 });
    }

    const parsedCommands = parsePersonaPresenceCommands(displayUserText, voiceTranscript);
    const selectedLanguage = language === "es" || language === "en" ? language : "pt-BR";
    const normalizedPlaceId = activePlace?.name || null;

    let activeThreadId: string;
    let priorHistory: ChatThreadMessage[] = [];

    let currentThreadTitle = "Nova conversa";
    if (typeof threadId !== "string" || !threadId) {
      const thread = await createCollectiveThreadWithHost({
        userId,
        hostPersonaId: personaId,
        placeId: normalizedPlaceId,
        title: "Nova conversa",
      });
      activeThreadId = thread.id;
      priorHistory = thread.messages;
      currentThreadTitle = thread.title;
    } else {
      const thread = await getThread(userId, threadId);
      if (!thread) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
      }
      if (!threadMatchesRequest(thread, personaId, normalizedPlaceId)) {
        return NextResponse.json({ error: "Thread does not belong to this persona" }, { status: 403 });
      }
      activeThreadId = thread.id;
      priorHistory = thread.messages;
      currentThreadTitle = thread.title;
    }

    if (shouldRepairThreadTitle(currentThreadTitle, displayUserText)) {
      const { updateThreadTitle } = await import("@/app/lib/nemosine/session_store");
      const titleGenerated = buildDeterministicThreadTitle(displayUserText);
      await updateThreadTitle(userId, activeThreadId, titleGenerated).catch((error) => {
        console.warn("[ThreadTitle] collective title repair skipped.", {
          threadId: activeThreadId,
          errorCode: error instanceof Error ? error.name : "unknown",
        });
      });
      console.info("[ThreadTitle]", {
        event: "THREAD_TITLE_SOURCE",
        threadId: activeThreadId,
        payloadKind: classifyTitlePayloadKind(displayUserText),
        sourceLength: displayUserText.length,
        titleGenerated,
      });
    } else {
      console.info("[ThreadTitle]", {
        event: "THREAD_TITLE_SOURCE",
        threadId: activeThreadId,
        payloadKind: classifyTitlePayloadKind(displayUserText),
        sourceLength: displayUserText.length,
        titleGenerated: currentThreadTitle,
      });
    }

    const pronounInviteTarget = parsedCommands.commands.some((command) => command.action === "invite")
      ? null
      : isPronounInviteRequest(displayUserText)
        ? resolveRecentHandoffTarget(priorHistory, personaId)
        : null;
    const resolvedCommands = pronounInviteTarget
      ? [...parsedCommands.commands, { action: "invite" as const, personaIds: [pronounInviteTarget], raw: displayUserText }]
      : parsedCommands.commands;

    const snapshot = await getParticipantSnapshot(userId, activeThreadId);
    const activePersonaIds = new Set(snapshot.participants.filter((participant) => participant.active).map((participant) => participant.personaId));
    const requestedInviteTarget = resolvedCommands
      .find((command) => command.action === "invite")
      ?.personaIds.find((targetPersonaId) => targetPersonaId !== personaId) || null;
    const effectiveCommands = resolvedCommands
      .map((command) => ({
        ...command,
        personaIds: command.action === "invite"
          ? command.personaIds.filter((targetPersonaId) => targetPersonaId !== personaId && !activePersonaIds.has(targetPersonaId))
          : command.personaIds,
      }))
      .filter((command) => command.personaIds.length > 0);

    const directAddressTarget = detectDirectPersonaAddress(displayUserText);
    const semanticUserText = parsedCommands.semanticText || userText;
    const routedUserText = requestedInviteTarget
      ? buildInvitedPersonaPrompt(requestedInviteTarget, parsedCommands.semanticText)
      : directAddressTarget
        ? `${directAddressTarget}, ${semanticUserText}`
        : semanticUserText;

    const speakerTarget = requestedInviteTarget
      || (directAddressTarget && activePersonaIds.has(directAddressTarget) ? directAddressTarget : null);
    const routingHistory: ChatThreadMessage[] = speakerTarget
      ? [...priorHistory, {
          id: `speaker-routing-${crypto.randomUUID()}`,
          role: "system",
          content: `[[NEMOSINE_FOCUSED_SPEAKER:${speakerTarget}]]`,
          timestamp: Date.now(),
          messageKind: "SYSTEM_EVENT",
        }]
      : priorHistory;

    const collectiveResponse = createCollectiveChatStream({
      userId,
      threadId: activeThreadId,
      hostPersonaId: personaId,
      placeId: normalizedPlaceId,
      language: selectedLanguage,
      userText: routedUserText,
      displayUserText,
      priorHistory: routingHistory,
      commands: effectiveCommands,
      presenceContract: activePresenceContract,
      presenceAdjustmentMode: presenceRuntimeMode,
    });

    return wrapCollectiveStreamWithPendingCleanup(collectiveResponse, activeThreadId);
  } catch (error) {
    console.error("[API/Collective Chat] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
