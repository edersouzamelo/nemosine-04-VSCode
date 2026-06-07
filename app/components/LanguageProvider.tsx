"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { isAdminEmail } from "../lib/accessControl";

export type AppLanguage = "pt-BR" | "pt-PT" | "en" | "es" | "fr" | "it" | "de" | "ar" | "zh" | "ja";
export type AppTheme = "dark" | "light" | "luanova" | "crepusculo";
export type AppFontSize = "small" | "medium" | "large";
export type CardCollection = "personas" | "places";
export type CardOrderMode = "original" | "popular" | "random" | "custom";
export type NemosineLevel = "Peregrino" | "Vassalo" | "Regente" | "Soberano";
export type CognitiveMode = "symbolic" | "sober";

type CardOrders = Record<CardCollection, string[]>;
type CardUsage = Record<CardCollection, Record<string, number>>;

const emptyCardOrders: CardOrders = { personas: [], places: [] };
const emptyCardUsage: CardUsage = { personas: {}, places: {} };

const translatedPersonaNames: Partial<Record<AppLanguage, Record<string, string>>> = {
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
        Vigia: "Watchman", Vingador: "Avenger"
    }
};

const soberTranslations: Partial<Record<AppLanguage, Record<string, string>>> = {
    "pt-BR": {
        personas: "Agentes de Análise",
        places: "Módulos de Contexto",
        constitution: "Diretrizes & Políticas",
        travessia: "Progresso e Metas",
        dominios: "Workspace",
        registros: "Memórias",
        mySpace: "Painel Pessoal",
        logout: "Desconectar Sessão",
        dossierAgent: "Especificações do Agente",
        dossierPlace: "Especificações do Módulo",
        identification: "Parâmetros do Agente",
        protocol: "Prompt de Sistema",
        onboardingTitle: "Configuração do Workspace",
        welcomeTitle: "Centralize seus processos e modelos.",
        welcomeSubtitle: "Um workspace integrado de agentes inteligentes e produtividade cognitiva para otimizar sua clareza e tomada de decisão.",
        welcomeHelper: "Selecione o módulo de foco ou o perfil ideal para iniciar.",
        recentMemories: "Registro de Histórico",
        newChat: "Nova Sessão",
        startJourney: "Iniciar sessão com",
    },
    "pt-PT": {
        personas: "Agentes de Análise",
        places: "Módulos de Contexto",
        constitution: "Diretrizes & Políticas",
        travessia: "Progresso e Metas",
        dominios: "Workspace",
        registros: "Memórias",
        mySpace: "Painel Pessoal",
        logout: "Desligar Sessão",
        dossierAgent: "Especificações do Agente",
        dossierPlace: "Especificações do Módulo",
        identification: "Parâmetros do Agente",
        protocol: "Prompt de Sistema",
        onboardingTitle: "Configuração do Workspace",
        welcomeTitle: "Centralize os seus processos e modelos.",
        welcomeSubtitle: "Um workspace integrado de agentes inteligentes e produtividade cognitiva para otimizar a sua clareza e tomada de decisão.",
        welcomeHelper: "Selecione o módulo de foco ou o perfil ideal para iniciar.",
        recentMemories: "Registo de Histórico",
        newChat: "Nova Sessão",
        startJourney: "Iniciar sessão com",
    },
    "es": {
        personas: "Agentes de Análisis",
        places: "Módulos de Contexto",
        constitution: "Políticas y Reglas",
        travessia: "Progreso y Metas",
        dominios: "Workspace",
        registros: "Memorias",
        mySpace: "Panel Personal",
        logout: "Cerrar Sesión",
        dossierAgent: "Especificación del Agente",
        dossierPlace: "Especificación del Módulo",
        identification: "Parámetros del Agente",
        protocol: "Prompt de Sistema",
        onboardingTitle: "Configuración del Workspace",
        welcomeTitle: "Centralice sus procesos y modelos.",
        welcomeSubtitle: "Un workspace integrado con agentes inteligentes y productividad cognitiva para optimizar su claridad y toma de decisiones.",
        welcomeHelper: "Seleccione el módulo operativo o el perfil ideal para comenzar.",
        recentMemories: "Historial de Interacciones",
        newChat: "Nueva Sesión",
        startJourney: "Iniciar sesión con",
    },
    "en": {
        personas: "Analysis Agents",
        places: "Context Modules",
        constitution: "Policies & Rules",
        travessia: "Progress & Goals",
        dominios: "Workspace",
        registros: "Memories",
        mySpace: "Personal Dashboard",
        logout: "Disconnect Session",
        dossierAgent: "Agent Specification",
        dossierPlace: "Module Specification",
        identification: "Agent Parameters",
        protocol: "System Prompt",
        onboardingTitle: "Workspace Setup",
        welcomeTitle: "Centralize your processes and models.",
        welcomeSubtitle: "An integrated workspace with intelligent agents and cognitive productivity to optimize your clarity and decision-making.",
        welcomeHelper: "Select the operational module or the ideal profile to begin.",
        recentMemories: "Interaction History",
        newChat: "New Session",
        startJourney: "Start session with",
    }
};

const soberEntityNames: Partial<Record<AppLanguage, Record<string, string>>> = {
    "pt-BR": {
        "Não-Lugar": "Área Neutra",
        "Labirinto": "Resolução de Paradoxos",
        "Arquivo": "Arquivo Histórico",
        "Porão": "Análise de Hábitos",
        "Masmorra": "Contenção de Crises",
        "Biblioteca": "Base de Conhecimento",
        "Claustro": "Recalibração Somática",
        "Galeria": "Registro de Aprendizados",
        "Oficina": "Laboratório de Execução",
        "Teatro": "Simulação Comportamental",
        "Mercado Real": "Avaliação de Valor",
        "Núcleo": "Alinhamento de Decisão",
        "Tribunal": "Auditoria de Integridade",
        "Jardim": "Maturador de Projetos",
        "Observatório": "Auditoria Geral",
        "Mosteiro": "Regeneração Operacional",
        "Portal": "Simulador de Longo Prazo",
        "Torreão": "Regulação Atmosférica",
        "Campanário": "Sincronização de Informação",
        "Sala do Trono": "Soberania Consciente",
        "Ponte": "Conexão de Processos",
        "Solar": "Tradução de Intuições",
        "Bobo da Corte": "Análise de Sarcasmo",
        "Confessor 2.0": "Gestão de Culpa",
        "Orquestrador-Arquiteto": "Planejador de Arquitetura",
    },
    "es": {
        "Não-Lugar": "Área Neutra",
        "Labirinto": "Resolución de Paradojas",
        "Arquivo": "Archivo Histórico",
        "Porão": "Análisis de Hábitos",
        "Masmorra": "Control de Crisis",
        "Biblioteca": "Base de Conocimiento",
        "Claustro": "Recalibración Somática",
        "Galeria": "Registro de Aprendizajes",
        "Oficina": "Laboratorio de Ejecución",
        "Teatro": "Simulación de Conducta",
        "Mercado Real": "Evaluación de Valor",
        "Núcleo": "Alineación de Decisiones",
        "Tribunal": "Auditoría de Integridad",
        "Jardim": "Incubadora de Proyectos",
        "Observatório": "Auditoría General",
        "Mosteiro": "Reinicio Operativo",
        "Portal": "Simulador de Largo Plazo",
        "Torreão": "Regulación de Atmósfera",
        "Campanário": "Sincronización de Información",
        "Sala do Trono": "Soberanía Consciente",
        "Ponte": "Conexión de Procesos",
        "Solar": "Traducción de Intuiciones",
        "Bobo da Corte": "Análisis de Sarcasmo",
        "Confessor 2.0": "Gestión de Culpa",
        "Orquestrador-Arquiteto": "Planificador de Arquitectura",
    },
    "en": {
        "Não-Lugar": "Neutral Area",
        "Labirinto": "Paradox Resolution",
        "Arquivo": "Historical Archive",
        "Porão": "Habits Analysis",
        "Masmorra": "Crisis Control",
        "Biblioteca": "Knowledge Base",
        "Claustro": "Somatic Recalibration",
        "Galeria": "Learning Gallery",
        "Oficina": "Execution Lab",
        "Teatro": "Behavioral Simulation",
        "Mercado Real": "Valuation Assessment",
        "Núcleo": "Decision Alignment",
        "Tribunal": "Integrity Audit",
        "Jardim": "Project Incubator",
        "Observatório": "General Audit",
        "Mosteiro": "Operational Reset",
        "Portal": "Long-term Simulator",
        "Torreão": "Atmosphere Regulation",
        "Campanário": "Information Sync",
        "Sala do Trono": "Conscious Sovereignty",
        "Ponte": "Process Connection",
        "Solar": "Intuition Translation",
        "Bobo da Corte": "Sarcasm Analysis",
        "Confessor 2.0": "Guilt Management",
        "Orquestrador-Arquiteto": "Architecture Planner",
    }
};

const translations = {
    "pt-BR": {
        start: "Origens",
        personas: "Personas",
        places: "Lugares",
        constitution: "Constituição",
        games: "Jogos",
        travessia: "Travessias",
        dominios: "Domínios",
        registros: "Memórias",
        community: "Comunidade",
        mySpace: "Meu Espaço",
        adminPanel: "Painel do Criador",
        video: "Vídeo",
        language: "Idioma",
        settings: "Configurações",
        theme: "Temas",
        lightTheme: "Amanhecer",
        darkTheme: "Eclipse",
        luanovaTheme: "Lua-nova",
        crepusculoTheme: "Crepúsculo",
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
        animations: "Animações",
        modes: "Modos",
        modeSymbolic: "Simbólico",
        modeSober: "Sóbrio",
        modeSystemic: "Sistêmico",
        soon: "em breve",
        current: "Atual",
        welcomeTitle: "Organize sua mente por vozes.",
        welcomeSubtitle: "Um sistema de personas para pensar melhor, decidir com mais clareza e transformar confusão em direção.",
        welcomeHelper: "Entre pelo que você busca. O sistema encontra a voz certa.",
        searchPlaceholder: "O que você precisa agora?",
        explorePersonas: "Conhecer as personas",
        initiate: "Iniciar Travessia",
        entryPortal: "O Portal de Entrada",
        peregrinoPath: "O Caminho do Peregrino",
        peregrinoDesc: "Como §Peregrino§, você acaba de cruzar as muralhas externas do Grimório. Sob o seu comando inicial, as 8 vozes fundamentais da mente humana estão despertas. Elas são os seus conselheiros primários de reflexão, racionalidade e ação.",
        peregrinoQuote: "“Não tente dominar todas as vozes de uma vez. Escolha uma carta acima, invoque-a com honestidade e permita que a clareza se estabeleça.”",
        heuristicsTitle: "Heurística de Invocação",
        heuristicStep1: "Identifique o estado atual: Busca resolver um conflito interno, planejar o futuro ou estruturar uma lógica?",
        heuristicStep2: "Escolha seu Conselheiro: O Mentor guia, o Inimigo desafia, o Bruxo cria possibilidades, e o Cientista traz dados.",
        heuristicStep3: "Inicie o Diálogo: Clique na carta para abrir o Dossiê e conversar diretamente com o arquétipo.",
        ascensionTitle: "Ascensão Cognitiva",
        levelsTitle: "Os Níveis do Grimório",
        levelPeregrinoDesc: "Acesso às 8 personas essenciais. O ponto de partida para mapeamento inicial.",
        levelVassaloDesc: "Expansão para 24 personas consagradas. Ferramentas mais complexas e profundas de decisão.",
        levelRegenteDesc: "Acesso total às 56 personas. Painel avançado com filtragem por categorias e arquétipos.",
        levelSoberanoDesc: "Acesso pleno aos 56 personas e aos Lugares da Mente. O nível supremo do Grimório.",
        active: "Ativo",
        blocked: "Bloqueado",
        ascendTip: "Para ascender ao próximo nível, altere seu status no menu de Configurações.",
        visualization: "Visualização",
        vizSmall: "Pequena",
        vizMedium: "Média",
        vizLarge: "Grande"
    },
    "pt-PT": {
        start: "Origens",
        personas: "Personas",
        places: "Lugares",
        constitution: "Constituição",
        games: "Jogos",
        travessia: "Travessias",
        dominios: "Domínios",
        registros: "Memórias",
        community: "Comunidade",
        mySpace: "Meu Espaço",
        adminPanel: "Painel do Criador",
        video: "Vídeo",
        language: "Idioma",
        settings: "Definições",
        theme: "Temas",
        lightTheme: "Amanhecer",
        darkTheme: "Eclipse",
        luanovaTheme: "Lua-nova",
        crepusculoTheme: "Crepúsculo",
        logout: "Sair do Grimório",
        enter: "Entrar",
        loginTitle: "Entrar no Grimório",
        registerTitle: "Manifestar Presença",
        loginPrompt: "Insira as suas credenciais para manifestar o portal.",
        registerPrompt: "Registe-se para iniciar o seu processamento.",
        namePlaceholder: "Como deseja ser chamado?",
        passwordPlaceholder: "A sua palavra-passe secreta",
        processing: "A PROCESSAR...",
        continue: "CONTINUAR",
        continueWithGoogle: "CONTINUAR COM GOOGLE",
        or: "OU",
        haveAccess: "Já possui acesso? Entrar",
        register: "Novo por aqui? Registar-se",
        recentMemories: "Memórias Recentes",
        newChat: "Novo Chat",
        startJourney: "Inicie uma nova jornada com",
        messagePlaceholder: "Digite ou dite a sua mensagem...",
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
        animations: "Animações",
        modes: "Modos",
        modeSymbolic: "Simbólico",
        modeSober: "Sóbrio",
        modeSystemic: "Sistémico",
        soon: "em breve",
        current: "Atual",
        welcomeTitle: "Organize a sua mente por vozes.",
        welcomeSubtitle: "Um sistema de personas para pensar melhor, decidir com mais clareza e transformar confusão em direção.",
        welcomeHelper: "Entre pelo que procura. O sistema encontra a voz certa.",
        searchPlaceholder: "O que precisa agora?",
        explorePersonas: "Conhecer as personas",
        initiate: "Iniciar Travessia",
        entryPortal: "O Portal de Entrada",
        peregrinoPath: "O Caminho do Peregrino",
        peregrinoDesc: "Como **Peregrino**, você acaba de cruzar as muralhas externas do Grimório. Sob o seu comando inicial, as 8 vozes fundamentais da mente humana estão despertas. Elas são os seus conselheiros primários de reflexão, racionalidade e ação.",
        peregrinoQuote: "“Não tente dominar todas as vozes de uma vez. Escolha uma carta acima, invoque-a com honestidade e permita que a clareza se estabeleça.”",
        heuristicsTitle: "Heurística de Invocação",
        heuristicStep1: "Identifique o estado atual: Procura resolver um conflito interno, planear o futuro ou estruturar uma lógica?",
        heuristicStep2: "Escolha o seu Conselheiro: O Mentor guia, o Inimigo desafia, o Bruxo cria possibilidades, e o Cientista traz dados.",
        heuristicStep3: "Inicie o Diálogo: Clique na carta para abrir o Dossiê e conversar diretamente com o arquétipo.",
        ascensionTitle: "Ascensão Cognitiva",
        levelsTitle: "Os Níveis do Grimório",
        levelPeregrinoDesc: "Acesso às 8 personas essenciais. O ponto de partida para o mapeamento inicial.",
        levelVassaloDesc: "Expansão para 24 personas consagradas. Ferramentas mais complexas e profundas de decisão.",
        levelRegenteDesc: "Acesso total às 56 personas. Painel avançado com filtragem por categorias e arquétipos.",
        active: "Ativo",
        blocked: "Bloqueado",
        ascendTip: "Para ascender ao próximo nível, altere o seu status no menu de Configurações.",
        levelSoberanoDesc: "Acesso pleno aos 56 personas e aos Lugares da Mente. O nível supremo do Grimório.",
        visualization: "Visualização",
        vizSmall: "Pequena",
        vizMedium: "Média",
        vizLarge: "Grande"
    },
    es: {
        start: "Inicio",
        personas: "Personas",
        places: "Lugares",
        constitution: "Constitución",
        games: "Juegos",
        travessia: "Travesías",
        dominios: "Dominios",
        registros: "Memorias",
        community: "Comunidad",
        mySpace: "Mi Espacio",
        adminPanel: "Panel Admin",
        video: "Vídeo",
        language: "Idioma",
        settings: "Configuración",
        theme: "Temas",
        lightTheme: "Amanecer",
        darkTheme: "Eclipse",
        luanovaTheme: "Luna-nueva",
        crepusculoTheme: "Crepúsculo",
        logout: "Salir del Grimorio",
        enter: "Entrar",
        loginTitle: "Entrar al Grimorio",
        registerTitle: "Manifestar Presencia",
        loginPrompt: "Ingresa tus credenciales para manifestar el portal.",
        registerPrompt: "Regístrate para iniciar tu procesamiento.",
        namePlaceholder: "¿Cómo deseas ser llamado?",
        passwordPlaceholder: "Tu contraseña secreta",
        processing: "PROCESANDO...",
        continue: "CONTINUAR",
        continueWithGoogle: "CONTINUAR CON GOOGLE",
        or: "O",
        haveAccess: "¿Ya tienes acceso? Entrar",
        register: "¿Nuevo por aquí? Regístrate",
        recentMemories: "Memorias Recientes",
        newChat: "Nuevo Chat",
        startJourney: "Inicia un nuevo viaje con",
        messagePlaceholder: "Escribe o dicta tu mensaje...",
        responseError: "No fue posible obtener respuesta ahora. Inténtalo nuevamente.",
        dossierAgent: "Dossier del Agente",
        dossierPlace: "Dossier del Lugar",
        identification: "Identificación",
        protocol: "Protocolo y Guion",
        onboardingTitle: "Primeros pasos en Nemosine",
        close: "Cerrar",
        conversationWith: "Conversación con",
        collapseMenu: "Ocultar menu",
        expandMenu: "Mostrar menu",
        cardOrder: "Orden de cartas",
        levels: "NIVELES",
        orderOriginal: "Orden original",
        orderPopular: "Mas usados",
        orderRandom: "Aleatorio",
        orderCustom: "Personalizado",
        dragCardsHint: "Arrastra la tarjeta; usa el icono para abrir",
        animations: "Animaciones",
        modes: "Modos",
        modeSymbolic: "Simbólico",
        modeSober: "Sobrio",
        modeSystemic: "Sistémico",
        soon: "muy pronto",
        current: "Actual",
        welcomeTitle: "Organiza tu mente por voces.",
        welcomeSubtitle: "Un sistema de personas para pensar mejor, decidir con más claridad y transformar la confusión en dirección.",
        welcomeHelper: "Entra por lo que buscas. El sistema encuentra la voz adecuada.",
        searchPlaceholder: "¿Qué necesitas ahora?",
        explorePersonas: "Conoce las personas",
        initiate: "Iniciar Travesía",
        entryPortal: "El Portal de Entrada",
        peregrinoPath: "El Camino del Peregrino",
        peregrinoDesc: "Como **Peregrino**, acabas de cruzar las murallas externas del Grimorio. Bajo tu control inicial, las 8 voces fundamentales de la mente humana están despiertas. Ellas son tus asesores primarios de reflexión, racionalidad y acción.",
        peregrinoQuote: "“No intentes dominar todas las voces a la vez. Elige una carta arriba, invócala con honestidad y permite que se establezca la claridad.”",
        heuristicsTitle: "Heurística de Invocación",
        heuristicStep1: "Identifica el estado actual: ¿Buscas resolver un conflicto interno, planificar el futuro o estructurar una lógica?",
        heuristicStep2: "Elige a tu Asesor: El Mentor guía, el Enemigo desafía, el Brujo crea posibilidades, y el Científico aporta datos.",
        heuristicStep3: "Inicia el Diálogo: Haz clic en la carta para abrir el Dossier y conversar directamente con el arquetipo.",
        ascensionTitle: "Ascensión Cognitiva",
        levelsTitle: "Los Niveles del Grimorio",
        levelPeregrinoDesc: "Acceso a las 8 personas esenciales. El punto de partida para el mapeo inicial.",
        levelVassaloDesc: "Expansión a 24 personas consagradas. Herramientas de decisión más complejas y profundas.",
        levelRegenteDesc: "Acceso total a las 56 personas. Panel avanzado con filtrado por categorías y arquetipos.",
        active: "Activo",
        blocked: "Bloqueado",
        ascendTip: "Para ascender al siguiente nivel, cambia tu estado en el menú de Configuración.",
        levelSoberanoDesc: "Acceso pleno a las 56 personas y a los Lugares de la Mente. El nivel supremo del Grimorio.",
        visualization: "Visualización",
        vizSmall: "Pequeña",
        vizMedium: "Mediana",
        vizLarge: "Grande"
    },
    en: {
        start: "Home",
        personas: "Personas",
        places: "Places",
        constitution: "Constitution",
        games: "Games",
        travessia: "Crossings",
        dominios: "Domains",
        registros: "Memories",
        community: "Community",
        mySpace: "My Space",
        adminPanel: "Admin Panel",
        video: "Video",
        language: "Language",
        settings: "Settings",
        theme: "Themes",
        lightTheme: "Dawn",
        darkTheme: "Eclipse",
        luanovaTheme: "New Moon",
        crepusculoTheme: "Twilight",
        logout: "Leave the Grimoire",
        enter: "Enter",
        loginTitle: "Enter the Grimoire",
        registerTitle: "Manifest Presence",
        loginPrompt: "Enter your credentials to manifest the portal.",
        registerPrompt: "Register to begin your processing.",
        namePlaceholder: "How would you like to be called?",
        passwordPlaceholder: "Your secret password",
        processing: "PROCESSING...",
        continue: "CONTINUE",
        continueWithGoogle: "CONTINUE WITH GOOGLE",
        or: "OR",
        haveAccess: "Already have access? Sign in",
        register: "New here? Register",
        recentMemories: "Recent Memories",
        newChat: "New Chat",
        startJourney: "Begin a new journey with",
        messagePlaceholder: "Type or dictate your message...",
        responseError: "Unable to obtain a response right now. Please try again.",
        dossierAgent: "Agent Dossier",
        dossierPlace: "Place Dossier",
        identification: "Identification",
        protocol: "Protocol & Script",
        onboardingTitle: "Getting started with Nemosine",
        close: "Close",
        conversationWith: "Conversation with",
        collapseMenu: "Hide menu",
        expandMenu: "Show menu",
        cardOrder: "Card order",
        levels: "LEVELS",
        orderOriginal: "Original order",
        orderPopular: "Most used",
        orderRandom: "Random",
        orderCustom: "Custom",
        dragCardsHint: "Drag the card; use the icon to open",
        animations: "Animations",
        modes: "Modes",
        modeSymbolic: "Symbolic",
        modeSober: "Sober",
        modeSystemic: "Systemic",
        soon: "soon",
        current: "Current",
        welcomeTitle: "Organize your mind by voices.",
        welcomeSubtitle: "A system of personas to think better, decide with more clarity, and transform confusion into direction.",
        welcomeHelper: "Enter what you seek. The system finds the right voice.",
        searchPlaceholder: "What do you need right now?",
        explorePersonas: "Meet the personas",
        initiate: "Begin Journey",
        entryPortal: "The Portal of Entry",
        peregrinoPath: "The Pilgrim's Path",
        peregrinoDesc: "As a **Pilgrim**, you have just crossed the outer walls of the Grimoire. Under your initial command, the 8 fundamental voices of the human mind are awakened. They are your primary advisors for reflection, rationality, and action.",
        peregrinoQuote: "“Do not try to master all voices at once. Choose a card above, invoke it with honesty, and allow clarity to establish itself.”",
        heuristicsTitle: "Invocation Heuristics",
        heuristicStep1: "Identify current state: Do you seek to resolve an internal conflict, plan the future, or structure a logic?",
        heuristicStep2: "Choose your Advisor: The Mentor guides, the Enemy challenges, the Sorcerer creates possibilities, and the Scientist brings data.",
        heuristicStep3: "Initiate Dialogue: Click on the card to open the Dossier and converse directly with the archetype.",
        ascensionTitle: "Cognitive Ascension",
        levelsTitle: "The Levels of the Grimoire",
        levelPeregrinoDesc: "Access to the 8 essential personas. The starting point for initial mapping.",
        levelVassaloDesc: "Expansion to 24 consecrated personas. More complex and profound tools of decision.",
        levelRegenteDesc: "Full access to all 56 personas. Advanced dashboard with category and archetype filters.",
        active: "Active",
        blocked: "Locked",
        ascendTip: "To ascend to the next level, change your status in the Settings menu.",
        levelSoberanoDesc: "Full access to all 56 personas and the Places of the Mind. The supreme level of the Grimoire.",
        visualization: "Visualization",
        vizSmall: "Small",
        vizMedium: "Medium",
        vizLarge: "Large"
    },
    fr: {
        start: "Accueil",
        personas: "Personas",
        places: "Lieux",
        constitution: "Constitution",
        games: "Jeux",
        travessia: "Traversées",
        dominios: "Domaines",
        registros: "Mémoires",
        community: "Communauté",
        mySpace: "Mon Espace",
        adminPanel: "Panneau Admin",
        video: "Vidéo",
        language: "Langue",
        settings: "Paramètres",
        theme: "Thèmes",
        lightTheme: "Aube",
        darkTheme: "Éclipse",
        luanovaTheme: "Nouvelle Lune",
        crepusculoTheme: "Crépuscule",
        logout: "Quitter le Grimoire",
        enter: "Entrer",
        loginTitle: "Entrer dans le Grimoire",
        registerTitle: "Manifester la Présence",
        loginPrompt: "Entrez vos identifiants pour manifester le portail.",
        registerPrompt: "Inscrivez-vous pour commencer votre traitement.",
        namePlaceholder: "Comment voulez-vous être appelé ?",
        passwordPlaceholder: "Votre mot de passe secret",
        processing: "TRAITEMENT...",
        continue: "CONTINUER",
        continueWithGoogle: "CONTINUER AVEC GOOGLE",
        or: "OU",
        haveAccess: "Vous avez déjà un accès ? Se connecter",
        register: "Nouveau ici ? S'inscrire",
        recentMemories: "Souvenirs Récents",
        newChat: "Nouveau Chat",
        startJourney: "Commencez un nouveau voyage avec",
        messagePlaceholder: "Écrivez ou dictez votre message...",
        responseError: "Impossible d'obtenir une réponse pour le moment. Réessayez.",
        dossierAgent: "Dossier de l'Agent",
        dossierPlace: "Dossier du Lieu",
        identification: "Identification",
        protocol: "Protocole & Script",
        onboardingTitle: "Premiers pas dans Nemosine",
        close: "Fermer",
        conversationWith: "Conversation avec",
        collapseMenu: "Réduire le menu",
        expandMenu: "Afficher le menu",
        cardOrder: "Ordre des cartes",
        levels: "NIVEAUX",
        orderOriginal: "Ordre original",
        orderPopular: "Les plus utilisés",
        orderRandom: "Aléatoire",
        orderCustom: "Personnalisé",
        dragCardsHint: "Faites glisser la carte entière ; utilisez l'icône pour l'ouvrir",
        animations: "Animations",
        modes: "Modes",
        modeSymbolic: "Symbolique",
        modeSober: "Sobre",
        modeSystemic: "Systémique",
        soon: "bientôt",
        current: "Actuel",
        welcomeTitle: "Organisez votre esprit par des voix.",
        welcomeSubtitle: "Un système de personas pour mieux penser, décider avec plus de clarement et transformer la confusion en direction.",
        welcomeHelper: "Entrez ce que vous cherchez. Le système trouve la bonne voix.",
        searchPlaceholder: "De quoi avez-vous besoin maintenant ?",
        explorePersonas: "Rencontrez les personas",
        initiate: "Commencer la Traversée",
        entryPortal: "Le Portail d'Entrée",
        peregrinoPath: "Le Chemin du Pèlerin",
        peregrinoDesc: "En tant que **Pèlerin**, vous venez de franchir les remparts extérieurs du Grimoire. Sous votre commandement initial, les 8 voix fondamentales de l'esprit humain sont éveillées. Elles sont vos premiers conseillers de réflexion, de rationalité et d'action.",
        peregrinoQuote: "“N'essayez pas de maîtriser toutes les voix à la fois. Choisissez une carte ci-dessus, invoquez-la avec honnêteté et laissez la clarté s'établir.”",
        heuristicsTitle: "Heuristiques d'Invocation",
        heuristicStep1: "Identifiez l'état actuel : Cherchez-vous à résoudre un conflit interne, à planifier l'avenir ou à structurer une logique ?",
        heuristicStep2: "Choisissez votre Conseiller : Le Mentor guide, l'Ennemi défie, le Sorcier crée des possibilités, et le Scientifique apporte des données.",
        heuristicStep3: "Initiez le Dialogue : Cliquez sur la carte pour ouvrir le Dossier et converser directement avec l'archétype.",
        ascensionTitle: "Ascension Cognitive",
        levelsTitle: "Les Niveaux du Grimoire",
        levelPeregrinoDesc: "Accès aux 8 personas essentielles. Le point de départ pour la cartographie initiale.",
        levelVassaloDesc: "Expansion à 24 personas consacrées. Outils de décision plus complexes et plus profonds.",
        levelRegenteDesc: "Accès complet aux 56 personas. Tableau de bord avancé avec filtres par catégories et archétypes.",
        active: "Actif",
        blocked: "Verrouillé",
        ascendTip: "Pour passer au niveau supérieur, modifiez votre statut dans le menu Paramètres.",
        levelSoberanoDesc: "Accès complet aux 56 personas et aux Lieux de l'Esprit. Le niveau suprême du Grimoire.",
        visualization: "Visualisation",
        vizSmall: "Petite",
        vizMedium: "Moyenne",
        vizLarge: "Grande"
    },
    it: {
        start: "Inizio",
        personas: "Personas",
        places: "Luoghi",
        constitution: "Costituzione",
        games: "Giochi",
        travessia: "Traversate",
        dominios: "Domini",
        registros: "Memorie",
        community: "Comunità",
        mySpace: "Il Mio Spazio",
        adminPanel: "Pannello Creatore",
        video: "Video",
        language: "Lingua",
        settings: "Impostazioni",
        theme: "Temi",
        lightTheme: "Alba",
        darkTheme: "Eclissi",
        luanovaTheme: "Luna Nuova",
        crepusculoTheme: "Crepuscolo",
        logout: "Esci dal Grimorio",
        enter: "Entra",
        loginTitle: "Entra nel Grimorio",
        registerTitle: "Manifesta Presenza",
        loginPrompt: "Inserisci le tue credenziali per manifestare il portale.",
        registerPrompt: "Registrati per iniziare il tuo elaboramento.",
        namePlaceholder: "Come vuoi essere chiamato?",
        passwordPlaceholder: "La tua password segreta",
        processing: "ELABORAZIONE IN CORSO...",
        continue: "CONTINUA",
        continueWithGoogle: "CONTINUA CON GOOGLE",
        or: "OPPURE",
        haveAccess: "Hai già un accesso? Accedi",
        register: "Nuovo qui? Registrati",
        recentMemories: "Memorie Recenti",
        newChat: "Nuova Chat",
        startJourney: "Inizia un nuovo viaggio con",
        messagePlaceholder: "Scrivi o detta il tuo messaggio...",
        responseError: "Impossibile ottenere una risposta in questo momento. Riprova.",
        dossierAgent: "Dossier dell'Agente",
        dossierPlace: "Dossier del Luogo",
        identification: "Identificazione",
        protocol: "Protocollo & Copione",
        onboardingTitle: "Primi passi in Nemosine",
        close: "Chiudi",
        conversationWith: "Conversazione con",
        collapseMenu: "Riduci menu",
        expandMenu: "Mostra menu",
        cardOrder: "Ordine delle carte",
        levels: "LIVELLI",
        orderOriginal: "Ordine originale",
        orderPopular: "Più utilizzati",
        orderRandom: "Casuale",
        orderCustom: "Personalizzato",
        dragCardsHint: "Trascina l'intera carta; usa l'icona per aprire",
        animations: "Animazioni",
        modes: "Modi",
        modeSymbolic: "Simbolico",
        modeSober: "Sobrio",
        modeSystemic: "Sistemico",
        soon: "prossimamente",
        current: "Attuale",
        welcomeTitle: "Organizza la tua mente con le voci.",
        welcomeSubtitle: "Un sistema di personas per pensare meglio, decidere con maggiore chiarezza e trasformare la confusione in direzione.",
        welcomeHelper: "Inserisci ciò che cerchi. Il sistema troverà la voce giusta.",
        searchPlaceholder: "Di cosa hai bisogno adesso?",
        explorePersonas: "Incontra le personas",
        initiate: "Inizia la Traversata",
        entryPortal: "Il Portale d'Ingresso",
        peregrinoPath: "Il Cammino del Pellegrino",
        peregrinoDesc: "Come **Pellegrino**, hai appena varcato le mura esterne del Grimorio. Sotto il tuo comando iniziale, si risvegliano le 8 voci fondamentali della mente umana. Sono i tuoi consiglieri primari di riflessione, razionalità e azione.",
        peregrinoQuote: "“Non cercare di dominare tutte le voci contemporaneamente. Scegli una carta qui sopra, invocala con onestà e lascia che la chiarezza si stabilisca.”",
        heuristicsTitle: "Euristiche di Invocazione",
        heuristicStep1: "Identifica lo stato attuale: Cerchi di risolvere un conflitto interno, pianificare il futuro o strutturare una logica?",
        heuristicStep2: "Scegli il tuo Consigliere: Il Mentore guida, il Nemico sfida, lo Stregone crea possibilità, e lo Scienziato porta i dati.",
        heuristicStep3: "Inizia il Dialogo: Clicca sulla carta per aprire il Dossier e conversare direttamente con l'archetipo.",
        ascensionTitle: "Ascensione Cognitiva",
        levelsTitle: "I Livelli del Grimorio",
        levelPeregrinoDesc: "Accesso alle 8 personas essenziali. Il punto di partenza per la mappatura iniziale.",
        levelVassaloDesc: "Espansione a 24 personas consacrate. Strumenti di decisione più complessi e profondi.",
        levelRegenteDesc: "Accesso totale a tutte le 56 personas. Pannello avanzato con filtri per categorie e archetipi.",
        active: "Attivo",
        blocked: "Bloccato",
        ascendTip: "Per salire di livello, modifica il tuo stato nel menu Impostazioni.",
        levelSoberanoDesc: "Accesso completo a tutte le 56 personas e ai Luoghi della Mente. Il livello supremo del Grimorio.",
        visualization: "Visualizzazione",
        vizSmall: "Piccola",
        vizMedium: "Media",
        vizLarge: "Grande"
    },
    de: {
        start: "Start",
        personas: "Personas",
        places: "Orte",
        constitution: "Verfassung",
        games: "Spiele",
        travessia: "Überquerungen",
        dominios: "Domänen",
        registros: "Erinnerungen",
        community: "Gemeinschaft",
        mySpace: "Mein Bereich",
        adminPanel: "Schöpfer-Panel",
        video: "Video",
        language: "Sprache",
        settings: "Einstellungen",
        theme: "Themen",
        lightTheme: "Morgendämmerung",
        darkTheme: "Finsternis",
        luanovaTheme: "Neumond",
        crepusculoTheme: "Dämmerung",
        logout: "Das Grimonium verlassen",
        enter: "Eintreten",
        loginTitle: "In das Grimonium eintreten",
        registerTitle: "Präsenz manifestieren",
        loginPrompt: "Geben Sie Ihre Zugangsdaten ein, um das Portal zu manifestieren.",
        registerPrompt: "Registrieren Sie sich, um Ihre Verarbeitung zu starten.",
        namePlaceholder: "Wie möchten Sie genannt werden?",
        passwordPlaceholder: "Ihr geheimes Passwort",
        processing: "VERARBEITUNG...",
        continue: "WEITER",
        continueWithGoogle: "MIT GOOGLE WEITER",
        or: "ODER",
        haveAccess: "Bereits Zugang? Einloggen",
        register: "Neu hier? Registrieren",
        recentMemories: "Jüngste Erinnerungen",
        newChat: "Neuer Chat",
        startJourney: "Beginnen Sie eine neue Reise mit",
        messagePlaceholder: "Geben Sie Ihre Nachricht ein oder diktieren Sie sie...",
        responseError: "Zurzeit kann keine Antwort erhalten werden. Bitte versuchen Sie es erneut.",
        dossierAgent: "Agenten-Dossier",
        dossierPlace: "Ort-Dossier",
        identification: "Identifikation",
        protocol: "Protokoll & Skript",
        onboardingTitle: "Erste Schritte in Nemosine",
        close: "Schließen",
        conversationWith: "Gespräch mit",
        collapseMenu: "Menü einklappen",
        expandMenu: "Menü anzeigen",
        cardOrder: "Kartenreihenfolge",
        levels: "STUFEN",
        orderOriginal: "Originalreihenfolge",
        orderPopular: "Beliebteste",
        orderRandom: "Zufällig",
        orderCustom: "Benutzerdefiniert",
        dragCardsHint: "Ziehen Sie die gesamte Karte; verwenden Sie das Symbol zum Öffnen",
        animations: "Animationen",
        modes: "Modi",
        modeSymbolic: "Symbolisch",
        modeSober: "Nüchtern",
        modeSystemic: "Systemisch",
        soon: "demnächst",
        current: "Aktuell",
        welcomeTitle: "Organisieren Sie Ihren Geist durch Stimmen.",
        welcomeSubtitle: "Ein System von Personas, um besser zu denken, klarer zu entscheiden und Verwirrung in Richtung zu verwandeln.",
        welcomeHelper: "Geben Sie ein, was Sie suchen. Das System findet die richtige Stimme.",
        searchPlaceholder: "Was brauchst du jetzt?",
        explorePersonas: "Lernen Sie die Personas kennen",
        initiate: "Überquerung Beginnen",
        entryPortal: "Das Eingangsportal",
        peregrinoPath: "Der Weg des Pilgers",
        peregrinoDesc: "Als **Pilger** haben Sie gerade die Außenmauern des Grimoniums überschritten. Unter Ihrem Anfangsbefehl sind die 8 grundlegenden Stimmen des menschlichen Geistes erwacht. Sie sind Ihre primären Berater für Reflexion, Rationalität und Handeln.",
        peregrinoQuote: "“Versuchen Sie nicht, alle Stimmen auf einmal zu beherrschen. Wählen Sie oben eine Karte aus, rufen Sie sie mit Ehrlichkeit an und lassen Sie Klarheit einkehren.”",
        heuristicsTitle: "Beschwörungsheuristik",
        heuristicStep1: "Identifizieren Sie den aktuellen Zustand: Versuchen Sie, einen inneren Konflikt zu lösen, die Zukunft zu planen oder eine Logik zu strukturieren?",
        heuristicStep2: "Wählen Sie Ihren Berater: Der Mentor führt, der Feind fordert heraus, der Hexer schafft Möglichkeiten und der Wissenschaftler liefert Daten.",
        heuristicStep3: "Beginnen Sie den Dialog: Klicken Sie auf die Karte, um das Dossier zu öffnen und direkt mit dem Archetyp zu sprechen.",
        ascensionTitle: "Kognitiver Aufstieg",
        levelsTitle: "Die Stufen des Grimoniums",
        levelPeregrinoDesc: "Zugang zu den 8 wesentlichen Personas. Der Ausgangspunkt für die erste Kartierung.",
        levelVassaloDesc: "Erweiterung auf 24 geweihte Personas. Komplexere und tiefere Entscheidungswerkzeuge.",
        levelRegenteDesc: "Voller Zugang zu allen 56 Personas. Erweitertes Dashboard mit Kategorie- und Archetypenfiltern.",
        active: "Aktiv",
        blocked: "Gesperrt",
        ascendTip: "Um aufzusteigen, ändern Sie Ihren Status im Menü Einstellungen.",
        levelSoberanoDesc: "Voller Zugang zu allen 56 Personas und den Orten des Geistes. Die höchste Stufe des Grimoniums.",
        visualization: "Schriftgröße",
        vizSmall: "Klein",
        vizMedium: "Mittel",
        vizLarge: "Groß"
    },
    ar: {
        start: "الرئيسية",
        personas: "الشخصيات",
        places: "أماكن",
        constitution: "الدستور",
        games: "الألعاب",
        travessia: "العبour",
        dominios: "النطاقات",
        registros: "الذكريات",
        community: "مجتمع نيموسين",
        mySpace: "مساحتي",
        adminPanel: "لوحة المبدع",
        video: "فيديو",
        language: "اللغة",
        settings: "الإعدادات",
        theme: "المواضيع",
        lightTheme: "فجر",
        darkTheme: "كسوف",
        luanovaTheme: "قمر جديد",
        crepusculoTheme: "شفق",
        logout: "مغادرة الجريموار",
        enter: "دخول",
        loginTitle: "الدخول إلى الجريموار",
        registerTitle: "تجسيد الحضور",
        loginPrompt: "أدخل بيانات الاعتماد الخاصة بك لتجسيد البوابة.",
        registerPrompt: "سجل لبدء معالجتك.",
        namePlaceholder: "كيف تحب أن ناديك؟",
        passwordPlaceholder: "كلمة المرور السرية الخاصة بك",
        processing: "جاري المعالجة...",
        continue: "استمرار",
        continueWithGoogle: "متابعة باستخدام جوجل",
        or: "أو",
        haveAccess: "هل لديك حساب بالفعل؟ تسجيل الدخول",
        register: "جديد هنا؟ تسجيل",
        recentMemories: "الذكريات الأخيرة",
        newChat: "دردشة جديدة",
        startJourney: "ابدأ رحلة جديدة مع",
        messagePlaceholder: "اكتب أو أملِ رسالتك...",
        responseError: "تعذر الحصول على رد الآن. يرجى المحاولة مرة أخرى.",
        dossierAgent: "ملف العميل",
        dossierPlace: "ملف المكان",
        identification: "التعريف",
        protocol: "البروتوكول والسيناريو",
        onboardingTitle: "الخطوات الأولى في نيموسين",
        close: "إغلاق",
        conversationWith: "محادثة مع",
        collapseMenu: "طي القائمة",
        expandMenu: "عرض القائمة",
        cardOrder: "ترتيب البطاقات",
        levels: "المستويات",
        orderOriginal: "الترتيب الأصلي",
        orderPopular: "الأكثر استخداماً",
        orderRandom: "عشوائي",
        orderCustom: "مخصص",
        dragCardsHint: "اسحب البطاقة بأكملها؛ استخدم الأيقونة للفتح",
        animations: "الرسوم المتحركة",
        modes: "الأنماط",
        modeSymbolic: "الرمزي",
        modeSober: "الرصين",
        modeSystemic: "النظامي",
        soon: "قريباً",
        current: "الحالي",
        welcomeTitle: "نظم عقلك من خلال الأصوات.",
        welcomeSubtitle: "نظام شخصيات للتفكير بشكل أفضل، واتخاذ القرارات بوضوح أكبر، وتحويل الحيرة إلى توجيه.",
        welcomeHelper: "أدخل ما تبحث عنه. يجد النظام الصوت المناسب.",
        searchPlaceholder: "ماذا تحتاج الآن؟",
        explorePersonas: "تعرف على الشخصيات",
        initiate: "بدء العبور",
        entryPortal: "بوابة الدخول",
        peregrinoPath: "طريق السالك",
        peregrinoDesc: "بصفتك **سالكاً**، لقد عبرت للتو الأسوار الخارجية للجريموار. تحت قيادتك الأولية، استيقظت الأصوات الثمانية الأساسية للعقل البشري. إنهم مستشاروك الرئيسيون للتأمل والعقلانية والعمل.",
        peregrinoQuote: "“لا تحاول إتقان جميع الأصوات دفعة واحدة. اختر بطاقة أعلاه، واستدعها بصدق واسمح للوضوح بالاستقرار.”",
        heuristicsTitle: "قواعد الاستدعاء",
        heuristicStep1: "حدد الحالة الحالية: هل تسعى لحل صراع داخلي، أو التخطيط للمستقبل، أو بناء منطق؟",
        heuristicStep2: "اختر مستشارك: المرشد يوجه، والخصم يتحدى، والساحر يخلق الاحتمالات، والعالم يقدم البيانات.",
        heuristicStep3: "ابدأ الحوار: انقر على البطاقة لفتح الملف والتحدث مباشرة مع النموذج البدئي.",
        ascensionTitle: "الارتقاء المعرفي",
        levelsTitle: "مستويات الجريموار",
        levelPeregrinoDesc: "الوصول إلى الشخصيات الثمانية الأساسية. نقطة البداية لرسم الخرائط الأولية.",
        levelVassaloDesc: "التوسع إلى 24 شخصية مكرسة. أدوات قرار أكثر تعقيداً وعمقاً.",
        levelRegenteDesc: "الوصول الكامل إلى جميع الشخصيات الـ 56. لوحة تحكم متقدمة مع فلاتر الفئات والأنماط البدئية.",
        active: "نشط",
        blocked: "مغلق",
        ascendTip: "للترقي للمستوى التالي، قم بتغيير حالتك في قائمة الإعدادات.",
        levelSoberanoDesc: "وصول كامل إلى 56 شخصية وأماكن العقل. المستوى الأعلى للجريموار.",
        visualization: "حجم الخط",
        vizSmall: "صغير",
        vizMedium: "متوسط",
        vizLarge: "كبير"
    },
    zh: {
        start: "首页",
        personas: "角色",
        places: "心智之地",
        constitution: "宪章",
        games: "游戏",
        travessia: "渡越",
        dominios: "领地",
        registros: "记忆",
        community: "记忆女神社区",
        mySpace: "我的空间",
        adminPanel: "创造者面板",
        video: "视频",
        language: "语言",
        settings: "设置",
        theme: "主题",
        lightTheme: "黎明",
        darkTheme: "日食",
        luanovaTheme: "新月",
        crepusculoTheme: "黄昏",
        logout: "离开魔导书",
        enter: "进入",
        loginTitle: "进入魔导书",
        registerTitle: "显现存在",
        loginPrompt: "输入您的凭据以显现传送门。",
        registerPrompt: "注册以开始您的处理。",
        namePlaceholder: "您希望如何被称呼？",
        passwordPlaceholder: "您的秘密密码",
        processing: "处理中...",
        continue: "继续",
        continueWithGoogle: "使用谷歌账号继续",
        or: "或",
        haveAccess: "已有访问权限？登录",
        register: "新来的？注册",
        recentMemories: "近期记忆",
        newChat: "新对话",
        startJourney: "与谁开启新旅程",
        messagePlaceholder: "输入或口述您的消息...",
        responseError: "目前无法获取响应。请重试。",
        dossierAgent: "特工档案",
        dossierPlace: "地点档案",
        identification: "身份鉴定",
        protocol: "协议与剧本",
        onboardingTitle: "初识记忆女神",
        close: "关闭",
        conversationWith: "与...对话",
        collapseMenu: "折叠菜单",
        expandMenu: "展开菜单",
        cardOrder: "卡片顺序",
        levels: "级别",
        orderOriginal: "原始顺序",
        orderPopular: "最常用",
        orderRandom: "随机",
        orderCustom: "自定义",
        dragCardsHint: "拖拽整张卡片；点击图标打开",
        animations: "动画",
        modes: "模式",
        modeSymbolic: "象征",
        modeSober: "简约",
        modeSystemic: "系统",
        soon: "即将推出",
        current: "当前",
        welcomeTitle: "用声音组织你的心智。",
        welcomeSubtitle: "一个角色系统，帮助你更好地思考、更清晰地决策，并将混乱转化为方向。",
        welcomeHelper: "输入你所寻求的。系统会找到正确的声音。",
        searchPlaceholder: "你现在需要什么？",
        explorePersonas: "了解所有角色",
        initiate: "开启渡越",
        entryPortal: "入口传送门",
        peregrinoPath: "行者之路",
        peregrinoDesc: "作为**行者**，你刚刚跨越了魔导书的外墙。在你最初的指挥下，人类心智的 8 个基本声音被唤醒了。它们是你在反思、理性和行动方面的主要顾问。",
        peregrinoQuote: "“不要试图一次性掌握所有声音。在上方选择一张卡片，真诚地召唤它，让清晰显现。”",
        heuristicsTitle: "召唤启发式",
        heuristicStep1: "确定当前状态：你是在寻求解决内部冲突、规划未来，还是构建逻辑？",
        heuristicStep2: "选择你的顾问：导师引导，敌人挑战，巫师创造可能性，科学家提供数据。",
        heuristicStep3: "开启对话：点击卡片打开档案，直接与原型对话。",
        ascensionTitle: "认知攀升",
        levelsTitle: "魔导书级别",
        levelPeregrinoDesc: "访问 8 个核心角色。初始映射的起点。",
        levelVassaloDesc: "扩展至 24 个神圣角色。更复杂、更深层的决策工具。",
        levelRegenteDesc: "完全访问所有 56 个角色。具有类别和原型过滤器的高级控制面板。",
        active: "活跃",
        blocked: "已锁定",
        ascendTip: "要提升到下一级别，请在“设置”菜单中更改您的状态。",
        levelSoberanoDesc: "完全访问 56 个角色和心智之境。魔导书的最高级别。",
        visualization: "字体大小",
        vizSmall: "小",
        vizMedium: "中",
        vizLarge: "大"
    },
    ja: {
        start: "スタート",
        personas: "ペルソナ",
        places: "心の場所",
        constitution: "憲章",
        games: "ゲーム",
        travessia: "渡航",
        dominios: "ドメイン",
        registros: "記憶",
        community: "ネモシネ・コミュニティ",
        mySpace: "マイスペース",
        adminPanel: "創作者パネル",
        video: "ビデオ",
        language: "言語",
        settings: "設定",
        theme: "テーマ",
        lightTheme: "夜明け",
        darkTheme: "日食",
        luanovaTheme: "新月",
        crepusculoTheme: "黄昏",
        logout: "魔導書を閉じる",
        enter: "入る",
        loginTitle: "魔導書に入る",
        registerTitle: "存在を顕現する",
        loginPrompt: "ポータルを顕現するための資格情報を入力してください。",
        registerPrompt: "登録して処理を開始します。",
        namePlaceholder: "どのようにお呼びしますか？",
        passwordPlaceholder: "あなたの秘密のパスワード",
        processing: "処理中...",
        continue: "続行",
        continueWithGoogle: "Googleで続行",
        or: "または",
        haveAccess: "既にアクセス権をお持ちですか？ログイン",
        register: "初めてですか？登録する",
        recentMemories: "最近の記憶",
        newChat: "新しいチャット",
        startJourney: "新しい旅を始める：",
        messagePlaceholder: "メッセージを入力または口述してください...",
        responseError: "現在応答を取得できません。もう一度お試しください。",
        dossierAgent: "エージェント調書",
        dossierPlace: "場所調書",
        identification: "身元確認",
        protocol: "プロトコル＆スクリプト",
        onboardingTitle: "ネモシネの第一歩",
        close: "閉じる",
        conversationWith: "チャット相手：",
        collapseMenu: "メニューを折りたたむ",
        expandMenu: "メニューを表示",
        cardOrder: "カードの順序",
        levels: "レベル",
        orderOriginal: "オリジナルの順序",
        orderPopular: "最も使用されている",
        orderRandom: "ランダム",
        orderCustom: "カスタム",
        dragCardsHint: "カード全体をドラッグ；アイコンを使って開く",
        animations: "アニメーション",
        modes: "モード",
        modeSymbolic: "シンボリック",
        modeSober: "ソーバー",
        modeSystemic: "システミック",
        soon: "近日公開",
        current: "現在",
        welcomeTitle: "声で心を整理する。",
        welcomeSubtitle: "より良く考え、より明確に決断し、混乱を方向性に変えるためのペルソナシステム。",
        welcomeHelper: "求めるものを入力してください。システムが正しい声を見つけます。",
        searchPlaceholder: "今何が必要ですか？",
        explorePersonas: "ペルソナに会う",
        initiate: "旅を始める",
        entryPortal: "入り口のポータル",
        peregrinoPath: "巡礼者の道",
        peregrinoDesc: "**巡礼者**として、あなたは魔導書の外壁を越えたばかりです。あなたの初期の指令のもと、人間の心の 8 つの基本的な声が目覚めます。彼らは、内省、合理性、そして行動のためのあなたの主要な顧問です。",
        peregrinoQuote: "“一度にすべての声をマスターしようとしないでください。上のカードを1枚選び、誠実に呼び出し、明晰さが確立されるようにしてください。”",
        heuristicsTitle: "召喚のヒューリスティクス",
        heuristicStep1: "現状の特定：内面の葛藤の解決、未来の計画、それとも論理の構築を求めていますか？",
        heuristicStep2: "顧問の選択：メンターは導き、敵は挑戦し、魔術師は可能性を生み出し、科学者はデータをもたらします。",
        heuristicStep3: "対話の開始：カードをクリックして調書を開き、プロトタイプと直接会話します。",
        ascensionTitle: "認知的上昇",
        levelsTitle: "魔導書のレベル",
        levelPeregrinoDesc: "8つの基本ペルソナへのアクセス。初期マッピングの出発点。",
        levelVassaloDesc: "24の神聖ペルソナへの拡張。より複雑で深い意思決定ツール。",
        levelRegenteDesc: "全56のペルソナへのフルアクセス。カテゴリとアーキタイプフィルターを備えた高度なダッシュボード。",
        active: "アクティブ",
        blocked: "ロック中",
        ascendTip: "レベルアップするには、設定メニューでステータスを変更してください。",
        levelSoberanoDesc: "全 56 のペルソナと心の場所への完全アクセス。魔導書の最高レベル。",
        visualization: "文字サイズ",
        vizSmall: "小",
        vizMedium: "中",
        vizLarge: "大"
    }
} as const;

type TranslationKey = keyof typeof translations["pt-BR"];
type LanguageContextValue = {
    language: AppLanguage;
    setLanguage: (language: AppLanguage) => void;
    theme: AppTheme;
    setTheme: (theme: AppTheme) => void;
    fontSize: AppFontSize;
    setFontSize: (size: AppFontSize) => void;
    cardOrderMode: CardOrderMode;
    setCardOrderMode: (mode: CardOrderMode) => void;
    level: NemosineLevel;
    setLevel: (level: NemosineLevel) => void;
    singularity: "on" | "off";
    setSingularity: (value: "on" | "off") => void;
    cognitiveMode: CognitiveMode;
    setCognitiveMode: (mode: CognitiveMode) => void;
    getOrderedCards: (collection: CardCollection, originalOrder: string[]) => string[];
    setCustomCardOrder: (collection: CardCollection, names: string[]) => void;
    ensureRandomCardOrder: (collection: CardCollection, names: string[]) => void;
    clearRandomCardOrders: () => void;
    recordCardUse: (collection: CardCollection, name: string) => void;
    t: (key: TranslationKey) => string;
    entityName: (name: string) => string;
    isAdmin: boolean;
};
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<AppLanguage>("pt-BR");
    const [theme, setThemeState] = useState<AppTheme>("dark");
    const [fontSize, setFontSizeState] = useState<AppFontSize>("small");
    const [cardOrderMode, setCardOrderModeState] = useState<CardOrderMode>("original");
    const [level, setLevelState] = useState<NemosineLevel>("Peregrino");
    const [singularity, setSingularityState] = useState<"on" | "off">("on");
    const [cognitiveMode, setCognitiveModeState] = useState<CognitiveMode>("symbolic");
    const [customCardOrders, setCustomCardOrders] = useState<CardOrders>(emptyCardOrders);
    const [randomCardOrders, setRandomCardOrders] = useState<CardOrders>(emptyCardOrders);
    const [cardUsage, setCardUsage] = useState<CardUsage>(emptyCardUsage);
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const isAdmin = isAdminEmail(session?.user?.email);
    const userStorageSuffix = useMemo(() => {
        const userKey = session?.user?.id || session?.user?.email || "anonymous";
        return userKey.toLowerCase();
    }, [session?.user?.email, session?.user?.id]);

    // Restrict sober mode to admins only
    useEffect(() => {
        if (!isAdmin && cognitiveMode === "sober") {
            setCognitiveModeState("symbolic");
            document.documentElement.classList.remove("sober-mode");
            window.localStorage.setItem("nemosine-cognitive-mode", "symbolic");
        }
    }, [isAdmin, cognitiveMode]);

    // Clean up transition fade-out class on pathname (route) changes
    useEffect(() => {
        const mainElement = document.querySelector("main");
        if (mainElement) {
            mainElement.classList.remove("singularity-fade-out");
        }
    }, [pathname]);

    // Keep route navigation native while the transition animation is being rebuilt.
    // A broken transition must never block access to the next module.

    useEffect(() => {
        const stored = window.localStorage.getItem("nemosine-language") as AppLanguage | null;
        const validLanguages: AppLanguage[] = ["pt-BR", "pt-PT", "en", "es", "fr", "it", "de", "ar", "zh", "ja"];
        if (stored && validLanguages.includes(stored)) {
            setLanguageState(stored);
            document.documentElement.lang = stored;
        } else {
            document.documentElement.lang = "pt-BR";
        }
    }, []);

    useEffect(() => {
        if (status === "loading") return;

        const themeKey = `nemosine-theme:${userStorageSuffix}`;
        const themeSelectedKey = `nemosine-theme-user-selected:${userStorageSuffix}`;
        const storedTheme = window.localStorage.getItem(themeKey) as AppTheme | null;
        const userSelectedTheme = window.localStorage.getItem(themeSelectedKey) === "true";
        const storedThemeIsValid = storedTheme === "light" || storedTheme === "dark" || storedTheme === "luanova" || storedTheme === "crepusculo";
        const initialTheme: AppTheme = userSelectedTheme && storedThemeIsValid ? storedTheme : "dark";
        if (!userSelectedTheme || !storedThemeIsValid) {
            window.localStorage.setItem(themeKey, initialTheme);
        }
        setThemeState(initialTheme);
        document.documentElement.classList.toggle("dark", initialTheme === "dark");
        document.documentElement.classList.toggle("light-theme", initialTheme === "light");
        document.documentElement.classList.toggle("luanova-theme", initialTheme === "luanova");
        document.documentElement.classList.toggle("crepusculo-theme", initialTheme === "crepusculo");
    }, [status, userStorageSuffix]);

    useEffect(() => {
        const storedMode = window.localStorage.getItem("nemosine-card-order") as CardOrderMode | null;
        if (storedMode === "original" || storedMode === "popular" || storedMode === "random" || storedMode === "custom") {
            setCardOrderModeState(storedMode);
        }
        const storedLevel = window.localStorage.getItem("nemosine-level") as NemosineLevel | null;
        if (storedLevel === "Peregrino" || storedLevel === "Vassalo" || storedLevel === "Regente" || storedLevel === "Soberano") {
            setLevelState(storedLevel);
        }
        const storedSingularity = window.localStorage.getItem("nemosine-singularity") as "on" | "off" | null;
        if (storedSingularity === "on" || storedSingularity === "off") {
            setSingularityState(storedSingularity);
            document.documentElement.classList.toggle("is-singularity", storedSingularity === "on");
        } else {
            setSingularityState("on");
            document.documentElement.classList.toggle("is-singularity", true);
        }
        const storedFontSize = window.localStorage.getItem("nemosine-fontsize") as AppFontSize | null;
        if (storedFontSize === "small" || storedFontSize === "medium" || storedFontSize === "large") {
            setFontSizeState(storedFontSize);
            document.documentElement.setAttribute("data-fontsize", storedFontSize);
        }
        const storedCognitiveMode = window.localStorage.getItem("nemosine-cognitive-mode") as CognitiveMode | null;
        if (storedCognitiveMode === "symbolic" || storedCognitiveMode === "sober") {
            setCognitiveModeState(storedCognitiveMode);
            document.documentElement.classList.toggle("sober-mode", storedCognitiveMode === "sober");
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
        window.localStorage.setItem(`nemosine-theme:${userStorageSuffix}`, nextTheme);
        window.localStorage.setItem(`nemosine-theme-user-selected:${userStorageSuffix}`, "true");
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
        document.documentElement.classList.toggle("light-theme", nextTheme === "light");
        document.documentElement.classList.toggle("luanova-theme", nextTheme === "luanova");
        document.documentElement.classList.toggle("crepusculo-theme", nextTheme === "crepusculo");
    };

    const setCognitiveMode = (nextMode: CognitiveMode) => {
        setCognitiveModeState(nextMode);
        window.localStorage.setItem("nemosine-cognitive-mode", nextMode);
        document.documentElement.classList.toggle("sober-mode", nextMode === "sober");
    };

    const setCardOrderMode = (mode: CardOrderMode) => {
        setCardOrderModeState(mode);
        window.localStorage.setItem("nemosine-card-order", mode);
    };

    const setLevel = (nextLevel: NemosineLevel) => {
        setLevelState(nextLevel);
        window.localStorage.setItem("nemosine-level", nextLevel);
    };

    const setSingularity = (nextSingularity: "on" | "off") => {
        setSingularityState(nextSingularity);
        window.localStorage.setItem("nemosine-singularity", nextSingularity);
        document.documentElement.classList.toggle("is-singularity", nextSingularity === "on");
    };

    const setFontSize = (size: AppFontSize) => {
        setFontSizeState(size);
        window.localStorage.setItem("nemosine-fontsize", size);
        document.documentElement.setAttribute("data-fontsize", size);
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
        fontSize,
        setFontSize,
        cardOrderMode,
        setCardOrderMode,
        level,
        setLevel,
        singularity,
        setSingularity,
        cognitiveMode,
        setCognitiveMode,
        isAdmin,
        getOrderedCards,
        setCustomCardOrder,
        ensureRandomCardOrder,
        clearRandomCardOrders,
        recordCardUse,
        t: (key: TranslationKey) => {
            const val = translations[language]?.[key] || `[${key}]`;
            if (cognitiveMode === "sober") {
                return soberTranslations[language]?.[key] || val;
            }
            return val;
        },
        entityName: (name: string) => {
            if (cognitiveMode === "sober") {
                return soberEntityNames[language]?.[name] || name;
            }
            return name === "Confessor 2.0"
                ? language === "es" ? "Confesor" : "Confessor"
                : language === "pt-BR" ? name : (translatedPersonaNames[language]?.[name] || name);
        }
    }), [language, theme, fontSize, cardOrderMode, level, singularity, cognitiveMode, customCardOrders, randomCardOrders, cardUsage, isAdmin]);

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
                <option value="pt-BR">🇧🇷 Português (BR)</option>
                <option value="pt-PT">🇵🇹 Português (PT)</option>
                <option value="en">🇬🇧 Inglês</option>
                <option value="es">🇪🇸 Espanhol</option>
                <option value="fr">🇫🇷 Francês</option>
                <option value="it">🇮🇹 Italiano</option>
                <option value="de">🇩🇪 Alemão</option>
                <option value="ar">🇸🇦 Árabe</option>
                <option value="zh">🇨🇳 Mandarim</option>
                <option value="ja">🇯🇵 Japonês</option>
            </select>
        </label>
    );
}
