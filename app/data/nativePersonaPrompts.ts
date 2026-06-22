import nativePrompts from "@/prompts.json";

type NativePrompts = Record<string, string>;

export type NativePersonaPromptRecord = {
    appName: string;
    promptKey: string;
    prompt: string;
    source: "google-drive-native-prompt";
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

const normalizePersonaKey = (name: string) => name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\uFE00-\uFE0F]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(o|a)\s+/, "")
    .trim();

const normalizedPromptEntries = Object.entries(prompts).map(([promptKey, prompt]) => ({
    promptKey,
    prompt,
    normalizedKey: normalizePersonaKey(promptKey),
}));

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
        const normalizedAlias = normalizePersonaKey(aliasedPromptKey);
        const aliasedPromptEntry = normalizedPromptEntries.find((entry) => entry.normalizedKey === normalizedAlias);

        if (aliasedPromptEntry?.prompt) {
            return {
                appName,
                promptKey: aliasedPromptEntry.promptKey,
                prompt: aliasedPromptEntry.prompt,
                source: "google-drive-native-prompt",
            };
        }
    }

    const normalizedName = normalizePersonaKey(appName);
    const promptEntry = normalizedPromptEntries.find((entry) => entry.normalizedKey === normalizedName);

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
