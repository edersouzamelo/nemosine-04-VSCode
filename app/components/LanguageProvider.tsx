"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "pt-BR" | "es" | "en";

const translatedPersonaNames: Record<Exclude<AppLanguage, "pt-BR">, Record<string, string>> = {
    es: {
        Adjunto: "Ayudante", Advogado: "Abogado", Aprovisionador: "Aprovisionador", Arauto: "Heraldo",
        Arqueólogo: "Arqueólogo", Artista: "Artista", Astrônomo: "Astrónomo", Autor: "Autor",
        "Bobo da Corte": "Bufón de la Corte", Bruto: "Bruto", Bruxo: "Brujo", Burguês: "Burgués",
        Cientista: "Científico", Cigana: "Gitana", Comandante: "Comandante", "Confessor 2.0": "Confesor 2.0",
        Coveiro: "Sepulturero", Curador: "Curador", Custódio: "Custodio", Desejo: "Deseo", Dor: "Dolor",
        Engenheiro: "Ingeniero", Espelho: "Espejo", Espião: "Espía", Estrategista: "Estratega",
        Executor: "Ejecutor", Exorcista: "Exorcista", Fantasma: "Fantasma", Filósofo: "Filósofo",
        Fúria: "Furia", Guardião: "Guardián", Guru: "Gurú", Herdeiro: "Heredero", Inimigo: "Enemigo",
        Instrutor: "Instructor", Juiz: "Juez", Louco: "Loco", Luz: "Luz", Médico: "Médico",
        Mentor: "Mentor", Mentorzinho: "Mentorcito", Mestre: "Maestro", Mordomo: "Mayordomo",
        Narrador: "Narrador", "Orquestrador-Arquiteto": "Orquestador-Arquitecto", Princesa: "Princesa",
        Promotor: "Fiscal", Psicólogo: "Psicólogo", Sócio: "Socio", Sombra: "Sombra",
        Terapeuta: "Terapeuta", Treinador: "Entrenador", Vazio: "Vacío", Vidente: "Vidente",
        Vigia: "Vigía", Vingador: "Vengador"
    },
    en: {
        Adjunto: "Aide", Advogado: "Lawyer", Aprovisionador: "Provisioner", Arauto: "Herald",
        Arqueólogo: "Archaeologist", Artista: "Artist", Astrônomo: "Astronomer", Autor: "Author",
        "Bobo da Corte": "Court Jester", Bruto: "Brute", Bruxo: "Sorcerer", Burguês: "Bourgeois",
        Cientista: "Scientist", Cigana: "Fortune Teller", Comandante: "Commander", "Confessor 2.0": "Confessor 2.0",
        Coveiro: "Gravedigger", Curador: "Curator", Custódio: "Custodian", Desejo: "Desire", Dor: "Pain",
        Engenheiro: "Engineer", Espelho: "Mirror", Espião: "Spy", Estrategista: "Strategist",
        Executor: "Executor", Exorcista: "Exorcist", Fantasma: "Ghost", Filósofo: "Philosopher",
        Fúria: "Fury", Guardião: "Guardian", Guru: "Guru", Herdeiro: "Heir", Inimigo: "Enemy",
        Instrutor: "Instructor", Juiz: "Judge", Louco: "Madman", Luz: "Light", Médico: "Physician",
        Mentor: "Mentor", Mentorzinho: "Little Mentor", Mestre: "Master", Mordomo: "Butler",
        Narrador: "Narrator", "Orquestrador-Arquiteto": "Orchestrator-Architect", Princesa: "Princess",
        Promotor: "Prosecutor", Psicólogo: "Psychologist", Sócio: "Partner", Sombra: "Shadow",
        Terapeuta: "Therapist", Treinador: "Coach", Vazio: "Void", Vidente: "Seer",
        Vigia: "Watchman", Vingador: "Avenger"
    }
};

const translations = {
    "pt-BR": {
        controlPanel: "Painel de Controle",
        personas: "Personas",
        places: "Lugares da Mente",
        constitution: "Constituição",
        games: "Jogos",
        community: "Comunidade Nemosine",
        localSpace: "Espaço Local",
        mySpace: "Meu Espaço",
        adminPanel: "Painel Admin",
        video: "Vídeo",
        language: "Idioma",
        logout: "Sair do Grimório",
        enter: "Entrar",
        loginTitle: "Entrar no Grimório",
        registerTitle: "Manifestar Presença",
        loginPrompt: "Insira suas credenciais para manifestar o portal.",
        registerPrompt: "Registre-se para iniciar seu processamento.",
        namePlaceholder: "Como deseja ser chamado?",
        passwordPlaceholder: "Sua senha secreta",
        processing: "PROCESSANDO...",
        continue: "CONTINUAR",
        continueWithGoogle: "CONTINUAR COM GOOGLE",
        or: "OU",
        haveAccess: "Já possui acesso? Entrar",
        register: "Novo por aqui? Registrar-se",
        recentMemories: "Memórias Recentes",
        newChat: "Novo Chat",
        startJourney: "Inicie uma nova jornada com",
        messagePlaceholder: "Digite ou dite sua mensagem...",
        responseError: "Não foi possível obter resposta agora. Tente novamente.",
        dossierAgent: "Dossiê do Agente",
        dossierPlace: "Dossiê do Lugar",
        identification: "Identificação",
        protocol: "Protocolo & Roteiro",
        onboardingTitle: "Primeiros passos no Nemosine",
        close: "Fechar",
        conversationWith: "Conversa com",
    },
    es: {
        controlPanel: "Panel de Control", personas: "Personas", places: "Lugares de la Mente",
        constitution: "Constitución", games: "Juegos", community: "Comunidad Nemosine",
        localSpace: "Espacio Local", mySpace: "Mi Espacio", adminPanel: "Panel Admin",
        video: "Vídeo", language: "Idioma", logout: "Salir del Grimorio", enter: "Entrar",
        loginTitle: "Entrar al Grimorio", registerTitle: "Manifestar Presencia",
        loginPrompt: "Ingresa tus credenciales para manifestar el portal.",
        registerPrompt: "Regístrate para iniciar tu procesamiento.",
        namePlaceholder: "¿Cómo deseas ser llamado?", passwordPlaceholder: "Tu contraseña secreta",
        processing: "PROCESANDO...", continue: "CONTINUAR", continueWithGoogle: "CONTINUAR CON GOOGLE", or: "O", haveAccess: "¿Ya tienes acceso? Entrar",
        register: "¿Nuevo por aquí? Regístrate", recentMemories: "Memorias Recientes",
        newChat: "Nuevo Chat", startJourney: "Inicia un nuevo viaje con",
        messagePlaceholder: "Escribe o dicta tu mensaje...", responseError: "No fue posible obtener respuesta ahora. Inténtalo nuevamente.",
        dossierAgent: "Dossier del Agente", dossierPlace: "Dossier del Lugar",
        identification: "Identificación", protocol: "Protocolo y Guion",
        onboardingTitle: "Primeros pasos en Nemosine", close: "Cerrar",
        conversationWith: "Conversación con",
    },
    en: {
        controlPanel: "Control Panel", personas: "Personas", places: "Places of the Mind",
        constitution: "Constitution", games: "Games", community: "Nemosine Community",
        localSpace: "Local Space", mySpace: "My Space", adminPanel: "Admin Panel",
        video: "Video", language: "Language", logout: "Leave the Grimoire", enter: "Enter",
        loginTitle: "Enter the Grimoire", registerTitle: "Manifest Presence",
        loginPrompt: "Enter your credentials to manifest the portal.",
        registerPrompt: "Register to begin your processing.",
        namePlaceholder: "How would you like to be called?", passwordPlaceholder: "Your secret password",
        processing: "PROCESSING...", continue: "CONTINUE", continueWithGoogle: "CONTINUE WITH GOOGLE", or: "OR", haveAccess: "Already have access? Sign in",
        register: "New here? Register", recentMemories: "Recent Memories",
        newChat: "New Chat", startJourney: "Begin a new journey with",
        messagePlaceholder: "Type or dictate your message...", responseError: "Unable to obtain a response right now. Please try again.",
        dossierAgent: "Agent Dossier", dossierPlace: "Place Dossier",
        identification: "Identification", protocol: "Protocol & Script",
        onboardingTitle: "Getting started with Nemosine", close: "Close",
        conversationWith: "Conversation with",
    }
} as const;

type TranslationKey = keyof typeof translations["pt-BR"];
type LanguageContextValue = {
    language: AppLanguage;
    setLanguage: (language: AppLanguage) => void;
    t: (key: TranslationKey) => string;
    entityName: (name: string) => string;
};
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<AppLanguage>("pt-BR");

    useEffect(() => {
        const stored = window.localStorage.getItem("nemosine-language") as AppLanguage | null;
        if (stored === "pt-BR" || stored === "es" || stored === "en") {
            setLanguageState(stored);
            document.documentElement.lang = stored;
        } else {
            document.documentElement.lang = "pt-BR";
        }
    }, []);

    const setLanguage = (nextLanguage: AppLanguage) => {
        setLanguageState(nextLanguage);
        window.localStorage.setItem("nemosine-language", nextLanguage);
        document.documentElement.lang = nextLanguage;
    };

    const value = useMemo(() => ({
        language,
        setLanguage,
        t: (key: TranslationKey) => translations[language][key],
        entityName: (name: string) => language === "pt-BR" ? name : translatedPersonaNames[language][name] || name
    }), [language]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) throw new Error("useLanguage must be used within LanguageProvider");
    return context;
}

export function LanguageSelector({ dark = true }: { dark?: boolean }) {
    const { language, setLanguage, t } = useLanguage();
    return (
        <label className={`flex items-center gap-2 text-xs ${dark ? "text-[#c5a059]" : "text-stone-700"}`}>
            <span className="uppercase tracking-widest">{t("language")}</span>
            <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as AppLanguage)}
                className={`rounded border px-2 py-1 ${dark ? "border-[#c5a059]/40 bg-black text-[#e1e1e6]" : "border-stone-500/40 bg-transparent text-stone-800"}`}
            >
                <option value="pt-BR">PT/BR</option>
                <option value="es">ESP</option>
                <option value="en">ENG</option>
            </select>
        </label>
    );
}
