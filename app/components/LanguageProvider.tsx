"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "pt-BR" | "es" | "en";
export type AppTheme = "dark" | "light";
export type CardCollection = "personas" | "places";
export type CardOrderMode = "original" | "popular" | "random" | "custom";
export type NemosineLevel = "Peregrino" | "Vassalo" | "Regente" | "Soberano";

type CardOrders = Record<CardCollection, string[]>;
type CardUsage = Record<CardCollection, Record<string, number>>;

const emptyCardOrders: CardOrders = { personas: [], places: [] };
const emptyCardUsage: CardUsage = { personas: {}, places: {} };

const translatedPersonaNames: Record<Exclude<AppLanguage, "pt-BR">, Record<string, string>> = {
    es: {
        Adjunto: "Ayudante", Advogado: "Abogado", Aprovisionador: "Aprovisionador", Arauto: "Heraldo",
        Arqueólogo: "Arqueólogo", Artista: "Artista", Astrônomo: "Astrónomo", Autor: "Autor",
        "Bobo da Corte": "Bufón de la Corte", Bruto: "Bruto", Bruxo: "Brujo", Burguês: "Burgués",
        Cientista: "Científico", Cigana: "Gitana", Comandante: "Comandante", "Confessor 2.0": "Confesor",
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
        Cientista: "Scientist", Cigana: "Fortune Teller", Comandante: "Commander", "Confessor 2.0": "Confessor",
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
        start: "Início",
        personas: "Personas",
        places: "Lugares da Mente",
        constitution: "Constituição",
        games: "Jogos",
        community: "Comunidade Nemosine",
        mySpace: "Meu Espaço",
        adminPanel: "Painel Admin",
        video: "Vídeo",
        language: "Idioma",
        settings: "Configurações",
        theme: "Tema",
        lightTheme: "Claro",
        darkTheme: "Escuro",
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
        collapseMenu: "Recolher menu",
        expandMenu: "Mostrar menu",
        cardOrder: "Ordem das cartas",
        levels: "NÍVEIS",
        orderOriginal: "Ordem original",
        orderPopular: "Mais usados",
        orderRandom: "Aleatório",
        orderCustom: "Personalizado",
        dragCardsHint: "Arraste a carta inteira; use o ícone para abrir",
    },
    es: {
        start: "Inicio",
        personas: "Personas", places: "Lugares de la Mente",
        constitution: "Constitución", games: "Juegos", community: "Comunidad Nemosine",
        mySpace: "Mi Espacio", adminPanel: "Panel Admin",
        video: "Vídeo", language: "Idioma", settings: "Configuración", theme: "Tema", lightTheme: "Claro", darkTheme: "Oscuro", logout: "Salir del Grimorio", enter: "Entrar",
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
        collapseMenu: "Ocultar menu", expandMenu: "Mostrar menu",
        cardOrder: "Orden de cartas", levels: "NIVELES", orderOriginal: "Orden original",
        orderPopular: "Mas usados", orderRandom: "Aleatorio",
        orderCustom: "Personalizado", dragCardsHint: "Arrastra la tarjeta; usa el icono para abrir",
    },
    en: {
        start: "Home",
        personas: "Personas", places: "Places of the Mind",
        constitution: "Constitution", games: "Games", community: "Nemosine Community",
        mySpace: "My Space", adminPanel: "Admin Panel",
        video: "Video", language: "Language", settings: "Settings", theme: "Theme", lightTheme: "Light", darkTheme: "Dark", logout: "Leave the Grimoire", enter: "Enter",
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
        collapseMenu: "Hide menu", expandMenu: "Show menu",
        cardOrder: "Card order", levels: "LEVELS", orderOriginal: "Original order",
        orderPopular: "Most used", orderRandom: "Random",
        orderCustom: "Custom", dragCardsHint: "Drag the card; use the icon to open",
    }
} as const;

type TranslationKey = keyof typeof translations["pt-BR"];
type LanguageContextValue = {
    language: AppLanguage;
    setLanguage: (language: AppLanguage) => void;
    theme: AppTheme;
    setTheme: (theme: AppTheme) => void;
    cardOrderMode: CardOrderMode;
    setCardOrderMode: (mode: CardOrderMode) => void;
    level: NemosineLevel;
    setLevel: (level: NemosineLevel) => void;
    getOrderedCards: (collection: CardCollection, originalOrder: string[]) => string[];
    setCustomCardOrder: (collection: CardCollection, names: string[]) => void;
    ensureRandomCardOrder: (collection: CardCollection, names: string[]) => void;
    clearRandomCardOrders: () => void;
    recordCardUse: (collection: CardCollection, name: string) => void;
    t: (key: TranslationKey) => string;
    entityName: (name: string) => string;
};
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<AppLanguage>("pt-BR");
    const [theme, setThemeState] = useState<AppTheme>("dark");
    const [cardOrderMode, setCardOrderModeState] = useState<CardOrderMode>("original");
    const [level, setLevelState] = useState<NemosineLevel>("Soberano");
    const [customCardOrders, setCustomCardOrders] = useState<CardOrders>(emptyCardOrders);
    const [randomCardOrders, setRandomCardOrders] = useState<CardOrders>(emptyCardOrders);
    const [cardUsage, setCardUsage] = useState<CardUsage>(emptyCardUsage);

    useEffect(() => {
        const stored = window.localStorage.getItem("nemosine-language") as AppLanguage | null;
        if (stored === "pt-BR" || stored === "es" || stored === "en") {
            setLanguageState(stored);
            document.documentElement.lang = stored;
        } else {
            document.documentElement.lang = "pt-BR";
        }
    }, []);

    useEffect(() => {
        const storedTheme = window.localStorage.getItem("nemosine-theme");
        const initialTheme: AppTheme = storedTheme === "light" ? "light" : "dark";
        setThemeState(initialTheme);
        document.documentElement.classList.toggle("dark", initialTheme === "dark");
        document.documentElement.classList.toggle("light-theme", initialTheme === "light");
    }, []);

    useEffect(() => {
        const storedMode = window.localStorage.getItem("nemosine-card-order") as CardOrderMode | null;
        if (storedMode === "original" || storedMode === "popular" || storedMode === "random" || storedMode === "custom") {
            setCardOrderModeState(storedMode);
        }
        const storedLevel = window.localStorage.getItem("nemosine-level") as NemosineLevel | null;
        if (storedLevel === "Peregrino" || storedLevel === "Vassalo" || storedLevel === "Regente" || storedLevel === "Soberano") {
            setLevelState(storedLevel);
        }

        const readStoredObject = <T,>(key: string, fallback: T): T => {
            try {
                const stored = window.localStorage.getItem(key);
                return stored ? JSON.parse(stored) as T : fallback;
            } catch {
                return fallback;
            }
        };

        setCustomCardOrders(readStoredObject("nemosine-custom-card-orders", emptyCardOrders));
        setRandomCardOrders(readStoredObject("nemosine-random-card-orders", emptyCardOrders));
        setCardUsage(readStoredObject("nemosine-card-usage", emptyCardUsage));
    }, []);

    const setLanguage = (nextLanguage: AppLanguage) => {
        setLanguageState(nextLanguage);
        window.localStorage.setItem("nemosine-language", nextLanguage);
        document.documentElement.lang = nextLanguage;
    };

    const setTheme = (nextTheme: AppTheme) => {
        setThemeState(nextTheme);
        window.localStorage.setItem("nemosine-theme", nextTheme);
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
        document.documentElement.classList.toggle("light-theme", nextTheme === "light");
    };

    const setCardOrderMode = (mode: CardOrderMode) => {
        setCardOrderModeState(mode);
        window.localStorage.setItem("nemosine-card-order", mode);
    };

    const setLevel = (nextLevel: NemosineLevel) => {
        setLevelState(nextLevel);
        window.localStorage.setItem("nemosine-level", nextLevel);
    };

    const mergeCardOrder = (savedOrder: string[], originalOrder: string[]) => [
        ...savedOrder.filter((name) => originalOrder.includes(name)),
        ...originalOrder.filter((name) => !savedOrder.includes(name))
    ];

    const getOrderedCards = (collection: CardCollection, originalOrder: string[]) => {
        if (cardOrderMode === "custom") {
            return mergeCardOrder(customCardOrders[collection], originalOrder);
        }
        if (cardOrderMode === "random" && randomCardOrders[collection].length) {
            return mergeCardOrder(randomCardOrders[collection], originalOrder);
        }
        if (cardOrderMode === "popular") {
            return [...originalOrder].sort((left, right) => {
                const difference = (cardUsage[collection][right] || 0) - (cardUsage[collection][left] || 0);
                return difference || originalOrder.indexOf(left) - originalOrder.indexOf(right);
            });
        }
        return originalOrder;
    };

    const setCustomCardOrder = (collection: CardCollection, names: string[]) => {
        setCustomCardOrders((current) => {
            const next = { ...current, [collection]: names };
            window.localStorage.setItem("nemosine-custom-card-orders", JSON.stringify(next));
            return next;
        });
    };

    const ensureRandomCardOrder = (collection: CardCollection, names: string[]) => {
        setRandomCardOrders((current) => {
            if (current[collection].length) return current;
            const shuffled = [...names];
            for (let index = shuffled.length - 1; index > 0; index -= 1) {
                const randomIndex = Math.floor(Math.random() * (index + 1));
                [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
            }
            const next = { ...current, [collection]: shuffled };
            window.localStorage.setItem("nemosine-random-card-orders", JSON.stringify(next));
            return next;
        });
    };

    const clearRandomCardOrders = () => {
        setRandomCardOrders(emptyCardOrders);
        window.localStorage.removeItem("nemosine-random-card-orders");
    };

    const recordCardUse = (collection: CardCollection, name: string) => {
        setCardUsage((current) => {
            const next = {
                ...current,
                [collection]: {
                    ...current[collection],
                    [name]: (current[collection][name] || 0) + 1
                }
            };
            window.localStorage.setItem("nemosine-card-usage", JSON.stringify(next));
            return next;
        });
    };

    const value = useMemo(() => ({
        language,
        setLanguage,
        theme,
        setTheme,
        cardOrderMode,
        setCardOrderMode,
        level,
        setLevel,
        getOrderedCards,
        setCustomCardOrder,
        ensureRandomCardOrder,
        clearRandomCardOrders,
        recordCardUse,
        t: (key: TranslationKey) => translations[language][key],
        entityName: (name: string) => name === "Confessor 2.0"
            ? language === "es" ? "Confesor" : "Confessor"
            : language === "pt-BR" ? name : translatedPersonaNames[language][name] || name
    }), [language, theme, cardOrderMode, level, customCardOrders, randomCardOrders, cardUsage]);

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
