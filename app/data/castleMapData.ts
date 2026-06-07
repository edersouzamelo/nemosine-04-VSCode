import type { NemosineLevel } from "../components/LanguageProvider";

export type CastlePointType = "core" | "personas" | "travessia" | "dominios" | "memorias" | "lugares";
export type CastleVisualStatus = "accessible" | "blocked" | "in_progress" | "completed";

export interface CastleMapPoint {
  id: string;
  name: string;
  type: CastlePointType;
  description: string;
  requiredLevel: NemosineLevel;
  route: string;
  x: number;
  y: number;
  visualStatus?: CastleVisualStatus;
}

export const CASTLE_LEVEL_ORDER: NemosineLevel[] = ["Peregrino", "Vassalo", "Regente", "Soberano"];

export const CASTLE_LEVEL_PERSONA_LIMITS: Record<NemosineLevel, number> = {
  Peregrino: 8,
  Vassalo: 24,
  Regente: 56,
  Soberano: 56,
};

export const castleMapPoints: CastleMapPoint[] = [
  {
    id: "gate-origens",
    name: "Portao das Origens",
    type: "core",
    description: "Entrada narrativa do sistema: onde a travessia mental comeca e o usuario reencontra o proposito do Nemosine.",
    requiredLevel: "Peregrino",
    route: "/inicio",
    x: 50,
    y: 84,
  },
  {
    id: "courtyard-personas",
    name: "Patio das Personas",
    type: "personas",
    description: "A ala das vozes cognitivas. Conforme o nível sobe, mais personas despertam e ampliam o conselho interno.",
    requiredLevel: "Peregrino",
    route: "/agents",
    x: 28,
    y: 55,
  },
  {
    id: "pilgrim-tower",
    name: "Torre do Peregrino",
    type: "personas",
    description: "Primeiro circulo de invocacao: 8 personas principais para orientacao, conflito, estrategia e clareza inicial.",
    requiredLevel: "Peregrino",
    route: "/agents",
    x: 18,
    y: 31,
  },
  {
    id: "vassal-wing",
    name: "Ala do Vassalo",
    type: "personas",
    description: "Expansao para 24 personas, abrindo instrumentos mais densos de decisao, emocao, forma e execucao.",
    requiredLevel: "Vassalo",
    route: "/agents",
    x: 34,
    y: 28,
  },
  {
    id: "regent-hall",
    name: "Sala do Regente",
    type: "personas",
    description: "Acesso pleno as 56 personas, com leitura por categorias e circulacao mais ampla entre funcoes da mente.",
    requiredLevel: "Regente",
    route: "/agents",
    x: 56,
    y: 25,
  },
  {
    id: "sovereign-gate",
    name: "Portoes dos Lugares",
    type: "lugares",
    description: "Cartografia dos Lugares da Mente. Antes do Soberano, permanece como territorio visto pela nevoa.",
    requiredLevel: "Soberano",
    route: "/places",
    x: 77,
    y: 30,
  },
  {
    id: "crossing-bridge",
    name: "Ponte da Travessia",
    type: "travessia",
    description: "Jornada de progressao simbolica, metas, niveis e confrontos que sustentam o amadurecimento do sistema.",
    requiredLevel: "Peregrino",
    route: "/space/travessia",
    x: 47,
    y: 63,
  },
  {
    id: "domain-forge",
    name: "Forja dos Dominios",
    type: "dominios",
    description: "Area operacional dos aplicativos internos: agenda, treino, financas, jogos cognitivos e ferramentas do cotidiano.",
    requiredLevel: "Peregrino",
    route: "/space/dominios",
    x: 72,
    y: 58,
  },
  {
    id: "memory-archive",
    name: "Arquivo das Memorias",
    type: "memorias",
    description: "Centro de registros, rastros e rascunhos. Guarda ideias, tarefas, lembrancas e materiais em construcao.",
    requiredLevel: "Peregrino",
    route: "/space/registros",
    x: 39,
    y: 75,
  },
];
