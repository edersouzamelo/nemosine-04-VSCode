import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { auth } from "@/auth";
import { ENTITIES } from "@/app/data/entities";
import { createCollectiveChatStream } from "@/app/lib/nemosine/collective_chat_orchestrator";
import {
  createCollectiveThreadWithHost,
  getCollectiveSchemaStatus,
  getThreadHostAndPlace,
  isMultiPersonaEnabled,
} from "@/app/lib/nemosine/conversation_participants";
import { getThread } from "@/app/lib/nemosine/session_store";
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

type CollectiveFilePart = {
  filename?: string;
  mediaType?: string;
  url?: string;
};

async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
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

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();
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
    const activePresenceContract = submittedPresenceContract?.userId === userId
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

    return createCollectiveChatStream({
      userId,
      threadId: activeThreadId,
      hostPersonaId: personaId,
      placeId: normalizedPlaceId,
      language: selectedLanguage,
      userText: parsedCommands.semanticText || userText,
      displayUserText,
      priorHistory,
      commands: parsedCommands.commands,
      presenceContract: activePresenceContract,
      presenceAdjustmentMode: presenceRuntimeMode,
    });
  } catch (error) {
    console.error("[API/Collective Chat] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
