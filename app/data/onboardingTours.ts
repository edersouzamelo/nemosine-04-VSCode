import type { TourStep } from "../components/OnboardingTour";

export const personasTourSteps: TourStep[] = [
    {
        target: "personas-header",
        title: "Personas",
        text: "Aqui vivem as vozes cognitivas do Nemosine. Cada carta representa uma forma diferente de pensar, decidir e agir.",
    },
    {
        target: "personas-view-toggle",
        title: "Modo de visualizacao",
        text: "Alterne entre grade e carrossel para escolher a forma mais confortavel de explorar as cartas.",
    },
    {
        target: "personas-categories",
        title: "Categorias",
        text: "Use as categorias para filtrar personas por vocacao: estrategia, simbolo, operacao, emocao ou favoritas.",
    },
    {
        target: "personas-first-card",
        title: "Carta de persona",
        text: "Toque em uma carta para abrir o chat com aquele agente. Passe o cursor para ver uma pista rapida de vocacao.",
    },
];

export const lugaresTourSteps: TourStep[] = [
    {
        target: "lugares-header",
        title: "Lugares",
        text: "Lugares sao ambientes de processamento. Eles organizam o tipo de pensamento que voce quer acessar.",
    },
    {
        target: "lugares-view-toggle",
        title: "Grade ou carrossel",
        text: "Alterne a visualizacao para navegar pelas cartas em modo panoramico ou em colecao completa.",
    },
    {
        target: "places-first-card",
        title: "Carta de lugar",
        text: "Cada lugar abre um dossie e uma experiencia propria. O balao resume a vocacao daquele ambiente.",
    },
];

export const dominiosTourSteps: TourStep[] = [
    {
        target: "dominios-header",
        title: "Dominios",
        text: "Dominios reune aplicativos praticos do Nemosine: agenda, financas, saude, estudos, jogos e outras ferramentas.",
    },
    {
        target: "dominios-fullscreen",
        title: "Tela expandida",
        text: "Use este botao para entrar na experiencia Sovereign em tela cheia e ganhar mais espaco de trabalho.",
    },
    {
        target: "dominios-device",
        title: "Dispositivo simulado",
        text: "O Sovereign adapta a moldura ao dispositivo. Dentro dela ficam os aplicativos que voce pode abrir e reorganizar.",
    },
    {
        target: "dominios-first-app",
        title: "Aplicativo",
        text: "Toque em um app para abrir. Segure ou arraste para reorganizar e acessar opcoes quando disponiveis.",
    },
];

export const memoriasTourSteps: TourStep[] = [
    {
        target: "memorias-header",
        title: "Memorias",
        text: "Memorias e o espaco de continuidade: aqui ficam registros, rastros narrativos e rascunhos soltos.",
    },
    {
        target: "memorias-tabs",
        title: "Submodulos",
        text: "Alterne entre Registros, Rastros e Rascunhos conforme o tipo de memoria que quer consultar ou criar.",
    },
    {
        target: "registros-toolbar",
        title: "Filtros e ferramentas",
        text: "Pesquise, filtre por status e prazo, ajuste zoom da tabela, exporte dados e crie novas colunas.",
    },
    {
        target: "registros-table",
        title: "Tabela viva",
        text: "A coluna Ideia e o centro do modulo. Escreva livremente e o sistema ajuda a organizar persona, status e prazo.",
    },
];

export const casteloTourSteps: TourStep[] = [
    {
        target: "castelo-header",
        title: "Castelo",
        text: "O Castelo e o mapa simbolico do Nemosine. Ele mostra a arquitetura habitavel do sistema.",
    },
    {
        target: "castelo-map",
        title: "Mapa",
        text: "Cada ponto representa uma area do sistema. Estados visuais indicam acesso, bloqueio, progresso ou conclusao.",
    },
    {
        target: "castelo-level",
        title: "Nível atual",
        text: "O nível define o que esta disponivel agora. Lugares da Mente so abrem no nível Soberano.",
    },
    {
        target: "castelo-details",
        title: "Detalhes",
        text: "Ao selecionar um ponto, este painel explica a area, o nível exigido e oferece a entrada quando disponivel.",
    },
];

export const travessiaDevTourSteps: TourStep[] = [
    {
        target: "travessia-dev-header",
        title: "Travessia Devonly",
        text: "Esta tela mostra a gamificacao auditavel ainda em desenvolvimento, visivel apenas em modo devonly.",
    },
    {
        target: "travessia-dev-progress",
        title: "Progresso percebido",
        text: "O progresso vem de rastros reais interpretados pelo Vigia. Aqui voce ve o resumo consolidado.",
    },
    {
        target: "travessia-dev-boss",
        title: "Boss atual",
        text: "O boss recebe evidencias vinculadas e enfraquece conforme a jornada registra acoes reais.",
    },
    {
        target: "travessia-dev-vigia",
        title: "Vigia",
        text: "O Vigia classifica rastros em categorias de evidencia sem depender de IA externa nesta primeira versao.",
    },
    {
        target: "travessia-dev-metas",
        title: "Metas vinculadas",
        text: "As metas mostram como evidencias reais alimentam o progresso da Travessia.",
    },
];
