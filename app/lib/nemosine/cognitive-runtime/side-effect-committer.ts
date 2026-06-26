import { persistAssistantMessageForCognitiveRun, prisma } from "@/app/lib/nemosine/session_store";
import {
  CognitiveFinding,
  CognitiveRequest,
  ExtractionResult,
  ProposedDestinyAction,
  ProposedMemoryAction,
  ProposedRegistryAction,
  SideEffectAuthorization,
  SideEffectCounts,
  SideEffectStatus,
} from "./types";

function normalizeForAuth(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function hasExplicitDestinyAuthorization(text: string) {
  const normalized = normalizeForAuth(text);
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

export function hasExplicitMemoryAuthorization(text: string) {
  const normalized = normalizeForAuth(text);
  return [
    "lembre disso",
    "registre na memoria",
    "guardar na memoria",
    "guarde na memoria",
    "pode lembrar",
    "pode guardar",
    "memorize",
  ].some((phrase) => normalized.includes(phrase));
}

export function hasExplicitRegistryAuthorization(text: string) {
  const normalized = normalizeForAuth(text);
  return [
    "registre essa tarefa",
    "registre esta tarefa",
    "crie um registro",
    "criar um registro",
    "guarde nos registros",
    "adicione aos registros",
    "pode registrar isso como tarefa",
    "pode criar o registro",
  ].some((phrase) => normalized.includes(phrase));
}

function authFinding(code: string, severity: CognitiveFinding["severity"], explanation: string): CognitiveFinding {
  return {
    code,
    severity,
    category: "side-effect-authorization",
    explanation,
    repairInstruction: "Only commit side effects that pass runtime authorization.",
  };
}

export function authorizeProposedSideEffects(input: {
  request: CognitiveRequest;
  extraction: ExtractionResult;
}): SideEffectAuthorization {
  const findings: CognitiveFinding[] = [];
  const approvedMemoryActions: ProposedMemoryAction[] = [];
  const approvedRegistryActions: ProposedRegistryAction[] = [];
  const approvedDestinyActions: ProposedDestinyAction[] = [];
  const discardedActions: SideEffectAuthorization["discardedActions"] = [];
  const destinyAuthorized = hasExplicitDestinyAuthorization(input.request.userText);
  const memoryAuthorized = hasExplicitMemoryAuthorization(input.request.userText);
  const registryAuthorized = hasExplicitRegistryAuthorization(input.request.userText);

  for (const action of input.extraction.proposedMemoryActions) {
    if (action.scope !== input.request.memoryScope) {
      discardedActions.push({ ...action, authorized: false, authorizationProvenance: "unauthorized" });
      findings.push(authFinding("SIDE_EFFECT_MEMORY_SCOPE_MISMATCH", "warning", "Memory action tried to write outside the authorized memory scope and was discarded."));
      continue;
    }
    if (!memoryAuthorized) {
      discardedActions.push({ ...action, authorized: false, authorizationProvenance: "unauthorized" });
      findings.push(authFinding("SIDE_EFFECT_MEMORY_UNAUTHORIZED_DISCARDED", "warning", "Long-term memory action was discarded because the current message did not explicitly authorize memory persistence."));
      continue;
    }
    approvedMemoryActions.push({ ...action, authorized: true, authorizationProvenance: "explicit-current-message" });
  }

  for (const action of input.extraction.proposedRegistryActions) {
    if (input.request.privateRun) {
      discardedActions.push({ ...action, authorized: false, authorizationProvenance: "discarded-private-scope" });
      findings.push(authFinding("SIDE_EFFECT_REGISTRY_PRIVATE_SCOPE_DISCARDED", "warning", "Registry action was discarded because private runs cannot create global registry entries."));
      continue;
    }
    if (!action.idea.trim()) {
      discardedActions.push({ ...action, authorized: false, authorizationProvenance: "unauthorized" });
      findings.push(authFinding("SIDE_EFFECT_REGISTRY_INVALID", "warning", "Registry action had no idea text."));
      continue;
    }
    if (!registryAuthorized) {
      discardedActions.push({ ...action, authorized: false, authorizationProvenance: "unauthorized" });
      findings.push(authFinding("SIDE_EFFECT_REGISTRY_UNAUTHORIZED_DISCARDED", "warning", "Registry action was discarded because the current message did not explicitly authorize registry persistence."));
      continue;
    }
    approvedRegistryActions.push({ ...action, authorized: true, authorizationProvenance: "explicit-current-message" });
  }

  for (const action of input.extraction.proposedDestinyActions) {
    if (input.request.privateRun) {
      discardedActions.push({ ...action, authorized: false, authorizationProvenance: "discarded-private-scope" });
      findings.push(authFinding("SIDE_EFFECT_DESTINY_PRIVATE_SCOPE_DISCARDED", "warning", "Destiny Line action was discarded because private runs cannot export content to global biographical persistence."));
      continue;
    }
    if (!destinyAuthorized) {
      discardedActions.push({ ...action, authorized: false, authorizationProvenance: "unauthorized" });
      findings.push(authFinding("SIDE_EFFECT_DESTINY_UNAUTHORIZED_DISCARDED", "warning", "Destiny Line action was discarded because the user did not explicitly authorize it."));
      continue;
    }
    approvedDestinyActions.push({ ...action, authorized: true, authorizationProvenance: "explicit-current-message" });
  }

  return {
    approved: !findings.some((finding) => finding.severity === "error" || finding.severity === "critical"),
    approvedMemoryActions,
    approvedRegistryActions,
    approvedDestinyActions,
    discardedActions,
    findings,
  };
}

export type PersistDeliveredAssistantMessageInput = {
  request: CognitiveRequest;
  answer: string;
};

export type PersistDeliveredAssistantMessageResult = {
  persisted: boolean;
  messageId: string;
};

export async function persistDeliveredAssistantMessage(
  input: PersistDeliveredAssistantMessageInput,
): Promise<PersistDeliveredAssistantMessageResult> {
  const message = await persistAssistantMessageForCognitiveRun(
    input.request.userId,
    input.request.threadId,
    input.request.runId,
    input.answer,
  );

  return {
    persisted: true,
    messageId: message.id,
  };
}

export type CommitOptionalEffectsInput = {
  request: CognitiveRequest;
  sideEffects: SideEffectAuthorization;
};

export type CommitOptionalEffectsResult = {
  status: SideEffectStatus;
  committed: boolean;
  counts: SideEffectCounts;
  errorCode?: string;
};

const zeroCounts: SideEffectCounts = {
  memory: 0,
  registry: 0,
  destiny: 0,
};

function runtimeEffectId(runId: string, actionId: string) {
  return `cognitive-runtime:${runId}:${actionId}`.slice(0, 240);
}

function destinyActionSearchableText(action: ProposedDestinyAction, input: CognitiveRequest) {
  return [
    action.title,
    action.category,
    action.shortDescription,
    action.dominantEmotion,
    input.personaId,
    input.placeId,
  ].filter(Boolean).join(" | ");
}

function destinyActionPersonaAffinities(action: ProposedDestinyAction, personaId: string) {
  return Array.from(new Set([
    personaId,
    action.category === "Familia" || action.category === "Relacoes" ? "Psicologo" : null,
    action.category === "Carreira" || action.category === "Obra" || action.category === "Criacao" ? "Estrategista" : null,
    action.category === "Saude" || action.category === "Corpo" ? "Medico" : null,
    action.category === "Virada" || action.category === "Travessia" ? "Astronomo" : null,
  ].filter((item): item is string => Boolean(item))));
}

function destinyActionBiographicalImportance(action: ProposedDestinyAction) {
  const foundationalCategories = new Set(["Familia", "Saude", "Carreira", "Obra", "Criacao", "Perda", "Virada", "Travessia", "Relacoes"]);
  const categoryBoost = foundationalCategories.has(action.category) ? 0.25 : 0;
  const intensityBoost = action.symbolicIntensity ? action.symbolicIntensity / 20 : 0.1;
  return Math.max(0.2, Math.min(1, 0.35 + categoryBoost + intensityBoost));
}

function destinyActionTemporalImportance(action: ProposedDestinyAction) {
  const dated = action.eventDate || action.eventDateLabel ? 0.2 : 0;
  const intensity = action.symbolicIntensity ? action.symbolicIntensity / 25 : 0.08;
  return Math.max(0.2, Math.min(1, 0.35 + dated + intensity));
}

async function ensureRuntimeOptionalEffectTables() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS user_registros (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      idea TEXT NOT NULL,
      chat_origin_id TEXT,
      persona TEXT,
      status TEXT NOT NULL,
      last_interaction TEXT,
      next_deadline TEXT,
      external_links TEXT,
      custom_columns TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS sovereign_destiny_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      event_date DATE,
      event_date_label TEXT,
      category TEXT NOT NULL,
      short_description TEXT NOT NULL,
      long_description TEXT,
      dominant_emotion TEXT,
      symbolic_intensity INTEGER,
      associated_persona TEXT,
      associated_place TEXT,
      life_phase TEXT,
      visibility TEXT NOT NULL DEFAULT 'private',
      source TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await prisma.$executeRaw`ALTER TABLE sovereign_destiny_events ADD COLUMN IF NOT EXISTS external_visibility TEXT NOT NULL DEFAULT 'private'`;
  await prisma.$executeRaw`ALTER TABLE sovereign_destiny_events ADD COLUMN IF NOT EXISTS cognitive_visibility TEXT NOT NULL DEFAULT 'all-public-personas'`;
  await prisma.$executeRaw`ALTER TABLE sovereign_destiny_events ADD COLUMN IF NOT EXISTS cognitive_personas TEXT NOT NULL DEFAULT '[]'`;
  await prisma.$executeRaw`
    UPDATE sovereign_destiny_events
    SET external_visibility = 'legacy'
    WHERE visibility = 'legacy'
      AND external_visibility = 'private'
  `;
  await prisma.$executeRaw`
    UPDATE sovereign_destiny_events
    SET cognitive_visibility = 'excluded-from-personas'
    WHERE visibility = 'sensitive'
      AND cognitive_visibility = 'all-public-personas'
  `;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS sovereign_destiny_events_user_id_idx ON sovereign_destiny_events(user_id)`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS sovereign_destiny_events_cognitive_visibility_idx ON sovereign_destiny_events(cognitive_visibility)`;
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS sovereign_destiny_context_index (
      destiny_event_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      searchable_text TEXT NOT NULL,
      categories TEXT NOT NULL DEFAULT '[]',
      persona_affinities TEXT NOT NULL DEFAULT '[]',
      temporal_importance DOUBLE PRECISION NOT NULL DEFAULT 0.5,
      biographical_importance DOUBLE PRECISION NOT NULL DEFAULT 0.5,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS sovereign_destiny_context_index_user_id_idx ON sovereign_destiny_context_index(user_id)`;
}

async function addUserMemoryInTransaction(tx: any, input: {
  userId: string;
  personaId: string;
  content: string;
}) {
  const normalizedContent = input.content.trim().slice(0, 1000);
  if (!normalizedContent) return false;

  const existingMemory = await tx.userMemory.findFirst({
    where: {
      userId: input.userId,
      personaId: input.personaId,
      content: normalizedContent,
    },
  });
  if (existingMemory) return false;

  await tx.userMemory.create({
    data: {
      userId: input.userId,
      personaId: input.personaId,
      content: normalizedContent,
    },
  });
  return true;
}

export async function retainDeliveredConversationEpisode(tx: any, request: CognitiveRequest) {
  const normalizedMessage = request.userText.replace(/\s+/g, " ").trim();
  if (normalizedMessage.length < 12) return false;

  return addUserMemoryInTransaction(tx, {
    userId: request.userId,
    personaId: request.memoryScope,
    content: `EPISODIO COGNITIVO ${request.runId} COM ${request.memoryScope} | O usuario escreveu: ${normalizedMessage.slice(0, 900)}`,
  });
}

export async function commitAuthorizedOptionalEffects(
  input: CommitOptionalEffectsInput,
): Promise<CommitOptionalEffectsResult> {
  const approvedEffectCount = input.sideEffects.approvedMemoryActions.length
    + input.sideEffects.approvedRegistryActions.length
    + input.sideEffects.approvedDestinyActions.length;

  if (approvedEffectCount === 0) {
    return {
      status: "skipped",
      committed: false,
      counts: { ...zeroCounts },
    };
  }

  try {
    await ensureRuntimeOptionalEffectTables();

    const counts = await prisma.$transaction(async (tx) => {
      const transactionCounts: SideEffectCounts = { ...zeroCounts };

      await retainDeliveredConversationEpisode(tx, input.request);

      for (const action of input.sideEffects.approvedMemoryActions) {
        const inserted = await addUserMemoryInTransaction(tx, {
          userId: input.request.userId,
          personaId: input.request.memoryScope,
          content: action.content,
        });
        if (inserted) transactionCounts.memory += 1;
      }

      for (const action of input.sideEffects.approvedRegistryActions) {
        const id = runtimeEffectId(input.request.runId, action.id);
        const inserted = await tx.$executeRaw`
          INSERT INTO user_registros (
            id, user_id, idea, chat_origin_id, persona, status, last_interaction, next_deadline, external_links, custom_columns
          )
          VALUES (
            ${id},
            ${input.request.userId},
            ${action.idea},
            ${input.request.threadId},
            ${input.request.personaId},
            ${action.status || "Pendente"},
            ${new Date().toISOString().split("T")[0]},
            ${action.deadline || null},
            ${""},
            ${"{}"}
          )
          ON CONFLICT (id) DO NOTHING
        `;
        if (inserted > 0) transactionCounts.registry += 1;
      }

      for (const action of input.sideEffects.approvedDestinyActions) {
        const id = runtimeEffectId(input.request.runId, action.id);
        const inserted = await tx.$executeRaw`
          INSERT INTO sovereign_destiny_events (
            id, user_id, title, event_date, event_date_label, category, short_description, long_description,
            dominant_emotion, symbolic_intensity, associated_persona, associated_place, life_phase,
            visibility, external_visibility, cognitive_visibility, cognitive_personas, source, tags, image_url, updated_at
          )
          VALUES (
            ${id},
            ${input.request.userId},
            ${action.title},
            ${action.eventDate || null}::date,
            ${action.eventDateLabel || null},
            ${action.category},
            ${action.shortDescription},
            ${null},
            ${action.dominantEmotion || null},
            ${action.symbolicIntensity || null},
            ${input.request.personaId},
            ${input.request.placeId || null},
            ${null},
            ${"private"},
            ${"private"},
            ${"all-public-personas"},
            ${JSON.stringify([])},
            ${`persona:${input.request.personaId};thread:${input.request.threadId};runtime:${input.request.runId}`},
            ${JSON.stringify(["sugerido-por-persona", input.request.personaId, "cognitive-runtime-v1"])},
            ${null},
            NOW()
          )
          ON CONFLICT (id) DO NOTHING
        `;
        if (inserted > 0) {
          await tx.$executeRaw`
            INSERT INTO sovereign_destiny_context_index (
              destiny_event_id, user_id, searchable_text, categories, persona_affinities,
              temporal_importance, biographical_importance, updated_at
            )
            VALUES (
              ${id},
              ${input.request.userId},
              ${destinyActionSearchableText(action, input.request)},
              ${JSON.stringify([action.category].filter(Boolean))},
              ${JSON.stringify(destinyActionPersonaAffinities(action, input.request.personaId))},
              ${destinyActionTemporalImportance(action)},
              ${destinyActionBiographicalImportance(action)},
              NOW()
            )
            ON CONFLICT (destiny_event_id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              searchable_text = EXCLUDED.searchable_text,
              categories = EXCLUDED.categories,
              persona_affinities = EXCLUDED.persona_affinities,
              temporal_importance = EXCLUDED.temporal_importance,
              biographical_importance = EXCLUDED.biographical_importance,
              updated_at = NOW()
          `;
          transactionCounts.destiny += 1;
        }
      }

      return transactionCounts;
    });

    return {
      status: "committed",
      committed: true,
      counts,
    };
  } catch {
    return {
      status: "failed_rolled_back",
      committed: false,
      counts: { ...zeroCounts },
      errorCode: "OPTIONAL_EFFECT_TRANSACTION_ROLLED_BACK",
    };
  }
}
