import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content, "utf8");
}

function replaceOnce(path, source, target, label) {
  const content = read(path);
  const first = content.indexOf(source);
  if (first < 0) throw new Error(`${label}: source not found in ${path}`);
  if (content.indexOf(source, first + source.length) >= 0) throw new Error(`${label}: source is not unique in ${path}`);
  write(path, content.slice(0, first) + target + content.slice(first + source.length));
}

// 1) Handoff: recommendation requests and pronoun continuity.
{
  const path = "app/lib/nemosine/handoff.ts";
  replaceOnce(path,
`function allPersonaNames() {
  return Object.values(ENTITIES)
    .filter((item) => item.type === "persona")
    .map((item) => item.name);
}
`,
`function allPersonaNames() {
  return Object.values(ENTITIES)
    .filter((item) => item.type === "persona")
    .map((item) => item.name);
}

function lastPersonaReference(text?: string | null) {
  const normalizedText = normalize(text || "");
  if (!normalizedText) return null;
  return allPersonaNames()
    .map((persona) => ({ persona, index: normalizedText.lastIndexOf(normalize(persona)) }))
    .filter((item) => item.index >= 0)
    .sort((left, right) => right.index - left.index)[0]?.persona || null;
}

function isPronounHandoffRequest(text: string) {
  const normalized = normalize(text);
  return /\\b(?:consegue|pode|da para|tem como)\\s+(?:me\\s+)?(?:chamar|trazer|convidar|encaminhar)\\s+(?:ele|ela)\\b/.test(normalized)
    || /\\b(?:chame|chama|traga|traz|convide|encaminhe)\\s+(?:ele|ela)\\b/.test(normalized);
}
`, "insert last persona reference helper");

  replaceOnce(path,
`export function isHandoffSelectionRequest(text: string) {
  const normalized = normalize(text);
  return /\\b(encaminha|encaminhar|encaminhe|abre|abrir|quero falar|falar com|como voce encaminharia|como encaminharia)\\b/.test(normalized);
}
`,
`export function isHandoffSelectionRequest(text: string) {
  const normalized = normalize(text);
  const explicitAction = /\\b(encaminha|encaminhar|encaminhe|abre|abrir|quero falar|falar com|como voce encaminharia|como encaminharia|chame|chamar|convide|convidar|traga|trazer)\\b/.test(normalized);
  const recommendationRequest = /\\b(outra persona|outro persona|alguma persona|algum persona|qual persona|quem voce recomenda|quem seria melhor|quem pode ajudar melhor)\\b/.test(normalized);
  return explicitAction || recommendationRequest || isPronounHandoffRequest(text);
}
`, "expand handoff selection request");

  replaceOnce(path,
`  const normalized = normalize(input.userText);
  const source = normalize(input.sourcePersona);
`,
`  const normalized = normalize(input.userText);
  if (isPronounHandoffRequest(input.userText)) {
    const priorTarget = lastPersonaReference(input.priorAssistantText);
    if (priorTarget && personaExists(priorTarget) && normalize(priorTarget) !== normalize(input.sourcePersona)) {
      return priorTarget;
    }
  }
  const source = normalize(input.sourcePersona);
`, "resolve pronoun handoff from prior assistant");
}

// 2) Client routing: pronoun invitation must use collective endpoint.
{
  const path = "app/components/MedievalChat.tsx";
  replaceOnce(path,
`function hasLocalPresenceCommand(text: string) {
    const normalized = text
        .normalize("NFD")
        .replace(/[\\u0300-\\u036f]/g, "")
        .toLowerCase();
    return /(^|\\s)\\/?(convidar|convide|chamei|chame|chama|traga|desconvidar|dispense|retire|expulse|remova|silenciar|silencie|silencia|reativar|dessilenciar|dessilencie)\\b/.test(normalized)
        || /\\bquero\\s+chamar\\b/.test(normalized)
        || /\\bpode\\s+sair\\b/.test(normalized)
        || /\\bpode\\s+falar\\b/.test(normalized)
        || /\\bvolte\\s+a\\s+falar\\b/.test(normalized);
}
`,
`function hasLocalPresenceCommand(text: string) {
    const normalized = text
        .normalize("NFD")
        .replace(/[\\u0300-\\u036f]/g, "")
        .toLowerCase();
    return /(^|\\s)\\/?(convidar|convide|chamei|chame|chama|chamar|traga|traz|trazer|desconvidar|dispense|retire|expulse|remova|silenciar|silencie|silencia|reativar|dessilenciar|dessilencie)\\b/.test(normalized)
        || /\\bquero\\s+(?:chamar|convidar|trazer)\\b/.test(normalized)
        || /\\b(?:consegue|pode|da para|tem como)\\s+(?:me\\s+)?(?:chamar|trazer|convidar)\\s+(?:ele|ela)\\b/.test(normalized)
        || /\\bpode\\s+sair\\b/.test(normalized)
        || /\\bpode\\s+falar\\b/.test(normalized)
        || /\\bvolte\\s+a\\s+falar\\b/.test(normalized);
}
`, "route pronoun invitation to collective endpoint");
}

// 3) Collective API: resolve 'ele/ela' from latest structured handoff or recommendation.
{
  const path = "app/api/chat/collective/route.ts";
  replaceOnce(path,
`function buildInvitedPersonaPrompt(targetPersona: string, semanticText: string) {
`,
`function isPronounInviteRequest(text: string) {
  const normalized = normalizeAddressingText(text);
  return /\\b(?:consegue|pode|da para|tem como)\\s+(?:me\\s+)?(?:chamar|trazer|convidar)\\s+(?:ele|ela)\\b/.test(normalized)
    || /\\b(?:chame|chama|traga|traz|convide)\\s+(?:ele|ela)\\b/.test(normalized);
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
`, "insert pronoun invite resolver");

  replaceOnce(path,
`    const snapshot = await getParticipantSnapshot(userId, activeThreadId);
    const activePersonaIds = new Set(snapshot.participants.filter((participant) => participant.active).map((participant) => participant.personaId));
    const requestedInviteTarget = parsedCommands.commands
`,
`    const pronounInviteTarget = parsedCommands.commands.some((command) => command.action === "invite")
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
`, "resolve pronoun before collective snapshot");

  replaceOnce(path,
`    const effectiveCommands = parsedCommands.commands
`,
`    const effectiveCommands = resolvedCommands
`, "use resolved commands");
}

// 4) Speaker decision: greeting + persona means exclusive target.
{
  const path = "app/lib/nemosine/conversation_participants.ts";
  replaceOnce(path,
`    return [
      \`^@?\${namePattern}(?:\\s|,|:|;|$)\`,
`,
`    return [
      \`^(?:bom\\s+dia|boa\\s+tarde|boa\\s+noite|oi|ola|salve)\\s+(?:o\\s+|a\\s+)?\${namePattern}(?:\\s|,|:|;|$)\`,
      \`^@?\${namePattern}(?:\\s|,|:|;|$)\`,
`, "recognize greeting direct address");
}

// 5) Presence contract: operationalize confrontation instead of mere formatting.
{
  const path = "app/lib/nemosine/presence_adjustment/core.ts";
  replaceOnce(path,
`export function getPresenceQuestionForPersona(personaId: string) {
  return PERSONA_PRESENCE_QUESTIONS[normalizePresenceKey(personaId)] || "O que tem acontecido com voce ultimamente?";
}
`,
`export function getPresenceQuestionForPersona(personaId: string) {
  return PERSONA_PRESENCE_QUESTIONS[normalizePresenceKey(personaId)] || "O que tem acontecido com voce ultimamente?";
}

function renderPresenceGoalExecutionDirective(goal?: string) {
  const normalized = normalizePresenceKey(goal || "");
  if (!normalized) return "";
  if (/\\b(confront|criticar|critica|desafiar|sem suavizar)\\b/.test(normalized)) {
    return "Goal execution directive: confront the user's premise directly. Identify at least one responsibility, inconsistency, avoidance or uncomfortable trade-off. Do not replace confrontation with encouragement, reassurance or generic motivation.";
  }
  if (/\\b(desabafar|desabafo)\\b/.test(normalized)) {
    return "Goal execution directive: allow the user to express the experience and respond from the active persona's own lens. Do not automatically reroute, diagnose or convert the turn into a plan unless the user asks.";
  }
  return "";
}
`, "insert goal execution directive");

  replaceOnce(path,
`    contract.currentGoal ? \`Current goal: \${contract.currentGoal}\` : "",
    contract.recentContext ? \`Recent context: \${contract.recentContext}\` : "",
`,
`    contract.currentGoal ? \`Current goal: \${contract.currentGoal}\` : "",
    renderPresenceGoalExecutionDirective(contract.currentGoal),
    contract.recentContext ? \`Recent context: \${contract.recentContext}\` : "",
`, "apply presence goal directive to runtime prompt");

  replaceOnce(path,
`    contract.currentGoal ? \`Objetivo atual: \${contract.currentGoal}\` : "",
    contract.importantEntities?.length ? \`Entidades importantes: \${contract.importantEntities.join(", ")}\` : "",
`,
`    contract.currentGoal ? \`Objetivo atual: \${contract.currentGoal}\` : "",
    renderPresenceGoalExecutionDirective(contract.currentGoal),
    contract.importantEntities?.length ? \`Entidades importantes: \${contract.importantEntities.join(", ")}\` : "",
`, "apply presence goal directive to anchored turn");
}

// 6) Public sharing: exclude internal control events, including legacy snapshots.
{
  const path = "app/api/chat/share/route.ts";
  replaceOnce(path,
`function unauthorized() {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}
`,
`function unauthorized() {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}

function messageText(message: any) {
  if (typeof message?.content === "string") return message.content;
  if (Array.isArray(message?.parts)) {
    return message.parts.filter((part: any) => part?.type === "text").map((part: any) => part.text || "").join("");
  }
  return "";
}

function isPublicSystemEvent(message: any) {
  const text = messageText(message).trim();
  if (!text || /^\\[\\[NEMOSINE_/i.test(text)) return false;
  return /\\b(entrou na conversa|deixou a conversa|foi silenciad[oa]|voltou a falar|falando apenas com|foco exclusivo removido)\\b/i.test(text);
}

function sanitizeSharedMessages(messages: any[]) {
  return messages
    .filter((message) => {
      if (message?.role === "system" || message?.messageKind === "SYSTEM_EVENT") {
        return isPublicSystemEvent(message);
      }
      return true;
    })
    .map((message) => {
      const { metadata, ...publicMessage } = message || {};
      return publicMessage;
    });
}
`, "insert shared chat sanitizer");

  replaceOnce(path,
`    const messagesJson = JSON.stringify(thread.messages.filter((message) => (
      message.role !== "system" || message.messageKind === "SYSTEM_EVENT"
    )));
`,
`    const messagesJson = JSON.stringify(sanitizeSharedMessages(thread.messages));
`, "sanitize shared snapshot on creation");

  replaceOnce(path,
`        messages: JSON.parse(row.messages_json || "[]"),
`,
`        messages: sanitizeSharedMessages(JSON.parse(row.messages_json || "[]")),
`, "sanitize legacy shared snapshot on read");
}

console.log("Runtime integrity patch applied successfully.");
