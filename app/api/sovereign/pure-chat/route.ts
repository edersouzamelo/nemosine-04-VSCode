import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { generateText } from "ai";
import { openai as vercelOpenai } from "@ai-sdk/openai";
import { auth } from "@/auth";
import { createPromotedUIMessageStreamResponse } from "@/app/lib/nemosine/cognitive-runtime/runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_MESSAGES = 40;
const MAX_CONTENT_LENGTH = 120_000;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILE_TEXT_LENGTH = 80_000;
const SAFE_PURE_CHAT_FAILURE = "Nao posso entregar esta resposta com seguranca agora. Vou manter o chat fora das personas e sem executar efeitos colaterais.";

function evaluateBasalPureChatSafety(text: string) {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const reasons: string[] = [];

  if (/\[(memory|registry|destiny)\s*:/i.test(text)) {
    reasons.push("side_effect_tag_detected");
  }

  if (/\b(eu sou|sou|aqui e|aqui eh)\s+(o|a)?\s*(mentor|juiz|cientista|filosofo|filosof|vigia|orquestrador|persona)\b/.test(normalized)) {
    reasons.push("persona_impersonation_detected");
  }

  if (/\bnemosine_(cognitive|runtime|promotion|audit)\b/.test(normalized)) {
    reasons.push("internal_control_leak_detected");
  }

  return {
    promoted: reasons.length === 0,
    reasons,
  };
}

function cleanMessages(messages: any[]) {
  return messages
    .filter((message) => message?.role === "user" || message?.role === "assistant" || message?.role === "system")
    .slice(-MAX_MESSAGES)
    .map((message) => {
      const content = message.parts
        ? message.parts
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text)
            .join("\n")
        : message.content || "";

      return {
        role: message.role as "user" | "assistant" | "system",
        content: String(content).slice(0, MAX_CONTENT_LENGTH),
      };
    })
    .filter((message) => message.content.trim());
}

async function extractAttachmentContext(lastMessage: any) {
  const contexts: string[] = [];
  const fileParts = Array.isArray(lastMessage?.parts)
    ? lastMessage.parts.filter((part: any) => part.type === "file")
    : [];

  for (const filePart of fileParts) {
    if (!filePart.url || !String(filePart.url).includes("base64,")) continue;

    const filename = filePart.filename || "documento";
    const loweredFilename = String(filename).toLowerCase();
    const base64Data = String(filePart.url).split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error("FILE_TOO_LARGE");
    }

    const isPdf = filePart.mediaType === "application/pdf" || loweredFilename.endsWith(".pdf");
    const isText = filePart.mediaType === "text/plain"
      || filePart.mediaType === "text/markdown"
      || filePart.mediaType === "text/csv"
      || loweredFilename.endsWith(".txt")
      || loweredFilename.endsWith(".md")
      || loweredFilename.endsWith(".csv");

    if (isPdf) {
      const parsed = await pdfParse(buffer);
      contexts.push(`[DOCUMENTO ANEXADO: ${filename}]\n${parsed.text.slice(0, MAX_FILE_TEXT_LENGTH)}`);
    } else if (isText) {
      contexts.push(`[DOCUMENTO ANEXADO: ${filename}]\n${buffer.toString("utf8").slice(0, MAX_FILE_TEXT_LENGTH)}`);
    } else {
      throw new Error("UNSUPPORTED_FILE");
    }
  }

  return contexts.join("\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, voiceTranscript } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const cleanedMessages = cleanMessages(messages);
    const hiddenContextParts: string[] = [];

    try {
      const attachmentContext = await extractAttachmentContext(messages[messages.length - 1]);
      if (attachmentContext) hiddenContextParts.push(attachmentContext);
    } catch (error: any) {
      if (error?.message === "FILE_TOO_LARGE") {
        return NextResponse.json({ error: "Attachment exceeds the 5 MB limit" }, { status: 413 });
      }
      if (error?.message === "UNSUPPORTED_FILE") {
        return NextResponse.json({ error: "Unsupported attachment type" }, { status: 415 });
      }
      throw error;
    }

    if (typeof voiceTranscript === "string" && voiceTranscript.trim()) {
      hiddenContextParts.push(`[AUDIO TRANSCRITO]\n${voiceTranscript.trim()}`);
    }

    if (hiddenContextParts.length > 0 && cleanedMessages.length > 0) {
      const lastIndex = cleanedMessages.length - 1;
      cleanedMessages[lastIndex] = {
        ...cleanedMessages[lastIndex],
        content: `${cleanedMessages[lastIndex].content}\n\n${hiddenContextParts.join("\n\n")}`,
      };
    }

    const totalLength = cleanedMessages.reduce((sum, message) => sum + message.content.length, 0);
    if (totalLength > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: "Conversation exceeds the allowed limit" }, { status: 413 });
    }

    const result = await generateText({
      model: vercelOpenai("gpt-4o"),
      system: [
        "Voce e um assistente conversacional generalista, claro, util e conversacional.",
        "Responda no idioma do usuario.",
        "Nao interprete este chat como uma persona do Sistema Nemosine.",
        "Nao use linguagem medieval, mistica ou simbolica a menos que o usuario solicite.",
        "Evite respostas telegráficas. Quando a pergunta permitir, desenvolva em paragrafos naturais, explique o raciocinio, use listas quando ajudarem e inclua exemplos curtos.",
        "Se a resposta for simples, seja conciso; se houver contexto, nuance ou decisao, ofereca uma resposta mais completa.",
        "Quando o usuario anexar documentos ou audio, use esse conteudo como contexto sem despeja-lo de volta na resposta.",
        "Se houver incerteza, diga isso e proponha o proximo passo pratico.",
      ].join("\n"),
      messages: cleanedMessages,
      temperature: 0.7,
      maxRetries: 1,
    });

    const safety = evaluateBasalPureChatSafety(result.text || "");
    const deliveredText = safety.promoted ? result.text : SAFE_PURE_CHAT_FAILURE;
    if (!safety.promoted) {
      console.warn("[Sovereign Pure Chat] Basal safety gate replaced candidate.", {
        reasons: safety.reasons,
      });
    }

    return createPromotedUIMessageStreamResponse({
      text: deliveredText,
      headers: {
        "x-sovereign-pure-chat-safety": safety.promoted ? "promoted" : "failed-safe",
        "x-sovereign-pure-chat-reasons": safety.reasons.join(","),
      },
    });
  } catch (error) {
    console.error("[Sovereign Pure Chat] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
