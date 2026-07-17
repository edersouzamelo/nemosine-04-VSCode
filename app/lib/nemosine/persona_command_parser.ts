import { ENTITIES } from "@/app/data/entities";

export type PersonaPresenceCommandAction = "invite" | "remove" | "mute" | "unmute";

export type PersonaPresenceCommand = {
  action: PersonaPresenceCommandAction;
  personaIds: string[];
  raw: string;
};

export type PersonaPresenceParseResult = {
  commands: PersonaPresenceCommand[];
  semanticText: string;
};

type NormalizedText = {
  text: string;
  indexMap: number[];
};

const INVITE_TRIGGERS = [
  "/convidar",
  "convide",
  "convida",
  "convidar",
  "chamei",
  "chame",
  "chama",
  "chamar",
  "traga",
  "traz",
  "quero chamar",
  "quero convidar",
];

const REMOVE_TRIGGERS = [
  "/desconvidar",
  "desconvidar",
  "dispense",
  "retire",
  "expulse",
  "remova",
];

const MUTE_TRIGGERS = [
  "/silenciar",
  "silencie",
  "silencia",
  "mute",
  "calar",
  "cale",
];

const UNMUTE_TRIGGERS = [
  "/reativar",
  "/dessilenciar",
  "dessilencie",
  "reative",
  "deixe falar",
  "pode falar",
  "volte a falar",
];

function normalizeWithIndexMap(value: string): NormalizedText {
  let text = "";
  const indexMap: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const normalized = value[index]
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    for (const char of normalized) {
      text += char;
      indexMap.push(index);
    }
  }

  return {
    text: text.replace(/[“”"']/g, ""),
    indexMap,
  };
}

export function normalizePersonaCommandText(value: string) {
  return normalizeWithIndexMap(value).text
    .replace(/[^\p{L}\p{N}/@.,;:\-\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordBoundaryPattern(value: string) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "u");
}

function escapedNormalizedName(value: string) {
  return normalizePersonaCommandText(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}

function getPersonaNames() {
  return Object.values(ENTITIES)
    .filter((entity) => entity.type === "persona")
    .map((entity) => entity.name)
    .sort((a, b) => normalizePersonaCommandText(b).length - normalizePersonaCommandText(a).length);
}

function resolvePersonas(text: string) {
  const normalized = normalizePersonaCommandText(text);
  return getPersonaNames().filter((personaName) =>
    wordBoundaryPattern(normalizePersonaCommandText(personaName)).test(normalized)
  );
}

function hasNegationBeforeTrigger(normalizedText: string, triggerIndex: number) {
  const before = normalizedText.slice(Math.max(0, triggerIndex - 24), triggerIndex).trim();
  return /\b(nao|nunca|jamais)$/.test(before);
}

function isNegativeInvitationQuestion(normalizedText: string, triggerIndex: number) {
  const before = normalizedText.slice(Math.max(0, triggerIndex - 36), triggerIndex).trim();
  return /\b(por que|porque)\s+(?:voce\s+|vc\s+)?nao$/.test(before);
}

function findTriggeredCommand(text: string, action: PersonaPresenceCommandAction, triggers: string[]) {
  const normalized = normalizeWithIndexMap(text);
  const normalizedText = normalized.text;
  const trigger = triggers
    .map((triggerText) => {
      const normalizedTrigger = normalizeWithIndexMap(triggerText).text;
      const match = wordBoundaryPattern(normalizedTrigger).exec(normalizedText);
      return {
        triggerText,
        index: match ? match.index + (match[1]?.length || 0) : -1,
      };
    })
    .filter((item) => {
      if (item.index < 0) return false;
      if (!hasNegationBeforeTrigger(normalizedText, item.index)) return true;
      return action === "invite" && isNegativeInvitationQuestion(normalizedText, item.index);
    })
    .sort((a, b) => a.index - b.index)[0];

  if (!trigger) return null;

  const commandText = text.slice(normalized.indexMap[trigger.index] ?? 0);
  const personaIdsAfterTrigger = resolvePersonas(commandText);
  const personaIds = personaIdsAfterTrigger.length > 0
    ? personaIdsAfterTrigger
    : action === "invite" ? resolvePersonas(text) : [];
  if (personaIds.length === 0) return null;

  return {
    action,
    personaIds,
    raw: commandText.trim(),
  };
}

function findCanLeaveCommands(text: string): PersonaPresenceCommand | null {
  const normalizedText = normalizePersonaCommandText(text);
  const personaIds = getPersonaNames().filter((personaName) => {
    const normalizedPersona = escapedNormalizedName(personaName);
    return new RegExp(`(^|[^\\p{L}\\p{N}])${normalizedPersona}\\s*,?\\s+pode\\s+sair(?=$|[^\\p{L}\\p{N}])`, "u")
      .test(normalizedText);
  });

  if (personaIds.length === 0) return null;
  return {
    action: "remove",
    personaIds,
    raw: text.trim(),
  };
}

function findCanSpeakCommands(text: string): PersonaPresenceCommand | null {
  const normalizedText = normalizePersonaCommandText(text);
  const personaIds = getPersonaNames().filter((personaName) => {
    const normalizedPersona = escapedNormalizedName(personaName);
    return new RegExp(`(^|[^\\p{L}\\p{N}])${normalizedPersona}\\s*,?\\s+(?:pode\\s+falar|volte\\s+a\\s+falar|pode\\s+voltar)(?=$|[^\\p{L}\\p{N}])`, "u")
      .test(normalizedText);
  });

  if (personaIds.length === 0) return null;
  return {
    action: "unmute",
    personaIds,
    raw: text.trim(),
  };
}

function dedupeCommands(commands: PersonaPresenceCommand[]) {
  const seen = new Set<string>();
  return commands
    .map((command) => ({
      ...command,
      personaIds: command.personaIds.filter((personaId) => {
        const key = `${command.action}:${personaId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    }))
    .filter((command) => command.personaIds.length > 0);
}

function stripCommandFromSemanticText(text: string, commands: PersonaPresenceCommand[]) {
  if (commands.length === 0) return text.trim();
  const normalized = normalizeWithIndexMap(text);
  const normalizedText = normalized.text;
  const allPersonaNames = commands.flatMap((command) => command.personaIds);
  let lastPersonaEnd = -1;

  for (const personaName of allPersonaNames) {
    const normalizedPersona = normalizePersonaCommandText(personaName);
    const index = normalizedText.lastIndexOf(normalizedPersona);
    if (index >= 0) {
      const end = normalized.indexMap[index + normalizedPersona.length - 1] ?? -1;
      lastPersonaEnd = Math.max(lastPersonaEnd, end + 1);
    }
  }

  if (lastPersonaEnd >= 0) {
    const remainder = text
      .slice(lastPersonaEnd)
      .replace(/^\s*(?:,|;|\.|:)?\s*(?:e\s+)?/i, "")
      .trim();
    if (remainder) return remainder;
  }

  return "";
}

export function parsePersonaPresenceCommands(text: string, voiceTranscript?: string): PersonaPresenceParseResult {
  const combinedText = [text, voiceTranscript].filter((item): item is string => Boolean(item?.trim())).join("\n");
  if (!combinedText.trim()) return { commands: [], semanticText: "" };

  const commands = dedupeCommands([
    findTriggeredCommand(combinedText, "invite", INVITE_TRIGGERS),
    findTriggeredCommand(combinedText, "remove", REMOVE_TRIGGERS),
    findTriggeredCommand(combinedText, "mute", MUTE_TRIGGERS),
    findTriggeredCommand(combinedText, "unmute", UNMUTE_TRIGGERS),
    findCanLeaveCommands(combinedText),
    findCanSpeakCommands(combinedText),
  ].filter((command): command is PersonaPresenceCommand => Boolean(command)));

  return {
    commands,
    semanticText: stripCommandFromSemanticText(text, commands),
  };
}

export function hasPersonaPresenceCommand(text: string, voiceTranscript?: string) {
  return parsePersonaPresenceCommands(text, voiceTranscript).commands.length > 0;
}
