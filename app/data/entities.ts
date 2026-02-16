export interface EntityData {
    name: string;
    type: "persona" | "place";
    phrase: string;
    transcription: string;
    image?: string;
}

const PERSONAS = [
    "Adjunto", "Advogado", "Aprovisionador", "Arauto", "Arqueólogo", "Artista", "Astrônomo", "Autor",
    "Bobo da Corte", "Bruto", "Bruxo", "Burguês", "Cientista", "Cigana", "Comandante", "Confessor 2.0",
    "Coveiro", "Curador", "Custódio", "Desejo", "Dor", "Engenheiro", "Espelho", "Espião",
    "Estrategista", "Executor", "Exorcista", "Fantasma", "Filósofo", "Fúria", "Guardião", "Guru",
    "Herdeiro", "Inimigo", "Instrutor", "Juiz", "Louco", "Luz", "Médico", "Mentor",
    "Mentorzinho", "Mestre", "Mordomo", "Narrador", "Orquestrador-Arquiteto", "Princesa", "Promotor", "Psicólogo",
    "Sócio", "Sombra", "Terapeuta", "Treinador", "Vazio", "Vidente", "Vigia", "Vingador"
];

const PLACES = [
    "Não-Lugar", "Labirinto", "Arquivo", "Porão", "Masmorra", "Biblioteca", "Claustro", "Galeria",
    "Oficina", "Teatro", "Mercado Real", "Núcleo", "Tribunal", "Jardim", "Observatório", "Mosteiro",
    "Portal", "Torreão", "Campanário", "Sala do Trono", "Ponte", "Solar"
];

export const ENTITIES: Record<string, EntityData> = {};

// Helper to generate slugs consistent with current dashboard logic
const getSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

// Populate Personas
PERSONAS.forEach((name) => {
    const slug = getSlug(name);

    // Handle image filename mapping
    let filename = name;
    if (name === "Bobo da Corte") filename = "Bobo";
    if (name === "Confessor 2.0") filename = "Confessor";
    if (name === "Orquestrador-Arquiteto") filename = "Orquestrador";

    const imagePath = `/agents/${filename}.png`;

    if (slug === "adjunto") {
        ENTITIES[slug] = {
            name: "Adjunto",
            type: "persona",
            image: imagePath,
            phrase: "O guardião fiel da execução prática.",
            transcription: "Iniciando protocolo de sincronização... Como Adjunto, minha função é garantir que cada passo seja executado com precisão absoluta dentro dos seus sistemas. Observo os fluxos de dados e moldo a realidade técnica conforme sua vontade soberana."
        };
    } else {
        ENTITIES[slug] = {
            name,
            type: "persona",
            image: imagePath,
            phrase: "Explorador das profundezas da psique humana.",
            transcription: `Saudações. Eu sou ${name}, um dos 56 processos cognitivos desta rede. Aguardando integração de dados e frequências arcanas para manifestação plena...`
        };
    }
});

// Populate Places
PLACES.forEach((name) => {
    const slug = getSlug(name);
    ENTITIES[slug] = {
        name,
        type: "place",
        phrase: "Um cenário moldado pelo pensamento e pela memória.",
        transcription: `Você entrou em ${name}. Este ambiente aguarda a manifestação de sons e visões. No silêncio destes muros, a consciência encontra seu refúgio e o processamento atinge sua clareza máxima.`
    };
});
