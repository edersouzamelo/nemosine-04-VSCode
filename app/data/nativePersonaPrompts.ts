import nativePrompts from "@/prompts.json";

type NativePrompts = Record<string, string>;

export type NativePersonaPromptRecord = {
    appName: string;
    promptKey: string;
    prompt: string;
    source: "google-drive-native-prompt";
};

export type NativePersonaSoulCard = {
    appName: string;
    promptKey: string;
    source: NativePersonaPromptRecord["source"] | "entities-fallback";
    fullPromptLength: number;
    soulCard: string;
};

export const NATIVE_PERSONA_PROMPTS_DRIVE_FOLDER = {
    id: "1gpmfXnWjfq65pSOa2r3YcROxKc1bdnkI",
    name: "Prompts dos Personas",
    url: "https://drive.google.com/drive/folders/1gpmfXnWjfq65pSOa2r3YcROxKc1bdnkI",
} as const;

const prompts = nativePrompts as NativePrompts;

const nativePromptAliases: Record<string, string> = {
    Adjunto: "O Adjunto",
    Advogado: "O Advogado",
    Aprovisionador: "O Aprovisionador",
    Arauto: "O Arauto",
    Arqueólogo: "O Arqueólogo",
    Artista: "O Artista",
    Astrônomo: "O Astrônomo",
    Autor: "O Autor",
    "Bobo da Corte": "O Bobo",
    Bruto: "O Bruto",
    Bruxo: "O Bruxo",
    Burguês: "O Burguês",
    Cientista: "O Cientista",
    Cigana: "A Cigana",
    Comandante: "O Comandante",
    "Confessor 2.0": "O Confessor",
    Coveiro: "O Coveiro",
    Curador: "O Curador",
    Custódio: "O Custódio",
    Desejo: "O Desejo",
    Dor: "A Dor",
    Engenheiro: "O Engenheiro",
    Espelho: "O Espelho",
    Espião: "O Espião",
    Estrategista: "O Estrategista",
    Executor: "O Executor",
    Exorcista: "O Exorcista",
    Fantasma: "O Fantasma",
    Filósofo: "O Filósofo",
    Fúria: "A Fúria",
    Guardião: "O Guardião",
    Guru: "O Guru",
    Herdeiro: "O Herdeiro",
    Inimigo: "O Inimigo",
    Instrutor: "O Instrutor",
    Juiz: "O Juiz",
    Louco: "O Louco",
    Luz: "A Luz",
    Médico: "O Médico",
    Mentor: "O Mentor",
    Mentorzinho: "O Mentorzinho",
    Mestre: "O Mestre",
    Mordomo: "O Mordomo",
    Narrador: "O Narrador",
    "Orquestrador-Arquiteto": "O Orquestrador",
    Princesa: "A Princesa",
    Promotor: "O Promotor",
    Psicólogo: "O Psicólogo",
    Sócio: "O Sócio",
    Sombra: "A Sombra",
    Terapeuta: "O Terapeuta",
    Treinador: "O Treinador",
    Vazio: "O Vazio",
    Vidente: "O Vidente",
    Vigia: "O Vigia",
    Vingador: "O Vingador",
};

export const normalizePersonaPromptKey = (name: string) => name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFE0E\uFE0F]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(o|a)\s+/, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizedPromptEntries = Object.entries(prompts).map(([promptKey, prompt]) => ({
    promptKey,
    prompt,
    normalizedKey: normalizePersonaPromptKey(promptKey),
}));

const promptEntryByNormalizedKey = new Map(
    normalizedPromptEntries.map((entry) => [entry.normalizedKey, entry])
);

const normalizePromptText = (text: string) => text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const setupLinePatterns = [
    /^PROMPT DO\b/i,
    /^Crie um projeto\b/i,
    /^Crie um projeto ou espaco\b/i,
    /^Copie e cole\b/i,
    /^nomeie\b/i,
    /^AQUI TERMINA O PROMPT\b/i,
    /^_{5,}$/i,
    /^linktr\.ee\//i,
    /^Licen[cç]a:/i,
];

function stripNativePromptBoilerplate(prompt: string) {
    const normalized = normalizePromptText(prompt);
    const cutoffMarkers = [
        "Status Permanente:",
        "#LOCKIN_UNIVERSAL_NEMOSINE",
        "AQUI TERMINA O PROMPT",
        "Este prompt faz parte",
        "Para conhecer outros prompt",
        "Licença:",
        "Licenca:",
    ];
    const cutoff = cutoffMarkers
        .map((marker) => normalized.indexOf(marker))
        .filter((index) => index > 0)
        .sort((a, b) => a - b)[0];
    const withoutTail = cutoff ? normalized.slice(0, cutoff) : normalized;

    return normalizePromptText(
        withoutTail
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => !setupLinePatterns.some((pattern) => pattern.test(line)))
            .join("\n")
    );
}

function compactSoulText(prompt: string, maxLength = 2200) {
    const cleaned = stripNativePromptBoilerplate(prompt);
    if (cleaned.length <= maxLength) return cleaned;

    const clipped = cleaned.slice(0, maxLength);
    const lastBreak = Math.max(
        clipped.lastIndexOf("\n\n"),
        clipped.lastIndexOf(". "),
        clipped.lastIndexOf("; "),
    );
    return normalizePromptText(
        `${clipped.slice(0, lastBreak > 900 ? lastBreak + 1 : maxLength).trim()}\n\n[alma nativa compactada; detalhes secundarios omitidos do payload vivo]`
    );
}

function looksLikeConfigTemplate(prompt: string) {
    const normalized = normalizePromptText(prompt)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    return [
        "nao copie",
        "nao cole",
        "substitua os dados",
        "versao adaptavel",
        "voce pode escrever assim",
        "outro modelo de descricao",
    ].filter((marker) => normalized.includes(marker)).length >= 3;
}

export const getNativePromptAliases = () => ({ ...nativePromptAliases });

export function getNativePersonaPromptRecord(appName: string): NativePersonaPromptRecord | undefined {
    const aliasedPromptKey = nativePromptAliases[appName];
    const directPrompt = aliasedPromptKey ? prompts[aliasedPromptKey] : prompts[appName];

    if (directPrompt) {
        return {
            appName,
            promptKey: aliasedPromptKey || appName,
            prompt: directPrompt,
            source: "google-drive-native-prompt",
        };
    }

    if (aliasedPromptKey) {
        const normalizedAlias = normalizePersonaPromptKey(aliasedPromptKey);
        const aliasedPromptEntry = promptEntryByNormalizedKey.get(normalizedAlias);

        if (aliasedPromptEntry?.prompt) {
            return {
                appName,
                promptKey: aliasedPromptEntry.promptKey,
                prompt: aliasedPromptEntry.prompt,
                source: "google-drive-native-prompt",
            };
        }
    }

    const normalizedName = normalizePersonaPromptKey(appName);
    const promptEntry = promptEntryByNormalizedKey.get(normalizedName);

    if (!promptEntry?.prompt) {
        return undefined;
    }

    return {
        appName,
        promptKey: promptEntry.promptKey,
        prompt: promptEntry.prompt,
        source: "google-drive-native-prompt",
    };
}

export function resolveNativePersonaPrompt(appName: string): string | undefined {
    return getNativePersonaPromptRecord(appName)?.prompt;
}

export function buildNativePersonaSoulCard(appName: string, fallbackPrompt?: string): NativePersonaSoulCard {
    const nativePromptRecord = getNativePersonaPromptRecord(appName);
    const useFallbackForSoul = Boolean(
        nativePromptRecord?.prompt
        && fallbackPrompt
        && fallbackPrompt !== nativePromptRecord.prompt
        && looksLikeConfigTemplate(nativePromptRecord.prompt)
    );
    const sourcePrompt: string = useFallbackForSoul && fallbackPrompt
        ? fallbackPrompt
        : nativePromptRecord?.prompt || fallbackPrompt || `Voce e ${appName}.`;
    const promptKey = nativePromptRecord?.promptKey || appName;
    const source = nativePromptRecord?.source || "entities-fallback";
    const soulCard = [
        `Persona ativa: ${appName}`,
        `Fonte de alma: ${promptKey} (${source}${useFallbackForSoul ? "; roteiro local para template adaptavel" : ""})`,
        "",
        compactSoulText(sourcePrompt),
    ].join("\n");

    return {
        appName,
        promptKey,
        source,
        fullPromptLength: sourcePrompt.length,
        soulCard,
    };
}
