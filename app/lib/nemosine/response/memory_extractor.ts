import { createDestinyEvent } from "@/app/lib/sovereignStore";
import { createUserRegistry } from "@/app/lib/userFeatureStore";
import { addUserMemory } from "@/app/lib/nemosine/session_store";
import {
  hasExplicitDestinyAuthorization,
  hasExplicitMemoryAuthorization,
  hasExplicitRegistryAuthorization,
} from "@/app/lib/nemosine/cognitive-runtime/side-effect-committer";
import {
  MemoryExtractionResult,
  ResponsePipelineRequest,
} from "./types";
import { compactText, normalizeResponseText } from "./text";

export function stripInternalActionTags(text: string) {
  return text
    .replace(/\[MEMORY:\s*[^\]\r\n]{1,1000}\]/gi, "")
    .replace(/\[REGISTRY:\s*[^\]\r\n]+?\]/gi, "")
    .replace(/\[DESTINY:\s*[^\]\r\n]+?\]/gi, "")
    .trim();
}

function countLegacyTags(text: string) {
  return (text.match(/\[(MEMORY|REGISTRY|DESTINY):/gi) || []).length;
}

function parseDeadline(text: string) {
  return text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1] || null;
}

function registryIdea(text: string) {
  const afterColon = text.split(":").slice(1).join(":").trim();
  return compactText(afterColon || text, 480);
}

function destinyTitle(text: string) {
  const cleaned = text
    .replace(/registre|registrar|inclua|incluir|grave|gravar|linha do destino/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return compactText(cleaned || "Marco da conversa", 160);
}

function shouldCreateEpisodeSummary(userText: string) {
  const normalized = normalizeResponseText(userText);
  return userText.trim().length >= 80
    && !/\b(como posso ajudar|oi|ola|bom dia|boa tarde|boa noite)\b/.test(normalized);
}

export function extractMemoryAfterResponse(input: {
  request: ResponsePipelineRequest;
  rawAnswer: string;
  visibleAnswer: string;
}): MemoryExtractionResult {
  const memoryAuthorized = hasExplicitMemoryAuthorization(input.request.userText);
  const registryAuthorized = hasExplicitRegistryAuthorization(input.request.userText);
  const destinyAuthorized = hasExplicitDestinyAuthorization(input.request.userText);
  const memories = [];

  if (memoryAuthorized) {
    memories.push({
      category: "stable-fact" as const,
      content: compactText(input.request.userText, 900),
      confidence: "high" as const,
      scope: input.request.memoryScope,
      shouldPersist: true,
    });
  }

  const episodeSummary = shouldCreateEpisodeSummary(input.request.userText)
    ? compactText(`Nesta interacao, o usuario trouxe: ${input.request.userText}`, 900)
    : undefined;

  if (episodeSummary && memoryAuthorized) {
    memories.push({
      category: "episode" as const,
      content: episodeSummary,
      confidence: "medium" as const,
      scope: input.request.memoryScope,
      shouldPersist: true,
    });
  }

  return {
    memories,
    episodeSummary,
    registrySuggestion: registryAuthorized && !input.request.privateRun
      ? {
        idea: registryIdea(input.request.userText),
        deadline: parseDeadline(input.request.userText),
        status: "Pendente",
      }
      : null,
    destinySuggestion: destinyAuthorized && !input.request.privateRun
      ? {
        title: destinyTitle(input.request.userText),
        date: parseDeadline(input.request.userText),
        category: "marco",
        description: compactText(input.request.userText, 560),
      }
      : null,
    legacyTagsRemoved: countLegacyTags(input.rawAnswer),
  };
}

export async function commitExtractedMemoryEffects(input: {
  request: ResponsePipelineRequest;
  extraction: MemoryExtractionResult;
}) {
  const committed = { memory: 0, registry: 0, destiny: 0 };

  for (const memory of input.extraction.memories) {
    if (!memory.shouldPersist || memory.scope !== input.request.memoryScope) continue;
    await addUserMemory(input.request.userId, memory.content, memory.scope);
    committed.memory += 1;
  }

  if (input.extraction.registrySuggestion && !input.request.privateRun) {
    await createUserRegistry(input.request.userId, {
      id: crypto.randomUUID(),
      idea: input.extraction.registrySuggestion.idea,
      chat_origin_id: input.request.threadId,
      persona: input.request.personaId,
      status: input.extraction.registrySuggestion.status || "Pendente",
      last_interaction: new Date().toISOString().split("T")[0],
      next_deadline: input.extraction.registrySuggestion.deadline || null,
      external_links: "",
      custom_columns: "{}",
    });
    committed.registry += 1;
  }

  if (input.extraction.destinySuggestion && !input.request.privateRun) {
    await createDestinyEvent(input.request.userId, {
      title: input.extraction.destinySuggestion.title,
      eventDate: input.extraction.destinySuggestion.date || null,
      eventDateLabel: input.extraction.destinySuggestion.date ? null : "sem data",
      category: input.extraction.destinySuggestion.category,
      shortDescription: input.extraction.destinySuggestion.description,
      symbolicIntensity: null,
      dominantEmotion: null,
      associatedPersona: input.request.personaId,
      visibility: "private",
      source: `response-pipeline-v2:${input.request.runId};thread:${input.request.threadId}`,
      tags: ["sugerido-por-pipeline-v2", input.request.personaId],
    });
    committed.destiny += 1;
  }

  input.extraction.committed = committed;
  return committed;
}
