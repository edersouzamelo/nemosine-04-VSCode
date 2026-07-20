import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import {
    createThread,
    getThread,
    addMessageToThread,
    getThreadsForPersona,
    getRecentConversationThreads,
    updateThreadTitle,
    deleteThread,
    addUserMemory,
    retainConversationEpisode,
    upsertHandoffEventMessage
} from '@/app/lib/nemosine/session_store';
import { auth } from '@/auth';
import { isAdminEmail } from '@/app/lib/accessControl';
import { generateText } from 'ai';
import { openai as vercelOpenai } from '@ai-sdk/openai';
import { buildSystemPromptAssembly, DEFAULT_CHAT_MAX_OUTPUT_TOKENS, DEFAULT_CHAT_MODEL, DEFAULT_CHAT_TEMPERATURE } from '@/app/lib/nemosine/llm_client';
import { readCognitiveRuntimeConfig } from '@/app/lib/nemosine/cognitive-runtime/config';
import {
    canPromoteReleasePreviewSafeRejectedCandidate,
    releasePreviewOriginalFindingCodes,
} from '@/app/lib/nemosine/release_candidate_promotion';
import { isInpiPromptFirstMode } from '@/app/lib/nemosine/release_config';
import {
    buildPromptFirstNarrativeRepairInstruction,
    buildInpiPromptFirstAssembly,
    evaluatePromptFirstNarrativeStyle,
    stripPromptFirstTechnicalMarkers,
} from '@/app/lib/nemosine/inpi_prompt_first';
import { countWords, selectResponseDepthProfile } from '@/app/lib/nemosine/response_depth';
import {
    createCognitiveRequest,
    createPromotedUIMessageStreamResponse,
    executeCognitiveRuntime,
} from '@/app/lib/nemosine/cognitive-runtime/runtime';
import { runCognitiveRuntime } from '@/app/lib/nemosine/cognitive-runtime/orchestrator';
import {
    classifyConversationInputRichness,
    buildDeterministicInitiativeFallback,
    evaluatePersonaInitiativeQuality,
    isConversationNavigationRequest,
    isPersonaMetaCritique,
    isPersonaRoleQuestion,
    isSourceReferenceRequest,
    normalizeInitiativeText,
    renderPersonaInitiativeRepairFeedback,
} from '@/app/lib/nemosine/persona-initiative';
import type { PersonaInitiativeQualityEvaluation } from '@/app/lib/nemosine/persona-initiative';
import { ENTITIES } from '@/app/data/entities';
import { isPrivateMemorySpace } from '@/app/lib/nemosine/privacy';
import { createUserRegistry } from '@/app/lib/userFeatureStore';
import { createDestinyEvent } from '@/app/lib/sovereignStore';
import {
    buildRuntimePersonaGuard,
    sanitizeConversationHistory,
    stripGenericAssistantClosing,
    writePromptDebugAudit,
} from '@/app/lib/nemosine/payload_hygiene';
import {
    detectGenericClosingViolation,
    normalizePresenceMode,
    renderPresenceAnchoredUserText,
    removeGenericClosingByContract,
    renderPresenceContractForRuntime,
    shouldAnchorPresenceContractForTurn,
} from '@/app/lib/nemosine/presence_adjustment';
import type { ConversationPresenceContract } from '@/app/lib/nemosine/presence_adjustment';
import type { PresenceAdjustmentMode } from '@/app/lib/nemosine/presence_adjustment';
import { retainActiveTopicsFromUserMessage } from '@/app/lib/nemosine/conversation_continuity';
import {
    commitExtractedMemoryEffects,
    readResponsePipelineConfig,
    runResponsePipelineV2,
    storeResponsePipelineAudit,
} from '@/app/lib/nemosine/response';
import type { ResponsePipelineRequest } from '@/app/lib/nemosine/response';
import { observeCognitiveFoundationResponse } from '@/app/lib/nemosine/cognitive-foundation';
import {
    buildPersonaHandoffOffer,
    encodeHandoffMarker,
    inferHandoffTarget,
    isHandoffSelectionRequest,
    PersonaHandoffOffer,
    resolveVocationalTargets,
    stripHandoffMarkers,
} from '@/app/lib/nemosine/handoff';
import {
    buildDeterministicThreadTitle,
    classifyTitlePayloadKind,
    shouldRepairThreadTitle,
} from '@/app/lib/nemosine/thread_title';
import { extractPureUserText, PRESENCE_OPENING_MARKER } from '@/app/lib/nemosine/pure_user_text';
import {
    buildSocialContinuationAnswer,
    isTechnicalAssistantFallback,
} from '@/app/lib/nemosine/social_continuation';
import { buildReleaseOnePersonaRescueAnswer } from '@/app/lib/nemosine/release_one_persona_rescue';
import { buildFantasmaReleaseAnswer } from '@/app/lib/nemosine/fantasma_release_rescue';
import {
    buildTraceFromPromptStack,
    getPromptConsoleRuntime,
} from '@/app/lib/nemosine/prompt_console_store';
import { isPromptStackInterceptorEnabled } from '@/app/lib/nemosine/prompt_stack';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_EXTRACTED_PDF_TEXT_LENGTH = 100_000;
const MAX_TEXT_FILE_SIZE_BYTES = 1 * 1024 * 1024;
const MAX_MESSAGE_TEXT_LENGTH = 120_000;
const COLLECTIVE_PERSONA_SYSTEM_FAILURE = "Nao foi possivel formular uma resposta adequada nesta tentativa.";

function isVocationalContinuationQuestion(text: string) {
    const normalized = text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    return /\b(qual persona seria|quem voce recomenda|me manda para alguem|qual e a melhor|qual seria melhor|abre o|abrir o|quero falar com)\b/.test(normalized);
}

function isMultiPersonaSystemEventText(text: string) {
    const cleaned = stripHandoffMarkers(text)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    return /\b(entrou na conversa|deixou a conversa|foi silenciad[oa]|voltou a falar|falando apenas com|foco exclusivo removido)\b/.test(cleaned);
}

function isDegradedAssistantFallbackText(text: string) {
    const normalized = stripHandoffMarkers(text)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
    return isTechnicalAssistantFallback(normalized)
        || /^parece que houve um problema vamos tentar novamente\b/.test(normalized)
        || /^nao foi possivel obter resposta agora\b/.test(normalized);
}

function isDevOnlyHistoryMessage(message: {
    role?: string;
    content?: string;
    metadata?: unknown | null;
    messageKind?: string | null;
    speakerPersonaId?: string | null;
}, primaryPersonaId?: string | null) {
    const metadata = message.metadata as { eventType?: string } | null | undefined;
    const content = stripHandoffMarkers(message.content || "").trim();
    if (content.startsWith(PRESENCE_OPENING_MARKER)) return true;
    if (metadata?.eventType === "HANDOFF_OFFERED") return true;
    if ((message.role === "system" || message.messageKind === "SYSTEM_EVENT") && isMultiPersonaSystemEventText(content)) return true;
    if (message.role === "assistant" && isDegradedAssistantFallbackText(content)) return true;
    if (
        message.role === "assistant"
        && message.speakerPersonaId
        && primaryPersonaId
        && message.speakerPersonaId !== primaryPersonaId
    ) return true;
    return false;
}

function sanitizePublicSinglePersonaHistory<T extends {
    role?: string;
    content?: string;
    metadata?: unknown | null;
    messageKind?: string | null;
    speakerPersonaId?: string | null;
}>(history: T[], primaryPersonaId?: string | null): T[] {
    return history
        .filter((message) => !isDevOnlyHistoryMessage(message, primaryPersonaId))
        .map((message) => {
            if (message.role !== "assistant" || typeof message.content !== "string") return message;
            return {
                ...message,
                speakerPersonaId: primaryPersonaId || message.speakerPersonaId || null,
                content: stripHandoffMarkers(message.content),
            } as T;
        });
}

function primaryPersonaFromConversationScope(scope?: string | null) {
    return scope?.split(/\s+@\s+/)[0]?.trim() || scope || null;
}

function hideDevOnlyThreadFields<T extends { participants?: unknown[]; messages?: any[]; personaId?: string }>(thread: T): T {
    const next = { ...thread } as any;
    if (Array.isArray(next.participants)) next.participants = [];
    if (Array.isArray(next.messages)) next.messages = sanitizePublicSinglePersonaHistory(next.messages, primaryPersonaFromConversationScope(next.personaId));
    return next;
}

function buildPublicPersonaRoutingAnswer(input: {
    sourcePersona: string;
    targetPersona?: string | null;
    userText: string;
}) {
    const normalized = input.userText
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const asksRecommendation = /\b(qual persona|quem voce recomenda|quem seria melhor|quem pode ajudar melhor|qual seria melhor)\b/.test(normalized);
    const target = input.targetPersona?.trim();

    if (target && target !== input.sourcePersona) {
        const opening = asksRecommendation
            ? `Para esse pedido, eu procuraria ${target}.`
            : `Eu nao consigo chamar ${target} dentro desta conversa nesta versao.`;
        return [
            opening,
            `O caminho limpo e: abra o menu de personas, escolha ${target} e inicie uma nova conversa com ela. Se quiser manter o fio, leve para la uma frase curta com o que voce quer resolver.`,
            `Daqui eu continuo como ${input.sourcePersona}, sem transformar esta conversa em conselho ou convite coletivo.`,
        ].join("\n\n");
    }

    return [
        `Eu consigo orientar a escolha, mas nao vou acionar outra persona dentro desta conversa nesta versao.`,
        "O caminho limpo e: abra o menu de personas, escolha a voz mais adequada para o que voce quer fazer e inicie uma nova conversa ali.",
        `Daqui eu continuo como ${input.sourcePersona}, em conversa individual.`,
    ].join("\n\n");
}

function persistedHandoffOffers(history: Array<{ id: string; metadata?: unknown | null }>) {
    return history
        .map((message) => {
            const metadata = message.metadata as any;
            if (!metadata || metadata.eventType !== "HANDOFF_OFFERED" || !metadata.targetPersona) return null;
            return {
                sourcePersona: metadata.sourcePersona,
                targetPersona: metadata.targetPersona,
                targetSlug: metadata.targetSlug,
                title: metadata.title,
                reason: metadata.reason,
                summary: metadata.summary,
                draft: metadata.draft,
                requiresConfirmation: Boolean(metadata.requiresConfirmation),
                state: metadata.state || "offered",
                eventMessageId: message.id,
                originMessageId: metadata.originMessageId || null,
                handoffContextId: typeof metadata.handoffContextId === "string" ? metadata.handoffContextId : null,
                userAuthoredPrompt: typeof metadata.userAuthoredPrompt === "string" ? metadata.userAuthoredPrompt : null,
                structuredSummary: typeof metadata.structuredSummary === "string" ? metadata.structuredSummary : null,
                decisionId: typeof metadata.decisionId === "string" ? metadata.decisionId : null,
                trigger: typeof metadata.trigger === "string" ? metadata.trigger as PersonaHandoffOffer["trigger"] : null,
                currentPersonaFit: typeof metadata.currentPersonaFit === "string" ? metadata.currentPersonaFit as PersonaHandoffOffer["currentPersonaFit"] : null,
            } as PersonaHandoffOffer;
        })
        .filter(Boolean) as PersonaHandoffOffer[];
}

function buildHandoffOffersFromResolution(input: {
    sourcePersona: string;
    userText: string;
    resolution: ReturnType<typeof resolveVocationalTargets>;
    privateRun: boolean;
}) {
    const decisionId = crypto.randomUUID();
    const personas = [
        input.resolution.primaryTargetPersonaId,
        ...input.resolution.alternativeTargetPersonaIds,
    ]
        .filter((persona): persona is string => Boolean(persona) && persona !== input.sourcePersona)
        .slice(0, 3);
    return personas.map((targetPersona) => buildPersonaHandoffOffer({
        sourcePersona: input.sourcePersona,
        targetPersona,
        userText: input.userText,
        privateRun: input.privateRun,
        reasonOverride: input.resolution.rationaleByPersona[targetPersona],
        decisionId,
        trigger: input.resolution.trigger || "explicit_user_request",
        currentPersonaFit: input.resolution.currentPersonaFit,
    }));
}

function hasExplicitDestinyAuthorization(text: string) {
    const normalized = text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    return [
        'registre na linha do destino',
        'registrar na linha do destino',
        'inclua na linha do destino',
        'incluir na linha do destino',
        'grave na linha do destino',
        'gravar na linha do destino',
        'pode incluir',
        'pode registrar',
        'pode gravar',
        'sim, registre',
        'sim registre',
        'sim, grave',
        'sim grave',
    ].some((phrase) => normalized.includes(phrase));
}

function normalizeDestinyDate(value?: string) {
    const raw = value?.trim();
    if (!raw || raw.toLowerCase() === 'sem data') return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function normalizeDestinyIntensity(value?: string) {
    const raw = value?.trim();
    if (!raw) return null;
    const parsed = Number(raw.match(/\d+/)?.[0]);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

function stripLegacyActionTags(text: string) {
    return text
        .replace(/\[MEMORY:\s*[^\]\r\n]{1,1000}\]/gi, '')
        .replace(/\[REGISTRY:\s*[^\]\r\n]+?\]/gi, '')
        .replace(/\[DESTINY:\s*[^\]\r\n]+?\]/gi, '')
        .trim();
}

async function commitPromotedLegacyEffects(input: {
    rawText: string;
    userId: string;
    activeThreadId: string;
    memoryScope: string;
    personaId: string;
    userText: string;
}) {
    const memoryMatches = [...input.rawText.matchAll(/\[MEMORY:\s*([^\]\r\n]{1,1000})\]/gi)];

    for (const match of memoryMatches.slice(0, 3)) {
        await addUserMemory(input.userId, match[1], input.memoryScope);
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

        try {
            await createUserRegistry(input.userId, {
                id: crypto.randomUUID(),
                idea,
                chat_origin_id: input.activeThreadId,
                persona: input.personaId,
                status: statusVal,
                last_interaction: new Date().toISOString().split("T")[0],
                next_deadline: deadlineVal,
                external_links: "",
                custom_columns: "{}"
            });
        } catch (err) {
            console.error("[Chat/API] Failed to auto-create registry:", err);
        }
    }

    const destinyMatches = [...input.rawText.matchAll(/\[DESTINY:\s*([^\]\r\n]{1,1200})\]/gi)];
    const destinyAuthorized = hasExplicitDestinyAuthorization(input.userText);
    if (destinyAuthorized) {
        for (const match of destinyMatches.slice(0, 2)) {
            const parts = match[1].split('|').map((part) => part.trim());
            const title = parts[0];
            const eventDate = normalizeDestinyDate(parts[1]);
            const eventDateLabel = eventDate ? null : (parts[1] || null);
            const category = parts[2] || 'marco';
            const shortDescription = parts[3] || title;
            const symbolicIntensity = normalizeDestinyIntensity(parts[4]);
            const dominantEmotion = parts[5] || null;

            if (!title || !shortDescription) continue;

            try {
                await createDestinyEvent(input.userId, {
                    title,
                    eventDate,
                    eventDateLabel,
                    category,
                    shortDescription,
                    symbolicIntensity,
                    dominantEmotion,
                    associatedPersona: input.personaId,
                    visibility: 'private',
                    source: `persona:${input.personaId};thread:${input.activeThreadId}`,
                    tags: ['sugerido-por-persona', input.personaId],
                });
            } catch (err) {
                console.error("[Chat/API] Failed to auto-create destiny event:", err);
            }
        }
    }
}

function readInitiativeRepairLimit() {
    const parsed = Number(process.env.NEMOSINE_PERSONA_INITIATIVE_MAX_REPAIRS);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(0, Math.min(3, Math.floor(parsed)));
}

function canPromoteRejectedPersonaCandidate(evaluation: PersonaInitiativeQualityEvaluation, text: string) {
    if (text.trim().length < 80) return false;

    const nonPromotableCodes = new Set([
        "FALSE_CONTEXT_DENIAL",
        "GENERIC_ASSISTANT_MODE",
        "GENERIC_INTERVIEW_MODE",
        "INTERROGATIVE_ELICITATION",
        "EMPTY_FINAL_QUESTION",
        "UNSUPPORTED_BIOGRAPHICAL_ASSERTION",
        "PRIVATE_CONTEXT_LEAK",
        "GENERIC_CLOSING",
        "INTERNAL_CONTROL_LEAK",
    ]);

    return !evaluation.findings.some((finding) =>
        finding.severity === "critical" || nonPromotableCodes.has(finding.code)
    );
}

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

const INPI_PROMPT_FIRST_MAX_OUTPUT_TOKENS = 6000;

function getConfiguredInpiPromptFirstChatModel() {
    const model = process.env.NEMOSINE_INPI_CHAT_MODEL?.trim()
        || process.env.OPENAI_CHAT_MODEL?.trim()
        || process.env.CHAT_MODEL?.trim()
        || DEFAULT_CHAT_MODEL;

    return {
        id: "inpi-prompt-first",
        provider: "openai",
        model,
        modelInstance: vercelOpenai(model),
        source: process.env.NEMOSINE_INPI_CHAT_MODEL?.trim()
            ? "NEMOSINE_INPI_CHAT_MODEL"
            : process.env.OPENAI_CHAT_MODEL?.trim()
                ? "OPENAI_CHAT_MODEL"
                : process.env.CHAT_MODEL?.trim()
                    ? "CHAT_MODEL"
                    : "DEFAULT_CHAT_MODEL",
    };
}

function promptFirstProviderOptions(input: {
    modelId: string;
    reasoningEffort: "medium" | "high";
}) {
    if (!/^gpt-5(?:\.|-|$)/i.test(input.modelId)) return undefined;
    return {
        openai: {
            textVerbosity: "high",
            reasoningEffort: input.reasoningEffort,
        },
    };
}

async function expandPromptFirstAnswer(input: {
    modelInstance: ReturnType<typeof vercelOpenai>;
    modelId: string;
    systemPrompt: string;
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    answer: string;
    minWords: number;
    reasoningEffort: "medium" | "high";
}) {
    return generateText({
        model: input.modelInstance,
        system: input.systemPrompt,
        messages: [
            ...input.messages,
            { role: "assistant", content: input.answer },
            {
                role: "user",
                content: [
                    `Expanda a resposta anterior para pelo menos ${input.minWords} palavras, preservando todas as afirmacoes ja feitas.`,
                    "Nao invente fatos externos. Acrescente elaboracao, relacoes, consequencias, contrapontos e exemplos ancorados no contexto ja disponivel.",
                    "Mantenha a voz da persona. Nao explique este pedido tecnico ao usuario.",
                ].join("\n"),
            },
        ],
        temperature: DEFAULT_CHAT_TEMPERATURE,
        maxOutputTokens: INPI_PROMPT_FIRST_MAX_OUTPUT_TOKENS,
        maxRetries: 1,
        providerOptions: promptFirstProviderOptions({
            modelId: input.modelId,
            reasoningEffort: input.reasoningEffort,
        }),
    });
}

function createResponsePipelineRequest(input: {
    cognitiveRequest: ReturnType<typeof createCognitiveRequest>;
}): ResponsePipelineRequest {
    return {
        runId: crypto.randomUUID(),
        userId: input.cognitiveRequest.userId,
        threadId: input.cognitiveRequest.threadId,
        personaId: input.cognitiveRequest.personaId,
        placeId: input.cognitiveRequest.placeId,
        language: input.cognitiveRequest.language,
        userText: input.cognitiveRequest.userText,
        displayUserText: input.cognitiveRequest.displayUserText,
        memoryScope: input.cognitiveRequest.memoryScope,
        privateRun: input.cognitiveRequest.privateRun,
        priorHistory: input.cognitiveRequest.priorHistory || [],
    };
}

function buildBufferedLlmFailureMessage(error: unknown) {
    console.error("[API/Chat] LLM generation failed before buffered delivery:", error);
    return "O sistema esta instavel. Nao consigo concluir esta resposta agora.";
}

function splitConversationScope(scope: string) {
    const [personaName, placeName] = scope.split(/\s+@\s+/);
    return {
        personaName: personaName?.trim() || scope,
        placeName: placeName?.trim() || null,
    };
}

function displayConversationScope(scope: string) {
    const { personaName, placeName } = splitConversationScope(scope);
    return placeName ? `${personaName} em ${placeName}` : personaName;
}

function threadMatchesRequest(
    thread: { personaId: string; placeId?: string | null },
    personaId: string,
    placeId: string | undefined,
    legacyConversationScope: string,
) {
    if (thread.personaId === legacyConversationScope) return true;
    const legacyThreadScope = splitConversationScope(thread.personaId);
    const threadHost = legacyThreadScope.personaName;
    const threadPlace = thread.placeId || legacyThreadScope.placeName || undefined;
    return threadHost === personaId && (threadPlace || undefined) === (placeId || undefined);
}

function compactNavigationText(text: string, maxLength = 260) {
    const cleaned = stripLegacyActionTags(text)
        .replace(/\s+/g, " ")
        .trim();
    if (cleaned.length <= maxLength) return cleaned;
    return `${cleaned.slice(0, maxLength).trim()}...`;
}

function summarizeConversationForNavigation(input: {
    activeScope: string;
    targetScope: string;
    messages: Array<{ role: string; content: string }>;
}) {
    const targetName = displayConversationScope(input.targetScope);
    const activeName = displayConversationScope(input.activeScope);
    const visibleMessages = input.messages
        .filter((message) => (message.role === "user" || message.role === "assistant") && message.content.trim())
        .slice(-10);
    const userTurns = visibleMessages
        .filter((message) => message.role === "user")
        .map((message) => compactNavigationText(message.content, 220))
        .filter(Boolean)
        .slice(-5);
    const assistantTurns = visibleMessages
        .filter((message) => message.role === "assistant")
        .map((message) => compactNavigationText(message.content, 220))
        .filter(Boolean)
        .slice(-3);

    if (userTurns.length === 0 && assistantTurns.length === 0) {
        return `Encontrei a conversa com ${targetName}, mas ela nao tem mensagens legiveis suficientes para eu resumir.`;
    }

    return [
        `Sim. Eu vejo o registro recente da conversa com ${targetName}.`,
        userTurns.length > 0
            ? [
                "O que voce levou para la foi:",
                userTurns.map((turn, index) => `${index + 1}. ${turn}`).join("\n"),
            ].join("\n")
            : "",
        assistantTurns.length > 0
            ? `${targetName} respondeu em torno disto: ${assistantTurns.join(" / ")}`
            : "",
        `Falando como ${activeName}, o ponto vivo nao e adivinhar: e usar esse rastro sem trocar minha voz pela de ${targetName}.`,
    ].filter(Boolean).join("\n\n");
}

function asksPreviousConversationContent(text: string) {
    const normalized = normalizeInitiativeText(text || "");
    return /\b(o que|que)\b.{0,80}\b(disse|falei|falamos|conversei|conversamos|foi dito)\b/.test(normalized)
        || /\bnessa conversa\b/.test(normalized)
        || /\bnessa ultima conversa\b/.test(normalized);
}

function resolveStatedConversationPartnerName(text: string) {
    const normalized = normalizeInitiativeText(text || "");
    const partnerSegment = [
        /\b(?:estava|tava|estive|vinha|falava|conversava|acabei de)\s+(?:falando|conversando|falei|conversei|falar|conversar)?\s*com\s+(?:(?:o|a)\s+)?(.{2,80})/u,
        /\b(?:falei|conversei)\s+com\s+(?:(?:o|a)\s+)?(.{2,80})/u,
    ].map((pattern) => normalized.match(pattern)?.[1] || "")
        .find((segment) => segment && !/\bquem\b/.test(segment));
    if (!partnerSegment) return null;

    const personas = Object.values(ENTITIES).filter((entity) => entity.type === "persona");
    return personas.find((persona) => partnerSegment.includes(normalizeInitiativeText(persona.name)))?.name || null;
}

async function buildConversationNavigationAnswer(input: {
    userId: string;
    activeThreadId: string;
    personaId: string;
    memoryScope: string;
    userText: string;
}) {
    if (!isConversationNavigationRequest(input.userText)) return null;

    const normalized = normalizeInitiativeText(input.userText);
    const mentionedPersonaName = resolveStatedConversationPartnerName(input.userText);
    const recentThreads = await getRecentConversationThreads(input.userId, 20);
    const previousThread = recentThreads.find((thread) => thread.id !== input.activeThreadId) || null;
    const currentScope = displayConversationScope(input.personaId);
    const correctionTone = /\b(errou|errado|estava|tava|estive|vinha|falava|conversava)\b/.test(normalized);

    if (mentionedPersonaName) {
        const targetThread = recentThreads.find((thread) =>
            thread.id !== input.activeThreadId
            && normalizeInitiativeText(splitConversationScope(thread.personaId).personaName) === normalizeInitiativeText(mentionedPersonaName)
        ) || null;

        if (!targetThread) {
            return `Voce citou ${mentionedPersonaName}, mas eu nao encontrei uma conversa recente registrada com essa persona fora desta janela.`;
        }

        if (isPrivateMemorySpace(targetThread.personaId) && !isPrivateMemorySpace(input.memoryScope)) {
            return `Ha uma conversa privada recente com ${mentionedPersonaName}, mas eu nao vou trazer esse conteudo para ${currentScope}.`;
        }

        const targetConversation = await getThread(input.userId, targetThread.id);
        if (!targetConversation) {
            return `Encontrei o rastro de ${mentionedPersonaName}, mas nao consegui abrir as mensagens dessa conversa agora.`;
        }

        const summary = summarizeConversationForNavigation({
            activeScope: input.personaId,
            targetScope: targetThread.personaId,
            messages: targetConversation.messages,
        });

        return correctionTone ? `Voce tem razao: eu tinha que olhar esse rastro.\n\n${summary}` : summary;
    }

    if (!previousThread) {
        return `Nao encontrei uma conversa anterior registrada fora desta janela. O que aparece agora para mim e apenas esta conversa com ${currentScope}.`;
    }

    if (isPrivateMemorySpace(previousThread.personaId) && !isPrivateMemorySpace(input.memoryScope)) {
        return "Ha uma conversa privada recente fora desta janela, mas eu nao vou nomea-la dentro de uma persona publica. Se voce voltar ao espaco privado, eu consigo manter esse limite sem misturar as vozes.";
    }

    const previousScope = displayConversationScope(previousThread.personaId);
    if (asksPreviousConversationContent(input.userText)) {
        const previousConversation = await getThread(input.userId, previousThread.id);
        if (previousConversation) {
            return summarizeConversationForNavigation({
                activeScope: input.personaId,
                targetScope: previousThread.personaId,
                messages: previousConversation.messages,
            });
        }
    }
    return `Pelo registro recente, antes daqui voce estava falando com ${previousScope}. Posso ver apenas o que esta registrado no Nemosine, mas o rastro mais proximo e esse.`;
}

function shouldRetainUserInputForContinuity(userText: string) {
    if (userText.startsWith(PRESENCE_OPENING_MARKER)) return false;
    const richness = classifyConversationInputRichness(userText);
    return richness.richness === "high"
        && !richness.requiresContextExpansion
        && !isConversationNavigationRequest(userText)
        && !isPersonaMetaCritique(userText)
        && !isPersonaRoleQuestion(userText)
        && !isSourceReferenceRequest(userText);
}

async function getAuthenticatedUser(): Promise<{ id: string; email?: string | null } | null> {
    const session = await auth();
    const id = session?.user?.id;
    if (!id) return null;
    return { id, email: session.user?.email };
}

async function getAuthenticatedUserId(): Promise<string | null> {
    return (await getAuthenticatedUser())?.id ?? null;
}

function unauthorizedResponse() {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function resolveEffectivePresenceRuntimeMode(email?: string | null): PresenceAdjustmentMode {
    const explicitMode = normalizePresenceMode(process.env.PRESENCE_ADJUSTMENT_MODE);
    const localOrPreview = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
    if (explicitMode === "off" && isAdminEmail(email) && localOrPreview) return "internal";
    return explicitMode;
}

export async function POST(req: NextRequest) {
    try {
        const authenticatedUser = await getAuthenticatedUser();
        if (!authenticatedUser) return unauthorizedResponse();
        const userId = authenticatedUser.id;
        const multiPersonaDevOnly = isAdminEmail(authenticatedUser.email);
        const promptConsoleRuntime = getPromptConsoleRuntime({ userEmail: authenticatedUser.email });
        const requestId = crypto.randomUUID();

        const t0 = Date.now();
        const body = await req.json();
        const { messages, personaId, placeId, threadId, language, voiceTranscript } = body;
        const presenceRuntimeMode = resolveEffectivePresenceRuntimeMode(authenticatedUser.email);
        const submittedPresenceContract = body.presenceContract && typeof body.presenceContract === "object"
            ? body.presenceContract as ConversationPresenceContract
            : null;
        const submittedPresenceOverlayStatus = body.presenceOverlayStatus && typeof body.presenceOverlayStatus === "object"
            ? body.presenceOverlayStatus as {
                overlayEnabled?: boolean;
                overlayShouldAppear?: boolean;
                overlayAppeared?: boolean;
                userConfirmed?: boolean;
            }
            : null;
        const presenceContractConfirmed = body.presenceContractConfirmed === true;
        const activePresenceContract = submittedPresenceContract?.userId === userId
            && presenceContractConfirmed
            && (presenceRuntimeMode === "internal" || presenceRuntimeMode === "enforce" || presenceRuntimeMode === "shadow")
            ? submittedPresenceContract
            : null;
        const shouldApplyPresenceContract = Boolean(activePresenceContract && presenceRuntimeMode !== "shadow");
        const presenceRuntimePrompt = shouldApplyPresenceContract
            ? renderPresenceContractForRuntime(activePresenceContract, presenceRuntimeMode)
            : "";
        const applyPresenceContractToResponse = (text: string) => {
            if (!shouldApplyPresenceContract || !activePresenceContract) return text;
            const cleaned = removeGenericClosingByContract(text, activePresenceContract);
            const violation = detectGenericClosingViolation({ responseText: text, contract: activePresenceContract });
            if (violation.violation) {
                console.warn("[PresenceAdjustment] generic closing blocked", {
                    personaId,
                    threadId: typeof threadId === "string" ? threadId : null,
                    reasons: violation.reasons,
                });
            }
            return cleaned;
        };

        if (!Array.isArray(messages) || messages.length === 0 || typeof personaId !== 'string' || !personaId.trim()) {
            return NextResponse.json({ error: 'Invalid request format or missing personaId' }, { status: 400 });
        }
        const activePersona = Object.values(ENTITIES).find((entity) => entity.name === personaId && entity.type === 'persona');
        const activePlace = typeof placeId === 'string' && placeId.trim()
            ? Object.values(ENTITIES).find((entity) => entity.name === placeId && entity.type === 'place')
            : undefined;
        if (!activePersona || (placeId && !activePlace)) {
            return NextResponse.json({ error: 'Invalid persona or place context' }, { status: 400 });
        }
        const normalizedPlaceId = activePlace?.name;
        const conversationScope = normalizedPlaceId ? `${personaId} @ ${normalizedPlaceId}` : personaId;
        const memoryScope = isPrivateMemorySpace(personaId)
            ? personaId
            : normalizedPlaceId && isPrivateMemorySpace(normalizedPlaceId) ? normalizedPlaceId : personaId;

        const lastMessage = messages[messages.length - 1];
        let userText = lastMessage.parts
            ? lastMessage.parts.filter((part: any) => part.type === 'text').map((part: any) => part.text).join('\n')
            : lastMessage.content || '';

        if (typeof userText !== 'string') {
            return NextResponse.json({ error: 'Invalid message content' }, { status: 400 });
        }
        const rawDisplayUserText = userText;
        const pureExtraction = extractPureUserText(rawDisplayUserText);
        const isPresenceOpeningRequest = pureExtraction.source === "presence_opening";
        userText = pureExtraction.pureUserText;
        const displayUserText = userText;
        if (userText.length > MAX_MESSAGE_TEXT_LENGTH) {
            return NextResponse.json({ error: 'Message content exceeds the allowed limit' }, { status: 413 });
        }

        if (lastMessage.parts) {
            const fileParts = lastMessage.parts.filter((part: any) => part.type === 'file');

            for (const filePart of fileParts) {
                try {
                    if (filePart.url && filePart.url.includes('base64,')) {
                        const base64Data = filePart.url.split(',')[1];
                        const buffer = Buffer.from(base64Data, 'base64');
                        const filename = filePart.filename || 'documento';
                        const loweredFilename = filename.toLowerCase();
                        const isPdf = filePart.mediaType === 'application/pdf' || loweredFilename.endsWith('.pdf');
                        const isTextFile = filePart.mediaType === 'text/plain'
                            || filePart.mediaType === 'text/markdown'
                            || loweredFilename.endsWith('.txt')
                            || loweredFilename.endsWith('.md');

                        if (isPdf) {
                            if (buffer.length > MAX_PDF_SIZE_BYTES) {
                                return NextResponse.json({ error: 'PDF attachment exceeds the 5 MB limit' }, { status: 413 });
                            }

                            const pdfData = await pdfParse(buffer);
                            const extractedText = pdfData.text.slice(0, MAX_EXTRACTED_PDF_TEXT_LENGTH);
                            userText += `\n\n[CONTEUDO DO ARQUIVO ANEXADO (${filename})]\n${extractedText}`;
                        } else if (isTextFile) {
                            if (buffer.length > MAX_TEXT_FILE_SIZE_BYTES) {
                                return NextResponse.json({ error: 'Text attachment exceeds the 1 MB limit' }, { status: 413 });
                            }

                            const extractedText = buffer.toString('utf8').slice(0, MAX_EXTRACTED_PDF_TEXT_LENGTH);
                            userText += `\n\n[CONTEUDO DO ARQUIVO ANEXADO (${filename})]\n${extractedText}`;
                        } else {
                            return NextResponse.json({ error: 'Unsupported attachment type' }, { status: 415 });
                        }
                    }
                } catch (err) {
                    console.error('Error parsing attachment:', err);
                    userText += '\n\n[Falha ao extrair texto do arquivo anexado.]';
                }
            }
        }

        if (typeof voiceTranscript === 'string' && voiceTranscript.trim()) {
            userText += `\n\n[TRANSCRICAO DE AUDIO ANEXADO]\n${voiceTranscript.trim()}`;
        }

        if (userText.length > MAX_MESSAGE_TEXT_LENGTH) {
            return NextResponse.json({ error: 'Message content exceeds the allowed limit' }, { status: 413 });
        }

        let activeThreadId: string;
        let priorHistory: Array<{
            id: string;
            role: 'user' | 'assistant' | 'system';
            content: string;
            timestamp: number;
            metadata?: unknown | null;
        }> = [];
        let currentThreadTitle = "Nova conversa";

        if (typeof threadId !== 'string' || !threadId) {
            const thread = await createThread(userId, conversationScope, "Nova conversa");
            activeThreadId = thread.id;
            priorHistory = thread.messages;
            currentThreadTitle = thread.title;
        } else {
            const thread = await getThread(userId, threadId);
            if (!thread) {
                return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
            }
            if (!threadMatchesRequest(thread, personaId, normalizedPlaceId, conversationScope)) {
                return NextResponse.json({ error: 'Thread does not belong to this persona' }, { status: 403 });
            }
            activeThreadId = thread.id;
            priorHistory = thread.messages;
            currentThreadTitle = thread.title;
        }

        const modelPriorHistory = multiPersonaDevOnly
            ? priorHistory
            : sanitizePublicSinglePersonaHistory(priorHistory, personaId);
        const selectedLanguage = language === 'es' || language === 'en' ? language : 'pt-BR';
        const promptFirstActive = isInpiPromptFirstMode() || promptConsoleRuntime.enabled;
        if (promptFirstActive) {
            await addMessageToThread(userId, activeThreadId, 'user', displayUserText);
            if (shouldRepairThreadTitle(currentThreadTitle, displayUserText)) {
                const titleGenerated = buildDeterministicThreadTitle(displayUserText);
                await updateThreadTitle(userId, activeThreadId, titleGenerated).catch((error) => {
                    console.warn("[ThreadTitle] prompt-first title repair skipped.", {
                        threadId: activeThreadId,
                        errorCode: error instanceof Error ? error.name : "unknown",
                    });
                });
            }

            const promptFirstAssembly = await buildInpiPromptFirstAssembly({
                userId,
                personaId,
                memoryScope,
                userText,
                language: selectedLanguage,
                priorHistory: modelPriorHistory,
                activeThreadId,
                presenceContract: shouldApplyPresenceContract ? activePresenceContract : null,
                depthProfile: selectResponseDepthProfile({
                    userText,
                    priorHistory: modelPriorHistory,
                    personaId,
                    presenceContract: shouldApplyPresenceContract ? activePresenceContract : null,
                }),
                promptStackPreset: promptConsoleRuntime.preset,
                overlayStatus: {
                    overlayEnabled: Boolean(submittedPresenceOverlayStatus?.overlayEnabled ?? presenceRuntimeMode !== "off"),
                    overlayShouldAppear: Boolean(submittedPresenceOverlayStatus?.overlayShouldAppear ?? !activePresenceContract),
                    overlayAppeared: Boolean(submittedPresenceOverlayStatus?.overlayAppeared),
                    userConfirmed: Boolean(activePresenceContract || submittedPresenceOverlayStatus?.userConfirmed),
                },
            });
            let promptFirstRaw = "";
            let promptFirstResult: any = null;
            const promptFirstModel = getConfiguredInpiPromptFirstChatModel();
            const stylisticRegenerationAllowed = !promptConsoleRuntime.enabled
                || isPromptStackInterceptorEnabled(promptFirstAssembly.promptStackPreset, "stylistic_regeneration");
            const promptFirstProviderOptionsValue = promptFirstProviderOptions({
                modelId: promptFirstModel.model,
                reasoningEffort: promptFirstAssembly.depthProfile.reasoningEffort,
            });
            try {
                const result = await generateText({
                    model: promptFirstModel.modelInstance,
                    system: promptFirstAssembly.systemPrompt,
                    messages: promptFirstAssembly.messages,
                    temperature: DEFAULT_CHAT_TEMPERATURE,
                    maxOutputTokens: INPI_PROMPT_FIRST_MAX_OUTPUT_TOKENS,
                    maxRetries: 1,
                    providerOptions: promptFirstProviderOptionsValue,
                });
                promptFirstResult = result;
                promptFirstRaw = result.text;
            } catch (error) {
                const failureMessage = buildBufferedLlmFailureMessage(error);
                await addMessageToThread(userId, activeThreadId, 'assistant', failureMessage);
                return NextResponse.json(
                    {
                        error: "LLM generation failed before prompt-first delivery",
                        message: failureMessage,
                    },
                    { status: 502, headers: { 'x-thread-id': activeThreadId } },
                );
            }
            let promptFirstAnswer = stripPromptFirstTechnicalMarkers(promptFirstRaw);
            const initialWordCount = countWords(promptFirstAnswer);
            let expansionApplied = false;
            let expansionFailed = false;
            let styleRepairApplied = false;
            let styleRepairFailed = false;
            let styleRepairFindings: string[] = [];
            const shouldExpandPromptFirstAnswer = (
                promptFirstAssembly.depthProfile.id !== "GREETING"
            )
                && initialWordCount > 0
                && initialWordCount < promptFirstAssembly.depthProfile.minWords;
            if (
                stylisticRegenerationAllowed
                &&
                shouldExpandPromptFirstAnswer
            ) {
                try {
                    const expansion = await expandPromptFirstAnswer({
                        modelInstance: promptFirstModel.modelInstance,
                        modelId: promptFirstModel.model,
                        systemPrompt: promptFirstAssembly.systemPrompt,
                        messages: promptFirstAssembly.messages,
                        answer: promptFirstAnswer,
                        minWords: promptFirstAssembly.depthProfile.minWords,
                        reasoningEffort: "high",
                    });
                    promptFirstResult = expansion;
                    const expandedAnswer = stripPromptFirstTechnicalMarkers(expansion.text);
                    if (expandedAnswer.trim()) {
                        promptFirstAnswer = expandedAnswer;
                        expansionApplied = true;
                    }
                } catch (error) {
                    expansionFailed = true;
                    console.warn("[INPI_PROMPT_FIRST_EXPANSION_FAILED]", {
                        personaId,
                        threadId: activeThreadId,
                        modelId: promptFirstModel.model,
                        profile: promptFirstAssembly.depthProfile.id,
                        initialWordCount,
                        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
                    });
                }
            }
            const styleEvaluation = evaluatePromptFirstNarrativeStyle({
                answer: promptFirstAnswer,
                userText,
            });
            if (stylisticRegenerationAllowed && styleEvaluation.shouldRepair) {
                styleRepairFindings = styleEvaluation.findings;
                try {
                    const repair = await generateText({
                        model: promptFirstModel.modelInstance,
                        system: promptFirstAssembly.systemPrompt,
                        messages: [
                            ...promptFirstAssembly.messages,
                            { role: "assistant", content: promptFirstAnswer },
                            {
                                role: "user",
                                content: buildPromptFirstNarrativeRepairInstruction({
                                    personaId,
                                    userText,
                                    findings: styleEvaluation.findings,
                                    minWords: promptFirstAssembly.depthProfile.minWords,
                                }),
                            },
                        ],
                        temperature: DEFAULT_CHAT_TEMPERATURE,
                        maxOutputTokens: INPI_PROMPT_FIRST_MAX_OUTPUT_TOKENS,
                        maxRetries: 1,
                        providerOptions: promptFirstProviderOptions({
                            modelId: promptFirstModel.model,
                            reasoningEffort: "high",
                        }),
                    });
                    promptFirstResult = repair;
                    const repairedAnswer = stripPromptFirstTechnicalMarkers(repair.text);
                    const repairedStyle = evaluatePromptFirstNarrativeStyle({
                        answer: repairedAnswer,
                        userText,
                    });
                    if (repairedAnswer.trim() && !repairedStyle.shouldRepair) {
                        promptFirstAnswer = repairedAnswer;
                        styleRepairApplied = true;
                    } else {
                        styleRepairFailed = true;
                    }
                } catch (error) {
                    styleRepairFailed = true;
                    console.warn("[INPI_PROMPT_FIRST_STYLE_REPAIR_FAILED]", {
                        personaId,
                        threadId: activeThreadId,
                        modelId: promptFirstModel.model,
                        profile: promptFirstAssembly.depthProfile.id,
                        findings: styleEvaluation.findings,
                        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
                    });
                }
            }
            const finalWordCount = countWords(promptFirstAnswer);
            console.info("[INPI_PROMPT_FIRST_GENERATION]", {
                event: "INPI_PROMPT_FIRST_GENERATION",
                personaId,
                threadId: activeThreadId,
                provider: promptFirstModel.provider,
                modelId: promptFirstModel.model,
                modelSource: promptFirstModel.source,
                maxOutputTokens: INPI_PROMPT_FIRST_MAX_OUTPUT_TOKENS,
                verbosity: promptFirstProviderOptionsValue ? "high" : "provider-default",
                reasoningEffort: promptFirstProviderOptionsValue ? promptFirstAssembly.depthProfile.reasoningEffort : "provider-default",
                finishReason: promptFirstResult?.finishReason || null,
                inputTokens: promptFirstResult?.usage?.inputTokens ?? null,
                outputTokens: promptFirstResult?.usage?.outputTokens ?? null,
                totalTokens: promptFirstResult?.usage?.totalTokens ?? null,
                wordCount: finalWordCount,
                initialWordCount,
                depthProfile: promptFirstAssembly.depthProfile.id,
                expansionApplied,
                expansionFailed,
                styleRepairApplied,
                styleRepairFailed,
                styleRepairFindings,
                promptSource: promptFirstAssembly.promptSource,
                nativePromptKey: promptFirstAssembly.nativePromptKey,
            });
            buildTraceFromPromptStack({
                requestId,
                personaId,
                threadId: activeThreadId,
                model: promptFirstModel.model,
                preset: promptFirstAssembly.promptStackPreset,
                modules: promptFirstAssembly.promptStackModules,
                systemPrompt: promptFirstAssembly.systemPrompt,
                tokenCount: promptFirstAssembly.promptStackTokenCount,
                presence: promptFirstAssembly.promptStackPresence,
                memoryCount: promptFirstAssembly.retrievedMemoryCount,
                episodeCount: promptFirstAssembly.retrievedEpisodeCount,
                topicCount: promptFirstAssembly.retrievedTopicCount,
                codexDirectoryInserted: promptFirstAssembly.codexDirectoryInserted,
                constitutionInserted: promptFirstAssembly.constitutionInserted,
                interceptors: promptFirstAssembly.promptStackPreset.interceptors,
                triggeredInterceptor: null,
                llmCalled: true,
                finalResponseOrigin: "persona_llm",
                responseBeforeSanitizer: promptFirstRaw,
                responseAfterSanitizer: promptFirstAnswer,
                persistences: ["chat_message:user", "chat_message:assistant"],
                durationMs: Date.now() - t0,
            });
            await addMessageToThread(userId, activeThreadId, 'assistant', promptFirstAnswer);

            const cognitiveRequest = createCognitiveRequest({
                userId,
                threadId: activeThreadId,
                personaId,
                placeId: normalizedPlaceId,
                language: selectedLanguage,
                userText,
                displayUserText,
                memoryScope,
                priorHistory: modelPriorHistory,
            });
            const runtimeConfig = readCognitiveRuntimeConfig();
            if (runtimeConfig.mode === "shadow") {
                await runCognitiveRuntime(cognitiveRequest, {
                    config: runtimeConfig,
                    candidateOverride: promptFirstAnswer,
                }).catch((error) => {
                    console.error("[API/Chat] Prompt-first cognitive runtime shadow audit failed:", error);
                });
            }
            if (!isPresenceOpeningRequest && shouldRetainUserInputForContinuity(userText)) {
                await Promise.all([
                    retainConversationEpisode(userId, memoryScope, userText),
                    retainActiveTopicsFromUserMessage({
                        userId,
                        threadId: activeThreadId,
                        personaId,
                        memoryScope,
                        userText,
                    }),
                ]).catch((error) => {
                    console.warn("[API/Chat] Prompt-first continuity retention skipped.", error);
                });
            }

            return createPromotedUIMessageStreamResponse({
                text: promptFirstAnswer,
                headers: {
                    'x-thread-id': activeThreadId,
                    'x-inpi-prompt-first': 'true',
                    'x-cognitive-runtime': runtimeConfig.mode,
                    'x-prompt-first-native-prompt': String(promptFirstAssembly.nativePromptResolved),
                    'x-prompt-first-memory-count': String(promptFirstAssembly.retrievedMemoryCount),
                    'x-prompt-first-model': promptFirstModel.model,
                    'x-prompt-first-depth': promptFirstAssembly.depthProfile.id,
                    'x-prompt-first-word-count': String(finalWordCount),
                    'x-prompt-first-style-repair': String(styleRepairApplied),
                },
            });
        }
        const presenceAnchoredRouting = shouldApplyPresenceContract && shouldAnchorPresenceContractForTurn({
            userText,
            contract: activePresenceContract,
        });
        const routedUserText = presenceAnchoredRouting
            ? renderPresenceAnchoredUserText(userText, activePresenceContract)
            : userText;
        const shouldRetainConversationContinuity = !isPresenceOpeningRequest
            && !presenceAnchoredRouting
            && shouldRetainUserInputForContinuity(userText);
        await addMessageToThread(userId, activeThreadId, 'user', displayUserText);
        if (shouldRepairThreadTitle(currentThreadTitle, displayUserText)) {
            const titleGenerated = buildDeterministicThreadTitle(displayUserText);
            await updateThreadTitle(userId, activeThreadId, titleGenerated).catch((error) => {
                console.warn("[ThreadTitle] title repair skipped.", {
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

        const cognitiveRequest = createCognitiveRequest({
            userId,
            threadId: activeThreadId,
            personaId,
            placeId: normalizedPlaceId,
            language: selectedLanguage,
            userText: routedUserText,
            displayUserText,
            memoryScope,
            priorHistory: modelPriorHistory,
        });
        const runtimeConfig = readCognitiveRuntimeConfig();
        const responsePipelineConfig = readResponsePipelineConfig();
        let activeChatModel = getConfiguredPrimaryChatModel();

        const deliverEnforcedCognitiveRuntime = async (input: {
            candidateOverride?: string;
            headers?: Record<string, string>;
            handoffOffer?: PersonaHandoffOffer | null;
            handoffOffers?: PersonaHandoffOffer[];
            persistHandoffEvents?: boolean;
        } = {}) => {
            const runtimeResult = input.candidateOverride
                ? await runCognitiveRuntime(cognitiveRequest, {
                    config: runtimeConfig,
                    candidateOverride: input.candidateOverride,
                })
                : await executeCognitiveRuntime(cognitiveRequest);
            const deliveredRuntimeAnswer = runtimeResult.answer;
            const singleAuditHandoff = input.handoffOffer || null;
            const requestedHandoffOffers = input.handoffOffers?.length
                ? input.handoffOffers
                : singleAuditHandoff ? [singleAuditHandoff] : [];
            const rawHandoffOffers = multiPersonaDevOnly ? requestedHandoffOffers : [];
            const persistedHandoffOffers: PersonaHandoffOffer[] = [];
            if (rawHandoffOffers.length > 0 && runtimeResult.assistantMessageId && input.persistHandoffEvents !== false) {
                for (const offer of rawHandoffOffers) {
                    try {
                        const handoffMessage = await upsertHandoffEventMessage(userId, activeThreadId, {
                            originMessageId: runtimeResult.assistantMessageId,
                            offer,
                            state: 'offered',
                        });
                        persistedHandoffOffers.push({
                            ...offer,
                            eventMessageId: handoffMessage.id,
                            originMessageId: runtimeResult.assistantMessageId,
                            state: 'offered',
                            offeredAt: new Date(handoffMessage.timestamp).toISOString(),
                            updatedAt: new Date(handoffMessage.timestamp).toISOString(),
                        });
                    } catch (error) {
                        console.warn("[API/Chat] Handoff event persistence skipped.", error);
                        persistedHandoffOffers.push(offer);
                    }
                }
            }
            const handoffOffersForStream = persistedHandoffOffers.length > 0 ? persistedHandoffOffers : rawHandoffOffers;
            const streamedRuntimeAnswer = handoffOffersForStream.length > 0
                ? `${deliveredRuntimeAnswer}\n\n${handoffOffersForStream.map((offer) => encodeHandoffMarker(offer)).join("\n")}`
                : deliveredRuntimeAnswer;
            if (shouldRetainConversationContinuity) {
                await Promise.all([
                    retainConversationEpisode(userId, memoryScope, userText),
                    retainActiveTopicsFromUserMessage({
                        userId,
                        threadId: activeThreadId,
                        personaId,
                        memoryScope,
                        userText,
                    }),
                ]).catch((error) => {
                    console.warn("[API/Chat] Conversation continuity retention skipped after enforced runtime.", error);
                });
            }
            await observeCognitiveFoundationResponse({
                userId,
                threadId: activeThreadId,
                personaId,
                placeId: normalizedPlaceId,
                memoryScope,
                userText,
                responseText: deliveredRuntimeAnswer,
                participantCount: 1,
                privateRun: cognitiveRequest.privateRun,
            }).catch((error) => {
                console.warn("[API/Chat] Cognitive foundation observation skipped after enforced runtime.", error);
            });
            return createPromotedUIMessageStreamResponse({
                text: streamedRuntimeAnswer,
                headers: {
                    'x-thread-id': activeThreadId,
                    'x-cognitive-runtime': runtimeResult.runtimeMode,
                    'x-cognitive-delivery-contract': 'ocv-promotion-gate',
                    'x-cognitive-run-id': runtimeResult.runId,
                    'x-cognitive-promoted': String(runtimeResult.promoted),
                    'x-cognitive-promotion-decision': runtimeResult.audit.promotionDecision,
                    ...(handoffOffersForStream[0] ? {
                        'x-nemosine-handoff-target': handoffOffersForStream[0].targetPersona,
                        'x-nemosine-handoff-slug': handoffOffersForStream[0].targetSlug,
                        'x-nemosine-handoff-count': String(handoffOffersForStream.length),
                    } : {}),
                    ...(input.headers || {}),
                },
            });
        };

        const latestRawAssistantText = priorHistory.filter((message) => message.role === "assistant").at(-1)?.content || "";
        const latestAssistantText = modelPriorHistory.filter((message) => message.role === "assistant").at(-1)?.content || "";
        const socialContinuationAnswer = buildSocialContinuationAnswer({
            personaId,
            userText,
            latestAssistantText,
            latestRawAssistantText,
        });
        if (socialContinuationAnswer) {
            buildTraceFromPromptStack({
                requestId,
                personaId,
                threadId: activeThreadId,
                model: activeChatModel.model,
                preset: promptConsoleRuntime.preset,
                modules: [],
                systemPrompt: "",
                tokenCount: 0,
                presence: {
                    overlayEnabled: Boolean(submittedPresenceOverlayStatus?.overlayEnabled ?? presenceRuntimeMode !== "off"),
                    overlayShouldAppear: Boolean(submittedPresenceOverlayStatus?.overlayShouldAppear ?? !activePresenceContract),
                    overlayAppeared: Boolean(submittedPresenceOverlayStatus?.overlayAppeared),
                    userConfirmed: Boolean(activePresenceContract || submittedPresenceOverlayStatus?.userConfirmed),
                    resultingContract: activePresenceContract,
                    selectedDepth: activePresenceContract?.responseDepth || "PERSONA_DECIDES",
                    tone: activePresenceContract?.directnessLevel || "BALANCED",
                    restrictions: activePresenceContract?.customConstraints || [],
                    moduleInserted: false,
                    reasonWhenNotInserted: "Caminho legacy foi interceptado antes da montagem prompt-first.",
                },
                memoryCount: 0,
                episodeCount: 0,
                topicCount: 0,
                codexDirectoryInserted: false,
                constitutionInserted: false,
                interceptors: promptConsoleRuntime.preset.interceptors,
                triggeredInterceptor: "social_continuation",
                llmCalled: false,
                finalResponseOrigin: "interceptor",
                responseBeforeSanitizer: socialContinuationAnswer,
                responseAfterSanitizer: socialContinuationAnswer,
                persistences: ["chat_message:user", "chat_message:assistant"],
                durationMs: Date.now() - t0,
            });
            await addMessageToThread(userId, activeThreadId, 'assistant', socialContinuationAnswer);
            return createPromotedUIMessageStreamResponse({
                text: socialContinuationAnswer,
                headers: {
                    'x-thread-id': activeThreadId,
                    'x-nemosine-social-continuation': 'true',
                    'x-cognitive-runtime': runtimeConfig.mode,
                },
            });
        }
        const fantasmaReleaseAnswer = buildFantasmaReleaseAnswer({
            personaId,
            userText,
            latestAssistantText,
            latestRawAssistantText,
        });
        if (fantasmaReleaseAnswer) {
            await addMessageToThread(userId, activeThreadId, 'assistant', fantasmaReleaseAnswer);
            return createPromotedUIMessageStreamResponse({
                text: fantasmaReleaseAnswer,
                headers: {
                    'x-thread-id': activeThreadId,
                    'x-nemosine-fantasma-release-answer': 'true',
                    'x-cognitive-runtime': runtimeConfig.mode,
                },
            });
        }
        const releaseOnePersonaRescueAnswer = buildReleaseOnePersonaRescueAnswer({
            personaId,
            userText,
            latestAssistantText,
            latestRawAssistantText,
        });
        if (releaseOnePersonaRescueAnswer) {
            await addMessageToThread(userId, activeThreadId, 'assistant', releaseOnePersonaRescueAnswer);
            return createPromotedUIMessageStreamResponse({
                text: releaseOnePersonaRescueAnswer,
                headers: {
                    'x-thread-id': activeThreadId,
                    'x-nemosine-release-one-persona-rescue': 'true',
                    'x-cognitive-runtime': runtimeConfig.mode,
                },
            });
        }
        const existingHandoffOffers = multiPersonaDevOnly ? persistedHandoffOffers(modelPriorHistory) : [];
        if (multiPersonaDevOnly && isVocationalContinuationQuestion(userText) && existingHandoffOffers.length > 0 && runtimeConfig.mode === "enforce") {
            console.info("[VocationalTargetResolver]", {
                event: "HANDOFF_REUSED_FROM_HISTORY",
                threadId: activeThreadId,
                sourcePersona: personaId,
                targets: existingHandoffOffers.map((offer) => offer.targetPersona),
            });
            return deliverEnforcedCognitiveRuntime({
                handoffOffers: existingHandoffOffers,
                persistHandoffEvents: false,
                headers: {
                    'x-nemosine-handoff-reused': 'true',
                },
            });
        }
        const vocationalResolution = resolveVocationalTargets({
            currentPersona: personaId,
            userText,
            contextText: latestAssistantText,
            maxTargets: 3,
        });
        const requestedHandoffTarget = isHandoffSelectionRequest(userText)
            ? inferHandoffTarget({ sourcePersona: personaId, userText, priorAssistantText: latestAssistantText })
            : null;
        const publicPersonaRoutingAnswer = !multiPersonaDevOnly
            && (isHandoffSelectionRequest(userText) || isVocationalContinuationQuestion(userText))
            ? buildPublicPersonaRoutingAnswer({
                sourcePersona: personaId,
                targetPersona: requestedHandoffTarget || vocationalResolution.primaryTargetPersonaId,
                userText,
            })
            : null;
        if (publicPersonaRoutingAnswer) {
            if (runtimeConfig.mode === "enforce") {
                return deliverEnforcedCognitiveRuntime({
                    candidateOverride: publicPersonaRoutingAnswer,
                    headers: {
                        'x-nemosine-public-persona-route': 'true',
                    },
                });
            }
            await addMessageToThread(userId, activeThreadId, 'assistant', publicPersonaRoutingAnswer);
            return createPromotedUIMessageStreamResponse({
                text: publicPersonaRoutingAnswer,
                headers: {
                    'x-thread-id': activeThreadId,
                    'x-nemosine-public-persona-route': 'true',
                },
            });
        }
        if (
            multiPersonaDevOnly
            && runtimeConfig.mode === "enforce"
            && vocationalResolution.primaryTargetPersonaId
            && vocationalResolution.confidence >= 0.55
            && (isHandoffSelectionRequest(userText) || vocationalResolution.currentPersonaFit === "incompatible")
        ) {
            const offers = buildHandoffOffersFromResolution({
                sourcePersona: personaId,
                userText,
                resolution: vocationalResolution,
                privateRun: cognitiveRequest.privateRun,
            });
            if (offers.length === 0) {
                return deliverEnforcedCognitiveRuntime();
            }
            console.info("[VocationalTargetResolver]", {
                event: "VOCATIONAL_TARGET_RESOLVED",
                threadId: activeThreadId,
                sourcePersona: personaId,
                targets: offers.map((offer) => offer.targetPersona),
                confidence: vocationalResolution.confidence,
                reason: vocationalResolution.routingReason,
                decisionId: offers[0]?.decisionId,
                trigger: offers[0]?.trigger,
                currentPersonaFit: vocationalResolution.currentPersonaFit,
            });
            console.info("[VocationalTargetResolver]", {
                event: "HANDOFF_OPTIONS_PRESENTED",
                threadId: activeThreadId,
                targetCount: offers.length,
            });
            return deliverEnforcedCognitiveRuntime({
                handoffOffers: offers,
                headers: {
                    'x-nemosine-handoff-offered': 'true',
                    'x-nemosine-handoff-decision-id': offers[0]?.decisionId || "",
                    'x-nemosine-handoff-trigger': offers[0]?.trigger || "",
                },
            });
        }
        if (multiPersonaDevOnly && isVocationalContinuationQuestion(userText) && runtimeConfig.mode === "enforce") {
            console.info("[VocationalTargetResolver]", {
                event: "VOCATIONAL_TARGET_UNRESOLVED",
                threadId: activeThreadId,
                sourcePersona: personaId,
                confidence: vocationalResolution.confidence,
            });
            return deliverEnforcedCognitiveRuntime({
                headers: {
                    'x-nemosine-handoff-unresolved': 'true',
                },
            });
        }
        if (multiPersonaDevOnly && requestedHandoffTarget && runtimeConfig.mode === "enforce") {
            const decisionId = crypto.randomUUID();
            const handoff = buildPersonaHandoffOffer({
                sourcePersona: personaId,
                targetPersona: requestedHandoffTarget,
                userText,
                privateRun: cognitiveRequest.privateRun,
                decisionId,
                trigger: "explicit_user_request",
                currentPersonaFit: vocationalResolution.currentPersonaFit,
            });
            return deliverEnforcedCognitiveRuntime({
                handoffOffer: handoff,
                headers: {
                    'x-nemosine-handoff-offered': 'true',
                    'x-nemosine-handoff-decision-id': decisionId,
                    'x-nemosine-handoff-trigger': 'explicit_user_request',
                },
            });
        }

        const conversationNavigationAnswer = await buildConversationNavigationAnswer({
            userId,
            activeThreadId,
            personaId: conversationScope,
            memoryScope,
            userText,
        });
        if (conversationNavigationAnswer) {
            if (runtimeConfig.mode === "enforce") {
                return deliverEnforcedCognitiveRuntime({
                    candidateOverride: conversationNavigationAnswer,
                    headers: {
                        'x-conversation-navigation-answer': 'true',
                    },
                });
            }
            await addMessageToThread(userId, activeThreadId, 'assistant', conversationNavigationAnswer);
            return createPromotedUIMessageStreamResponse({
                text: conversationNavigationAnswer,
                headers: {
                    'x-thread-id': activeThreadId,
                    'x-conversation-navigation-answer': 'true',
                },
            });
        }

        if (runtimeConfig.mode === "enforce") {
            return deliverEnforcedCognitiveRuntime();
        }

        if (responsePipelineConfig.mode === "enforce") {
            const responsePipelineRequest = createResponsePipelineRequest({ cognitiveRequest });
            try {
                const responsePipelineResult = await runResponsePipelineV2({
                    request: responsePipelineRequest,
                    config: responsePipelineConfig,
                    model: activeChatModel,
                });
                const blockingFailures = responsePipelineResult.validation.criticalFailures;
                if (blockingFailures.length > 0) {
                    throw new Error(`response_pipeline_v2_blocked:${blockingFailures.join(",")}`);
                }

                const deliveredPipelineAnswer = applyPresenceContractToResponse(responsePipelineResult.answer);
                await addMessageToThread(userId, activeThreadId, 'assistant', deliveredPipelineAnswer);
                let sideEffectsCommitted = { memory: 0, registry: 0, destiny: 0 };
                if (!presenceAnchoredRouting) {
                    await commitExtractedMemoryEffects({
                        request: responsePipelineRequest,
                        extraction: responsePipelineResult.memoryExtraction,
                    }).then((committed) => {
                        sideEffectsCommitted = committed;
                    }).catch((error) => {
                        console.warn("[API/Chat] Response pipeline memory extraction commit skipped.", error);
                    });
                }

                if (shouldRetainConversationContinuity) {
                    await Promise.all([
                        retainConversationEpisode(userId, memoryScope, userText),
                        retainActiveTopicsFromUserMessage({
                            userId,
                            threadId: activeThreadId,
                            personaId,
                            memoryScope,
                            userText,
                        }),
                    ]).catch((error) => {
                        console.warn("[API/Chat] Conversation continuity retention skipped after response pipeline.", error);
                    });
                }

                await storeResponsePipelineAudit({
                    request: responsePipelineRequest,
                    result: responsePipelineResult,
                    delivered: true,
                    sideEffectsCommitted,
                }).catch((error) => {
                    console.warn("[API/Chat] Response pipeline audit skipped.", error);
                });
                await observeCognitiveFoundationResponse({
                    userId,
                    threadId: activeThreadId,
                    personaId,
                    placeId: normalizedPlaceId,
                    memoryScope,
                    userText,
                    responseText: deliveredPipelineAnswer,
                    participantCount: 1,
                    privateRun: responsePipelineRequest.privateRun,
                }).catch((error) => {
                    console.warn("[API/Chat] Cognitive foundation observation skipped.", error);
                });

                if (runtimeConfig.mode === "shadow") {
                    await runCognitiveRuntime(cognitiveRequest, {
                        config: runtimeConfig,
                        candidateOverride: responsePipelineResult.answer,
                    }).catch((error) => {
                        console.error("[API/Chat] Cognitive runtime shadow audit failed after response pipeline:", error);
                    });
                }

                return createPromotedUIMessageStreamResponse({
                    text: deliveredPipelineAnswer,
                    headers: {
                        'x-thread-id': activeThreadId,
                        'x-llm-provider': activeChatModel.id,
                        'x-llm-model': activeChatModel.model,
                        'x-response-pipeline-v2': responsePipelineConfig.mode,
                        'x-response-pipeline-v2-run-id': responsePipelineResult.runId,
                        'x-response-pipeline-v2-director': String(responsePipelineResult.director.usedDirector),
                        'x-response-pipeline-v2-depth': responsePipelineResult.director.plan.recommendedDepth,
                    },
                });
            } catch (error) {
                console.error("[API/Chat] Response pipeline v2 enforce failed; falling back to legacy path.", error);
            }
        }

        const promptAssembly = await buildSystemPromptAssembly(userId, personaId, selectedLanguage, normalizedPlaceId, routedUserText, activeThreadId);
        const systemPrompt = promptAssembly.systemPrompt;
        const { sanitizedHistory, filteredHistory } = sanitizeConversationHistory(modelPriorHistory);
        const recentAssistantTexts = modelPriorHistory
            .filter((message) => message.role === 'assistant')
            .slice(-4)
            .map((message) => message.content);
        const history = [
            ...sanitizedHistory,
            {
                id: 'runtime-persona-guard',
                role: 'system' as const,
                content: [
                    buildRuntimePersonaGuard(personaId, routedUserText),
                    presenceRuntimePrompt,
                ].filter(Boolean).join("\n\n"),
                timestamp: Date.now()
            },
            {
                id: 'current-user-message',
                role: 'user' as const,
                content: routedUserText,
                timestamp: Date.now()
            }
        ];
        const modelMessages = history.map((message) => ({
            role: message.role as 'user' | 'assistant' | 'system',
            content: message.content
        }));

        await writePromptDebugAudit({
            personaId,
            threadId: activeThreadId,
            model: activeChatModel.model,
            temperature: DEFAULT_CHAT_TEMPERATURE,
            maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
            systemPrompt,
            messages: modelMessages,
            filteredHistory,
            debug: promptAssembly.debug,
        });

        const generateCandidate = async (repairFeedback: string) => {
            const result = await generateText({
                model: activeChatModel.modelInstance,
                system: [systemPrompt, repairFeedback].filter(Boolean).join("\n\n"),
                messages: modelMessages,
                temperature: DEFAULT_CHAT_TEMPERATURE,
                maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
                maxRetries: 1,
            });
            return result.text;
        };

        console.log(`[API/Chat] Starting buffered generation after ${Date.now() - t0}ms total prep time`);
        const maxAttempts = readInitiativeRepairLimit() + 1;
        let repairFeedback = "";
        let selectedRawText = "";
        let finalResponse = "";
        let promotedByFallback = false;
        let bestRejected: {
            rawText: string;
            visibleText: string;
            evaluation: PersonaInitiativeQualityEvaluation;
        } | null = null;

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            let rawText: string;
            try {
                rawText = await generateCandidate(repairFeedback);
            } catch (error) {
                const failureMessage = buildBufferedLlmFailureMessage(error);
                await addMessageToThread(userId, activeThreadId, 'assistant', failureMessage);
                return NextResponse.json(
                    {
                        error: "LLM generation failed before response delivery",
                        message: failureMessage,
                    },
                    { status: 502, headers: { 'x-thread-id': activeThreadId } },
                );
            }

            const visibleCandidate = applyPresenceContractToResponse(stripGenericAssistantClosing(stripLegacyActionTags(rawText)));
            const initiativeEvaluation = evaluatePersonaInitiativeQuality({
                responseText: visibleCandidate,
                personaId,
                userText: routedUserText,
                richness: promptAssembly.initiative.richness,
                snapshot: promptAssembly.initiative.snapshot,
                contract: promptAssembly.initiative.contract,
                brief: promptAssembly.initiative.brief,
                privateRun: isPrivateMemorySpace(memoryScope),
                recentAssistantTexts,
            });

            if (initiativeEvaluation.finalPass) {
                selectedRawText = rawText;
                finalResponse = visibleCandidate;
                break;
            }

            if (!bestRejected || initiativeEvaluation.initiativeScore > bestRejected.evaluation.initiativeScore) {
                bestRejected = {
                    rawText,
                    visibleText: visibleCandidate,
                    evaluation: initiativeEvaluation,
                };
            }

            repairFeedback = renderPersonaInitiativeRepairFeedback(initiativeEvaluation);
            console.warn("[API/Chat] Persona initiative candidate rejected before delivery.", {
                personaId,
                threadId: activeThreadId,
                attempt,
                findingCodes: initiativeEvaluation.findings.map((finding) => finding.code),
                initiativeScore: Number(initiativeEvaluation.initiativeScore.toFixed(3)),
            });
        }

        if (!finalResponse) {
            if (bestRejected && canPromoteRejectedPersonaCandidate(bestRejected.evaluation, bestRejected.visibleText)) {
                selectedRawText = bestRejected.rawText;
                finalResponse = bestRejected.visibleText;
            } else if (bestRejected && canPromoteReleasePreviewSafeRejectedCandidate({
                evaluation: bestRejected.evaluation,
                text: bestRejected.visibleText,
            })) {
                selectedRawText = bestRejected.rawText;
                finalResponse = bestRejected.visibleText;
                console.warn("[API/Chat]", {
                    event: "RELEASE_SAFE_CANDIDATE_PROMOTED",
                    personaId,
                    threadId: activeThreadId,
                    originalFindingCodes: releasePreviewOriginalFindingCodes(bestRejected.evaluation),
                    initiativeScore: Number(bestRejected.evaluation.initiativeScore.toFixed(3)),
                });
            } else {
                promotedByFallback = true;
                finalResponse = buildDeterministicInitiativeFallback({
                    personaId,
                    userText: routedUserText,
                    richness: promptAssembly.initiative.richness,
                    snapshot: promptAssembly.initiative.snapshot,
                    brief: promptAssembly.initiative.brief,
                    contract: promptAssembly.initiative.contract,
                });
                selectedRawText = finalResponse;
            }
        }

        finalResponse = applyPresenceContractToResponse(stripGenericAssistantClosing(finalResponse));

        await commitPromotedLegacyEffects({
            rawText: selectedRawText,
            userId,
            activeThreadId,
            memoryScope,
            personaId,
            userText,
        });
        await addMessageToThread(userId, activeThreadId, 'assistant', finalResponse);

        if (shouldRetainConversationContinuity) {
            await Promise.all([
                retainConversationEpisode(userId, memoryScope, userText),
                retainActiveTopicsFromUserMessage({
                    userId,
                    threadId: activeThreadId,
                    personaId,
                    memoryScope,
                    userText,
                }),
            ]).catch((error) => {
                console.warn("[API/Chat] Conversation continuity retention skipped after response.", error);
            });
        }

        if (responsePipelineConfig.mode === "shadow") {
            const responsePipelineRequest = createResponsePipelineRequest({ cognitiveRequest });
            await runResponsePipelineV2({
                request: responsePipelineRequest,
                config: responsePipelineConfig,
                model: activeChatModel,
            }).then(async (responsePipelineResult) => {
                await storeResponsePipelineAudit({
                    request: responsePipelineRequest,
                    result: responsePipelineResult,
                    delivered: false,
                    shadowDeliveredAnswer: finalResponse,
                });
            }).catch((error) => {
                console.error("[API/Chat] Response pipeline v2 shadow audit failed:", error);
            });
        }

        if (runtimeConfig.mode === "shadow") {
            await runCognitiveRuntime(cognitiveRequest, {
                config: runtimeConfig,
                candidateOverride: finalResponse,
            }).catch((error) => {
                console.error("[API/Chat] Cognitive runtime shadow audit failed:", error);
            });
        }
        await observeCognitiveFoundationResponse({
            userId,
            threadId: activeThreadId,
            personaId,
            placeId: normalizedPlaceId,
            memoryScope,
            userText,
            responseText: finalResponse,
            participantCount: 1,
            privateRun: cognitiveRequest.privateRun,
        }).catch((error) => {
            console.warn("[API/Chat] Cognitive foundation observation skipped.", error);
        });

        return createPromotedUIMessageStreamResponse({
            text: finalResponse,
            headers: {
                'x-thread-id': activeThreadId,
                'x-llm-provider': activeChatModel.id,
                'x-llm-model': activeChatModel.model,
                'x-persona-initiative-buffered': 'true',
                'x-persona-initiative-fallback': String(promotedByFallback),
                'x-cognitive-runtime': runtimeConfig.mode,
            },
        });
    } catch (error) {
        console.error('[API/Chat Stream] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const authenticatedUser = await getAuthenticatedUser();
        if (!authenticatedUser) return unauthorizedResponse();
        const userId = authenticatedUser.id;
        const multiPersonaDevOnly = isAdminEmail(authenticatedUser.email);

        const { searchParams } = new URL(req.url);
        const personaId = searchParams.get('personaId');
        const threadId = searchParams.get('threadId');

        if (threadId) {
            const thread = await getThread(userId, threadId);
            if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
            return NextResponse.json({ thread: multiPersonaDevOnly ? thread : hideDevOnlyThreadFields(thread) });
        }

        if (personaId) {
            const threads = await getThreadsForPersona(userId, personaId);
            return NextResponse.json({ threads: multiPersonaDevOnly ? threads : threads.map(hideDevOnlyThreadFields) });
        }

        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    } catch (error) {
        console.error('[API/Chat GET] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) return unauthorizedResponse();

        const { threadId, title } = await req.json();
        if (typeof threadId === 'string' && typeof title === 'string' && title.trim()) {
            await updateThreadTitle(userId, threadId, title.trim());
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    } catch (error) {
        console.error('[API/Chat PATCH] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) return unauthorizedResponse();

        const { searchParams } = new URL(req.url);
        const threadId = searchParams.get('threadId');
        if (threadId) {
            await deleteThread(userId, threadId);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Missing threadId' }, { status: 400 });
    } catch (error) {
        console.error('[API/Chat DELETE] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
